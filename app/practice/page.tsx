'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMidi } from '../hooks/useMidi';
import Piano from '../components/Piano';
import { detectChord, chordsMatchMidi, getChordNotes, getChordMidiNotes, SessionConfig, CHORD_TYPES, SCALES, generateSessionChords } from '../utils/chordDetection';
import { incrementSession } from '../utils/habitTracker';
import { NavBar } from '@/components/nav-bar';
import { UserSettings } from '@/app/services/settingsService';

interface SessionResult {
  chord: string;
  attempts: number;
  correctTime: number;
  totalTime: number;
}

export default function PracticeMode() {
  const { pressedKeys, isSupported, activeMode } = useMidi();

  // User settings for validation thresholds
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  // Load user settings on mount
  useEffect(() => {
    import('@/app/services/settingsService').then(({ fetchSettings }) => {
      fetchSettings().then(setUserSettings);
    });
  }, []);

  // Session configuration
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    chordCount: 3,
    mode: 'chordTypes',
    chordTypes: ['maj', 'min'],
    scales: ['C'],
    includeInversions: true
  });
  const [sessionDuration, setSessionDuration] = useState<number>(3); // minutes

  // Session state
  const [sessionChords, setSessionChords] = useState<string[]>([]);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(0);
  const [totalChordsAnswered, setTotalChordsAnswered] = useState(0);

  // Session stats (PB and percentile)
  const [pbEffectiveChords, setPbEffectiveChords] = useState<number>(0);
  const [historicalSessions, setHistoricalSessions] = useState<any[]>([]);

  // Current chord state
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isWaitingForNext, setIsWaitingForNext] = useState(false);
  const [showChordNotes, setShowChordNotes] = useState(false);
  const [currentAttempts, setCurrentAttempts] = useState(0);

  const targetChord = sessionChords[currentChordIndex] || '';

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
    // Only count as an attempt when user plays the expected number of notes
    return pressedKeys.size >= 3 && pressedKeys.size === targetChordNotes.length;
  }, [pressedKeys.size, targetChordNotes.length]);

  // Track when user makes an attempt
  const [lastAttemptKeys, setLastAttemptKeys] = useState<Set<number>>(new Set());
  const [hasAdvanced, setHasAdvanced] = useState(false);

  const startSession = async () => {
    const chords = generateSessionChords(sessionConfig);
    setSessionChords(chords);
    setCurrentChordIndex(0);
    setSessionResults([]);
    setTotalChordsAnswered(0);
    setIsSessionActive(true);
    setIsSessionComplete(false);
    setSessionStartTime(Date.now());
    setSessionTimeRemaining(sessionDuration * 60 * 1000); // convert minutes to ms
    startCurrentChord();

    // Fetch historical sessions for PB and percentile tracking
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
  };

  const startCurrentChord = () => {
    setStartTime(Date.now());
    setCurrentTime(0);
    setIsWaitingForNext(false);
    setShowChordNotes(false);
    setCurrentAttempts(0);
    setLastAttemptKeys(new Set());
    setHasAdvanced(false);
  };


  // Handle session completion (heatmap increment)
  useEffect(() => {
    if (isSessionComplete) {
      // Check if session meets minimum duration threshold before counting it
      import('@/app/services/settingsService').then(({ fetchSettings }) => {
        fetchSettings().then((settings) => {
          if (sessionDuration >= settings.minMusicDurationMinutes) {
            // Only increment heatmap if session is valid
            incrementSession('music');
          }
        });
      });
    }
  }, [isSessionComplete, sessionDuration]);

  // Save session data when session completes
  useEffect(() => {
    if (isSessionComplete && sessionResults.length > 0) {
      // Calculate metrics
      const totalAttempts = sessionResults.reduce((sum, r) => sum + r.attempts, 0);
      const avgCorrectTime = totalChordsAnswered > 0
        ? sessionResults.filter(r => r.correctTime > 0).reduce((sum, r) => sum + r.correctTime, 0) / totalChordsAnswered
        : 0;
      const correctTimes = sessionResults.filter(r => r.correctTime > 0).map(r => r.correctTime);

      const accuracy = totalChordsAnswered > 0 ? (totalChordsAnswered / totalAttempts) * 100 : 0;
      const effectiveChords = parseFloat((totalChordsAnswered * (accuracy / 100)).toFixed(2));

      const metrics = {
        totalChords: totalChordsAnswered,
        totalAttempts,
        accuracy,
        avgTimePerChord: avgCorrectTime / 1000, // convert to seconds
        fastestTime: correctTimes.length > 0 ? Math.min(...correctTimes) / 1000 : 0,
        slowestTime: correctTimes.length > 0 ? Math.max(...correctTimes) / 1000 : 0,
        effectiveChords,
      };

      // Save to localStorage and queue for Supabase sync
      import('@/app/services/localStorageService').then(({ saveChordSession }) => {
        const session = saveChordSession({
          config: {
            duration: sessionDuration,
            mode: sessionConfig.mode,
            chordTypes: sessionConfig.chordTypes,
            scales: sessionConfig.scales,
            includeInversions: sessionConfig.includeInversions ?? true,
          },
          metrics,
          chordResults: sessionResults,
        });

        // Queue for Supabase sync
        import('@/app/services/supabaseSyncService').then(({ queueChordSession }) => {
          queueChordSession(session);
        });
      });
    }
  }, [isSessionComplete, sessionResults, totalChordsAnswered, sessionDuration, sessionConfig]);



  // Session countdown timer
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

  // Real-time stopwatch effect for current chord
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime && !isWaitingForNext && isSessionActive) {
      interval = setInterval(() => {
        setCurrentTime(Date.now() - startTime);
      }, 10); // Update every 10ms for smooth timer
    }
    return () => clearInterval(interval);
  }, [startTime, isWaitingForNext, isSessionActive]);

  // Track attempts when user plays enough keys
  useEffect(() => {
    if (hasValidAttempt && startTime && isSessionActive && !isWaitingForNext) {
      // Check if this is a new attempt (different key combination)
      const currentKeysStr = Array.from(pressedKeys).sort().join(',');
      const lastKeysStr = Array.from(lastAttemptKeys).sort().join(',');

      if (currentKeysStr !== lastKeysStr && pressedKeys.size >= 3) {
        setLastAttemptKeys(new Set(pressedKeys));
        setCurrentAttempts(prev => prev + 1);

        if (isCorrect) {
          setIsWaitingForNext(true);

          const totalTime = Date.now() - startTime;
          const result: SessionResult = {
            chord: targetChord,
            attempts: currentAttempts + 1,
            correctTime: totalTime,
            totalTime: totalTime
          };
          setSessionResults(prev => [...prev, result]);

          // Auto-advance to next chord
          setTimeout(() => {
            setTotalChordsAnswered(prev => prev + 1);
            const newChords = generateSessionChords({ ...sessionConfig, chordCount: 1 });
            setSessionChords(prev => [...prev, ...newChords]);
            setCurrentChordIndex(prev => prev + 1);
            setStartTime(Date.now());
            setIsWaitingForNext(false);
            setShowChordNotes(false);
            setCurrentAttempts(0);
            setLastAttemptKeys(new Set());
            setHasAdvanced(false);
          }, 800);
        }
      }
    }
  }, [hasValidAttempt, isCorrect, startTime, isSessionActive, targetChord, currentAttempts, isWaitingForNext, pressedKeys, lastAttemptKeys, sessionConfig, hasAdvanced]);

  // Calculate session metrics
  const sessionMetrics = useMemo(() => {
    if (sessionResults.length === 0) return null;

    const totalAttempts = sessionResults.reduce((sum, r) => sum + r.attempts, 0);
    const correctChords = totalChordsAnswered;
    const avgCorrectTime = correctChords > 0
      ? sessionResults.filter(r => r.correctTime > 0).reduce((sum, r) => sum + r.correctTime, 0) / correctChords
      : 0;
    const correctTimes = sessionResults.filter(r => r.correctTime > 0).map(r => r.correctTime);

    return {
      totalAttempts,
      correctChords,
      chordAccuracy: correctChords > 0 ? (correctChords / totalAttempts) * 100 : 0,
      avgTimePerChord: avgCorrectTime / 1000,
      fastestTime: correctTimes.length > 0 ? Math.min(...correctTimes) / 1000 : 0,
      slowestTime: correctTimes.length > 0 ? Math.max(...correctTimes) / 1000 : 0
    };
  }, [sessionResults, totalChordsAnswered]);

  // Calculate current effective chords and stats during session
  const currentSessionStats = useMemo(() => {
    if (!isSessionActive || sessionResults.length === 0) return null;

    const totalAttempts = sessionResults.reduce((sum, r) => sum + r.attempts, 0);
    const accuracy = totalChordsAnswered > 0 ? (totalChordsAnswered / totalAttempts) * 100 : 0;
    const currentEffectiveChords = parseFloat((totalChordsAnswered * (accuracy / 100)).toFixed(2));

    // Calculate percentile
    const betterThanCount = historicalSessions.filter(
      s => currentEffectiveChords > s.effective_chords
    ).length;
    const percentile = historicalSessions.length > 0
      ? Math.round((betterThanCount / historicalSessions.length) * 100)
      : 100;

    // Calculate projected final score
    const elapsedMs = sessionStartTime ? Date.now() - sessionStartTime : 0;
    const elapsedMinutes = elapsedMs / 60000;
    const projectedFinal = elapsedMinutes > 0
      ? parseFloat((currentEffectiveChords / elapsedMinutes * sessionDuration).toFixed(2))
      : 0;

    return {
      currentEffectiveChords,
      percentile,
      betterThanCount,
      totalHistoricalSessions: historicalSessions.length,
      projectedFinal,
    };
  }, [isSessionActive, sessionResults, totalChordsAnswered, historicalSessions, sessionStartTime, sessionDuration]);

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

  // Session Configuration UI
  if (!isSessionActive && !isSessionComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavBar currentPage="chord" showMidiStatus={true} midiActive={activeMode === 'midi'} />

        <div className="flex-1 p-8 flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full space-y-8">

            <div className="flex flex-col items-center gap-2">
              <div className="text-sm text-gray-500">duration</div>
              <div className="flex justify-center gap-2">
                {[0.17, 1, 3, 5, 10, 20].map(duration => {
                  const isValid = userSettings ? duration >= userSettings.minMusicDurationMinutes : true;
                  return (
                    <button
                      key={duration}
                      onClick={() => setSessionDuration(duration)}
                      className={`px-4 py-2 text-sm border border-gray-400 ${
                        sessionDuration === duration
                          ? isValid
                            ? 'bg-black text-white'
                            : 'bg-gray-300 text-gray-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title={!isValid ? "Won't count toward heatmap" : undefined}
                    >
                      {duration === 0.17 ? '10s' : `${duration}min`}
                  </button>
                )})}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="text-sm text-gray-500">mode</div>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setSessionConfig(prev => ({ ...prev, mode: 'chordTypes' }))}
                  className={`px-4 py-2 text-sm border border-gray-400 ${
                    sessionConfig.mode === 'chordTypes'
                      ? 'bg-black text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  types
                </button>
                <button
                  onClick={() => setSessionConfig(prev => ({ ...prev, mode: 'scales' }))}
                  className={`px-4 py-2 text-sm border border-gray-400 ${
                    sessionConfig.mode === 'scales'
                      ? 'bg-black text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  scales
                </button>
              </div>
            </div>

            {sessionConfig.mode === 'chordTypes' && (
              <div className="flex flex-wrap justify-center gap-2">
                {CHORD_TYPES.map(chordType => (
                  <button
                    key={chordType.id}
                    onClick={() => {
                      setSessionConfig(prev => ({
                        ...prev,
                        chordTypes: prev.chordTypes.includes(chordType.id)
                          ? prev.chordTypes.filter(t => t !== chordType.id)
                          : [...prev.chordTypes, chordType.id]
                      }));
                    }}
                    className={`px-3 py-2 text-sm border border-gray-400 ${
                      sessionConfig.chordTypes.includes(chordType.id)
                        ? 'bg-black text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {chordType.name}
                  </button>
                ))}
              </div>
            )}

            {sessionConfig.mode === 'scales' && (
              <div className="flex flex-wrap justify-center gap-2">
                {SCALES.map(scale => (
                  <button
                    key={scale.id}
                    onClick={() => {
                      setSessionConfig(prev => ({
                        ...prev,
                        scales: prev.scales.includes(scale.id)
                          ? prev.scales.filter(s => s !== scale.id)
                          : [...prev.scales, scale.id]
                      }));
                    }}
                    className={`px-3 py-2 text-sm border border-gray-400 ${
                      sessionConfig.scales.includes(scale.id)
                        ? 'bg-black text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {scale.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col items-center gap-2">
              <div className="text-sm text-gray-500">inversions</div>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setSessionConfig(prev => ({ ...prev, includeInversions: true }))}
                  className={`px-4 py-2 text-sm border border-gray-400 ${
                    sessionConfig.includeInversions
                      ? 'bg-black text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  yes
                </button>
                <button
                  onClick={() => setSessionConfig(prev => ({ ...prev, includeInversions: false }))}
                  className={`px-4 py-2 text-sm border border-gray-400 ${
                    !sessionConfig.includeInversions
                      ? 'bg-black text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  no
                </button>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={startSession}
                disabled={
                  (sessionConfig.mode === 'chordTypes' && sessionConfig.chordTypes.length === 0) ||
                  (sessionConfig.mode === 'scales' && sessionConfig.scales.length === 0)
                }
                className="text-blue-500 text-sm lowercase hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                start
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Session Results UI
  if (isSessionComplete && sessionMetrics) {
    const finalEffectiveChords = parseFloat((sessionMetrics.correctChords * (sessionMetrics.chordAccuracy / 100)).toFixed(2));
    const isNewPB = finalEffectiveChords > pbEffectiveChords && pbEffectiveChords > 0;

    // Recalculate percentile for final score
    const betterThanCount = historicalSessions.filter(
      s => finalEffectiveChords >= s.effective_chords
    ).length;
    const finalPercentile = historicalSessions.length > 0
      ? Math.round((betterThanCount / historicalSessions.length) * 100)
      : 100;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavBar currentPage="chord" showMidiStatus={true} midiActive={activeMode === 'midi'} />

        <div className="flex-1 p-8 flex flex-col items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="text-6xl font-bold text-blue-600">
              {finalEffectiveChords}
            </div>
            {isNewPB && (
              <div className="text-green-600 text-sm">new pb 🎉</div>
            )}
          </div>

          <div className="flex flex-col items-start gap-1 text-sm text-gray-500 font-mono whitespace-pre">
            {pbEffectiveChords > 0 && (
              <div>{'pb         : '}{pbEffectiveChords}</div>
            )}
            {historicalSessions.length > 0 && (
              <div>{'percentile : '}{finalPercentile}% ({betterThanCount}/{historicalSessions.length})</div>
            )}
            <div>{'chords     : '}{sessionMetrics.correctChords}</div>
            <div>{'accuracy   : '}{sessionMetrics.chordAccuracy.toFixed(0)}%</div>
            <div>{'avg        : '}{sessionMetrics.avgTimePerChord.toFixed(1)}s</div>
          </div>

          <div className="flex gap-4 text-sm">
            <button
              onClick={() => {
                setIsSessionComplete(false);
                setSessionResults([]);
                startSession();
              }}
              className="text-blue-500 lowercase hover:underline"
            >
              again
            </button>
            <button
              onClick={() => {
                setIsSessionComplete(false);
                setSessionResults([]);
                setIsSessionActive(false);
              }}
              className="text-blue-500 lowercase hover:underline"
            >
              back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar currentPage="chord" showMidiStatus={true} midiActive={activeMode === 'midi'} />

      <div className="flex-1 p-8 flex flex-col items-center justify-center gap-8">

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div>{Math.floor(sessionTimeRemaining / 60000)}:{((sessionTimeRemaining % 60000) / 1000).toFixed(0).padStart(2, '0')}</div>
          {currentSessionStats && (
            <>
              <div>effective: {currentSessionStats.currentEffectiveChords}</div>
              {currentSessionStats.projectedFinal > 0 && (
                <div className={currentSessionStats.projectedFinal > pbEffectiveChords ? 'text-blue-500' : 'text-red-500'}>
                  proj: {currentSessionStats.projectedFinal}
                </div>
              )}
            </>
          )}
          {pbEffectiveChords > 0 && <div>pb: {pbEffectiveChords}</div>}
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="text-6xl font-bold text-blue-600">
            {targetChord}
          </div>
          <div className="text-lg text-gray-500 min-h-[28px]">
            {showChordNotes && targetChordNotes.length > 0 ? (
              targetChordNotes.join(' ')
            ) : (
              <button
                onClick={() => setShowChordNotes(true)}
                className="text-blue-600 hover:underline text-sm"
              >
                show
              </button>
            )}
          </div>
        </div>

        <div className={`text-2xl font-bold ${
          isCorrect ? 'text-green-600' : 'text-gray-500'
        }`}>
          {currentChord || '\u00A0'}
        </div>

        <div className="flex flex-col items-center gap-4">
          <Piano
            pressedKeys={pressedKeys}
            targetChordKeys={showChordNotes ? new Set(getChordMidiNotes(targetChord)) : new Set()}
          />
          <button
            onClick={() => {
              setIsSessionActive(false);
              setIsSessionComplete(false);
              setSessionResults([]);
            }}
            className="text-blue-500 text-sm lowercase hover:underline"
          >
            stop
          </button>
        </div>
      </div>
    </div>
  );
}