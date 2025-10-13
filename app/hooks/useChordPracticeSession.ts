/**
 * useChordPracticeSession Hook
 *
 * Manages chord practice session state, MIDI detection, and persistence.
 * Extracted from chord page to keep UI clean.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { detectChord, chordsMatchMidi, getChordNotes, SessionConfig, generateSessionChords } from '@/app/utils/chord';
import { SessionResult, calculateSessionMetrics, calculateCurrentStats, prepareMetricsForSave } from '@/app/services/chordSessionMetrics';

interface UseChordPracticeSessionProps {
  pressedKeys: Set<number>;
  isSessionActive: boolean;
}

export const useChordPracticeSession = (sessionConfig: SessionConfig, sessionDuration: number) => {
  // Session state
  const [sessionChords, setSessionChords] = useState<string[]>([]);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(0);
  const [totalChordsAnswered, setTotalChordsAnswered] = useState(0);

  // Stats
  const [pbEffectiveChords, setPbEffectiveChords] = useState<number>(0);
  const [historicalSessions, setHistoricalSessions] = useState<any[]>([]);

  // Current chord state
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isWaitingForNext, setIsWaitingForNext] = useState(false);
  const [showChordNotes, setShowChordNotes] = useState(false);
  const [currentAttempts, setCurrentAttempts] = useState(0);
  const [lastAttemptKeys, setLastAttemptKeys] = useState<Set<number>>(new Set());

  const targetChord = sessionChords[currentChordIndex] || '';

  /**
   * Start a new practice session
   */
  const startSession = useCallback(async () => {
    const chords = generateSessionChords(sessionConfig);
    setSessionChords(chords);
    setCurrentChordIndex(0);
    setSessionResults([]);
    setTotalChordsAnswered(0);
    setIsSessionActive(true);
    setIsSessionComplete(false);
    setSessionStartTime(Date.now());
    setSessionTimeRemaining(sessionDuration * 60 * 1000);
    setStartTime(Date.now());
    setIsWaitingForNext(false);
    setShowChordNotes(false);
    setCurrentAttempts(0);
    setLastAttemptKeys(new Set());

    // Fetch historical sessions for PB tracking
    const { fetchMatchingSessions } = await import('@/app/services/chordSessionStatsService');
    const sessions = await fetchMatchingSessions({
      durationMinutes: sessionDuration,
      mode: sessionConfig.mode,
      chordTypes: sessionConfig.chordTypes,
      scales: sessionConfig.scales,
      includeInversions: sessionConfig.includeInversions ?? true,
    });

    setHistoricalSessions(sessions);

    if (sessions.length > 0) {
      const effectiveChordsValues = sessions.map(s => s.effective_chords);
      const pb = Math.max(...effectiveChordsValues);
      setPbEffectiveChords(pb);
    }
  }, [sessionConfig, sessionDuration]);

  /**
   * Stop the session and return to config
   */
  const stopSession = useCallback(() => {
    setIsSessionActive(false);
    setIsSessionComplete(false);
    setSessionResults([]);
  }, []);

  /**
   * Reset to config screen
   */
  const resetSession = useCallback(() => {
    setIsSessionComplete(false);
    setSessionResults([]);
    setIsSessionActive(false);
  }, []);

  /**
   * Save session when complete
   */
  useEffect(() => {
    if (isSessionComplete && sessionResults.length > 0) {
      const metrics = prepareMetricsForSave(sessionResults, totalChordsAnswered);

      import('@/app/services/sessionSyncService').then(({ saveChordSession }) => {
        saveChordSession(
          {
            duration: sessionDuration,
            mode: sessionConfig.mode,
            chordTypes: sessionConfig.chordTypes,
            scales: sessionConfig.scales,
            includeInversions: sessionConfig.includeInversions ?? true,
          },
          metrics,
          sessionResults
        );
      });
    }
  }, [isSessionComplete, sessionResults, totalChordsAnswered, sessionDuration, sessionConfig]);

  /**
   * Session countdown timer
   */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStartTime && isSessionActive) {
      interval = setInterval(() => {
        const elapsed = Date.now() - sessionStartTime;
        const remaining = (sessionDuration * 60 * 1000) - elapsed;

        if (remaining <= 0) {
          setSessionTimeRemaining(0);
          setIsSessionActive(false);
          setIsSessionComplete(true);
        } else {
          setSessionTimeRemaining(remaining);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [sessionStartTime, isSessionActive, sessionDuration]);

  /**
   * Calculate session metrics
   */
  const sessionMetrics = useMemo(
    () => calculateSessionMetrics(sessionResults, totalChordsAnswered),
    [sessionResults, totalChordsAnswered]
  );

  /**
   * Calculate current session stats
   */
  const currentSessionStats = useMemo(
    () => isSessionActive
      ? calculateCurrentStats(sessionResults, totalChordsAnswered, sessionStartTime, sessionDuration)
      : null,
    [isSessionActive, sessionResults, totalChordsAnswered, sessionStartTime, sessionDuration]
  );

  return {
    // Session state
    isSessionActive,
    isSessionComplete,
    targetChord,
    sessionTimeRemaining,
    showChordNotes,
    setShowChordNotes,

    // Session control
    startSession,
    stopSession,
    resetSession,

    // Metrics
    sessionMetrics,
    currentSessionStats,
    pbEffectiveChords,
    historicalSessions,

    // Internal state for detection logic (exposed for MIDI integration)
    sessionResults,
    setSessionResults,
    totalChordsAnswered,
    setTotalChordsAnswered,
    currentAttempts,
    setCurrentAttempts,
    lastAttemptKeys,
    setLastAttemptKeys,
    startTime,
    setStartTime,
    isWaitingForNext,
    setIsWaitingForNext,
    sessionChords,
    setSessionChords,
    currentChordIndex,
    setCurrentChordIndex,
    sessionConfig,
  };
};

/**
 * useMidiChordDetection Hook
 *
 * Handles MIDI input detection and matching logic.
 * Separate hook to keep detection logic focused.
 */
export const useMidiChordDetection = (
  pressedKeys: Set<number>,
  targetChord: string,
  isSessionActive: boolean,
  startTime: number | null,
  isWaitingForNext: boolean,
  currentAttempts: number,
  lastAttemptKeys: Set<number>,
  sessionConfig: SessionConfig,
  callbacks: {
    onAttempt: () => void;
    onCorrect: (result: SessionResult) => void;
    onAdvance: () => void;
  }
) => {
  const currentChord = useMemo(() => {
    if (pressedKeys.size === 0) return '';
    return detectChord(Array.from(pressedKeys));
  }, [pressedKeys]);

  const isCorrect = useMemo(() => {
    if (!targetChord || pressedKeys.size === 0) return false;
    return chordsMatchMidi(Array.from(pressedKeys), targetChord);
  }, [pressedKeys, targetChord]);

  const targetChordNotes = targetChord ? getChordNotes(targetChord) : [];
  const hasValidAttempt = useMemo(() => {
    return pressedKeys.size >= 3 && pressedKeys.size === targetChordNotes.length;
  }, [pressedKeys.size, targetChordNotes.length]);

  // Track attempts and advance on correct
  useEffect(() => {
    if (hasValidAttempt && startTime && isSessionActive && !isWaitingForNext) {
      const currentKeysStr = Array.from(pressedKeys).sort().join(',');
      const lastKeysStr = Array.from(lastAttemptKeys).sort().join(',');

      if (currentKeysStr !== lastKeysStr && pressedKeys.size >= 3) {
        callbacks.onAttempt();

        if (isCorrect) {
          const totalTime = Date.now() - startTime;
          const result: SessionResult = {
            chord: targetChord,
            attempts: currentAttempts + 1,
            correctTime: totalTime,
            totalTime: totalTime
          };
          callbacks.onCorrect(result);

          setTimeout(() => {
            callbacks.onAdvance();
          }, 800);
        }
      }
    }
  }, [
    hasValidAttempt,
    isCorrect,
    startTime,
    isSessionActive,
    targetChord,
    currentAttempts,
    isWaitingForNext,
    pressedKeys,
    lastAttemptKeys,
    sessionConfig,
    callbacks
  ]);

  return {
    currentChord,
    isCorrect,
    targetChordNotes,
  };
};
