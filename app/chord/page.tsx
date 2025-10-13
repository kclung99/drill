'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMidi } from '../hooks/useMidi';
import { SessionConfig, generateSessionChords } from '@/app/utils/chord';
import { NavBar } from '@/components/nav-bar';
import { UserSettings } from '@/app/services/settingsService';
import ChordSessionConfig from '@/app/components/ChordSessionConfig';
import ChordSessionActive from '@/app/components/ChordSessionActive';
import ChordSessionResults from '@/app/components/ChordSessionResults';
import { useChordPracticeSession, useMidiChordDetection } from '@/app/hooks/useChordPracticeSession';
import { calculateEffectiveChords } from '@/app/services/chordSessionMetrics';

export default function ChordPage() {
  const { pressedKeys, isSupported, activeMode } = useMidi();

  // User settings
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    import('@/app/services/settingsService').then(({ fetchSettings }) => {
      fetchSettings().then(setUserSettings);
    });
  }, []);

  // Session config
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    chordCount: 3,
    mode: 'chordTypes',
    chordTypes: ['maj', 'min'],
    scales: ['C'],
    includeInversions: true
  });
  const [sessionDuration, setSessionDuration] = useState<number>(3);

  // Session hook manages all state and persistence
  const session = useChordPracticeSession(sessionConfig, sessionDuration);

  // MIDI detection callbacks
  const handleAttempt = useCallback(() => {
    session.setLastAttemptKeys(new Set(pressedKeys));
    session.setCurrentAttempts(prev => prev + 1);
  }, [pressedKeys, session]);

  const handleCorrect = useCallback((result: any) => {
    session.setIsWaitingForNext(true);
    session.setSessionResults(prev => [...prev, result]);
  }, [session]);

  const handleAdvance = useCallback(() => {
    session.setTotalChordsAnswered(prev => prev + 1);
    const newChords = generateSessionChords({ ...session.sessionConfig, chordCount: 1 });
    session.setSessionChords(prev => [...prev, ...newChords]);
    session.setCurrentChordIndex(prev => prev + 1);
    session.setStartTime(Date.now());
    session.setIsWaitingForNext(false);
    session.setShowChordNotes(false);
    session.setCurrentAttempts(0);
    session.setLastAttemptKeys(new Set());
  }, [session]);

  // MIDI chord detection hook
  const { currentChord, isCorrect, targetChordNotes } = useMidiChordDetection(
    pressedKeys,
    session.targetChord,
    session.isSessionActive,
    session.startTime,
    session.isWaitingForNext,
    session.currentAttempts,
    session.lastAttemptKeys,
    sessionConfig,
    {
      onAttempt: handleAttempt,
      onCorrect: handleCorrect,
      onAdvance: handleAdvance,
    }
  );

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavBar currentPage="chord" showMidiStatus={true} midiActive={activeMode === 'midi'} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">MIDI Not Supported</h1>
            <p className="text-gray-600">Your browser doesn't support Web MIDI API.</p>
          </div>
        </div>
      </div>
    );
  }

  // Session Configuration
  if (!session.isSessionActive && !session.isSessionComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavBar currentPage="chord" showMidiStatus={true} midiActive={activeMode === 'midi'} />
        <ChordSessionConfig
          sessionConfig={sessionConfig}
          sessionDuration={sessionDuration}
          userSettings={userSettings}
          onConfigChange={setSessionConfig}
          onDurationChange={setSessionDuration}
          onStart={session.startSession}
        />
      </div>
    );
  }

  // Session Results
  if (session.isSessionComplete && session.sessionMetrics) {
    const finalEffectiveChords = calculateEffectiveChords(
      session.sessionMetrics.correctChords,
      session.sessionMetrics.chordAccuracy
    );
    const isNewPB = finalEffectiveChords > session.pbEffectiveChords && session.pbEffectiveChords > 0;

    const betterThanCount = session.historicalSessions.filter(
      s => finalEffectiveChords >= s.effective_chords
    ).length;
    const finalPercentile = session.historicalSessions.length > 0
      ? Math.round((betterThanCount / session.historicalSessions.length) * 100)
      : 100;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavBar currentPage="chord" showMidiStatus={true} midiActive={activeMode === 'midi'} />
        <ChordSessionResults
          finalEffectiveChords={finalEffectiveChords}
          isNewPB={isNewPB}
          pbEffectiveChords={session.pbEffectiveChords}
          finalPercentile={finalPercentile}
          betterThanCount={betterThanCount}
          totalHistoricalSessions={session.historicalSessions.length}
          sessionMetrics={session.sessionMetrics}
          onAgain={() => {
            session.resetSession();
            session.startSession();
          }}
          onBack={session.resetSession}
        />
      </div>
    );
  }

  // Active Session
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar currentPage="chord" showMidiStatus={true} midiActive={activeMode === 'midi'} />
      <ChordSessionActive
        targetChord={session.targetChord}
        currentChord={currentChord}
        isCorrect={isCorrect}
        pressedKeys={pressedKeys}
        targetChordNotes={targetChordNotes}
        showChordNotes={session.showChordNotes}
        onShowChordNotes={() => session.setShowChordNotes(true)}
        sessionTimeRemaining={session.sessionTimeRemaining}
        currentSessionStats={session.currentSessionStats}
        pbEffectiveChords={session.pbEffectiveChords}
        onStop={session.stopSession}
      />
    </div>
  );
}
