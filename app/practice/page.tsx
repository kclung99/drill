'use client';

import { useState, useEffect, useMemo } from 'react';
import { useMidi } from '../hooks/useMidi';
import Piano from '../components/Piano';
import { detectChord, chordsMatch, getChordNotes, getChordMidiNotes, SessionConfig, CHORD_TYPES, SCALES, generateSessionChords } from '../utils/chordDetection';
import { incrementSession } from '../utils/habitTracker';
import Link from 'next/link';

interface SessionResult {
  chord: string;
  attempts: number;
  correctTime: number;
  totalTime: number;
}

export default function PracticeMode() {
  const { pressedKeys, isSupported, activeMode } = useMidi();

  // Session configuration
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    chordCount: 3,
    mode: 'chordTypes',
    chordTypes: ['maj', 'min'],
    scales: ['C']
  });

  // Session state
  const [sessionChords, setSessionChords] = useState<string[]>([]);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

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
    return currentChord && targetChord && chordsMatch(currentChord, targetChord);
  }, [currentChord, targetChord]);

  const targetChordNotes = targetChord ? getChordNotes(targetChord) : [];
  const hasValidAttempt = useMemo(() => {
    // Only count as an attempt when user plays the expected number of notes
    return pressedKeys.size >= 3 && pressedKeys.size === targetChordNotes.length;
  }, [pressedKeys.size, targetChordNotes.length]);

  // Track when user makes an attempt
  const [lastAttemptKeys, setLastAttemptKeys] = useState<Set<number>>(new Set());

  const startSession = () => {
    const chords = generateSessionChords(sessionConfig);
    setSessionChords(chords);
    setCurrentChordIndex(0);
    setSessionResults([]);
    setIsSessionActive(true);
    setIsSessionComplete(false);
    startCurrentChord();
  };

  const startCurrentChord = () => {
    setStartTime(Date.now());
    setCurrentTime(0);
    setIsWaitingForNext(false);
    setShowChordNotes(false);
    setCurrentAttempts(0);
    setLastAttemptKeys(new Set());
  };

  const nextChord = () => {
    if (currentChordIndex < sessionChords.length - 1) {
      setCurrentChordIndex(prev => prev + 1);
      startCurrentChord();
    } else {
      // Session complete
      setIsSessionActive(false);
      setIsSessionComplete(true);
      // Increment music session in habit tracker
      incrementSession('music');
    }
  };



  // Real-time stopwatch effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime && !isWaitingForNext && isSessionActive) {
      interval = setInterval(() => {
        setCurrentTime(Date.now() - startTime);
      }, 10); // Update every 10ms for smooth timer
    }
    return () => clearInterval(interval);
  }, [startTime, isWaitingForNext, isSessionActive]);

  // Track attempts when user plays enough keys and releases them
  useEffect(() => {
    if (hasValidAttempt && startTime && isSessionActive && !isWaitingForNext) {
      // Check if this is a new attempt (different key combination)
      const currentKeysStr = Array.from(pressedKeys).sort().join(',');
      const lastKeysStr = Array.from(lastAttemptKeys).sort().join(',');

      if (currentKeysStr !== lastKeysStr && pressedKeys.size >= 3) {
        setLastAttemptKeys(new Set(pressedKeys));
        setCurrentAttempts(prev => prev + 1);

        if (isCorrect) {
          // Correct answer - finish the chord after a short delay
          setTimeout(() => {
            if (startTime) {
              const totalTime = Date.now() - startTime;
              const result: SessionResult = {
                chord: targetChord,
                attempts: currentAttempts + 1, // +1 because state hasn't updated yet
                correctTime: totalTime,
                totalTime: totalTime
              };
              setSessionResults(prev => [...prev, result]);
              setIsWaitingForNext(true);

              // Auto-advance to next chord
              setTimeout(() => {
                nextChord();
              }, 500);
            }
          }, 200); // Small delay to let user see the result
        }
      }
    }
  }, [hasValidAttempt, isCorrect, startTime, isSessionActive, targetChord, currentAttempts, isWaitingForNext, pressedKeys, lastAttemptKeys]);

  // Calculate session metrics
  const sessionMetrics = useMemo(() => {
    if (sessionResults.length === 0) return null;

    const totalAttempts = sessionResults.reduce((sum, r) => sum + r.attempts, 0);
    const correctChords = sessionResults.filter(r => r.correctTime > 0).length;
    const avgCorrectTime = correctChords > 0
      ? sessionResults.filter(r => r.correctTime > 0).reduce((sum, r) => sum + r.correctTime, 0) / correctChords
      : 0;
    const correctTimes = sessionResults.filter(r => r.correctTime > 0).map(r => r.correctTime);

    return {
      totalAttempts,
      correctChords,
      attemptAccuracy: totalAttempts > 0 ? (correctChords / totalAttempts) * 100 : 0,
      avgCorrectTime: avgCorrectTime / 1000,
      fastestTime: correctTimes.length > 0 ? Math.min(...correctTimes) / 1000 : 0,
      slowestTime: correctTimes.length > 0 ? Math.max(...correctTimes) / 1000 : 0
    };
  }, [sessionResults]);

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">MIDI Not Supported</h1>
          <p className="text-gray-600">Your browser doesn't support Web MIDI API.</p>
          <Link href="/" className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Session Configuration UI
  if (!isSessionActive && !isSessionComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="p-8">
          <div className="flex justify-between items-center">
            <div className="flex-1" />
            <div className="flex justify-center gap-4">
              <Link href="/" className="text-blue-600 hover:underline font-medium">
                home
              </Link>
              <Link href="/live" className="text-blue-600 hover:underline font-medium">
                live
              </Link>
              <Link href="/practice" className="text-blue-600 font-medium underline">
                chord
              </Link>
              <Link href="/drawing" className="text-blue-600 hover:underline font-medium">
                reference
              </Link>
            </div>
            <div className="flex-1 flex justify-end">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${activeMode === 'midi' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-sm text-gray-600">
                  {activeMode === 'midi' ? 'midi' : 'keyboard'}
                </span>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex-1 p-8 flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full space-y-8">

            <div className="flex flex-col items-center gap-2">
              <div className="text-sm text-gray-500">count</div>
              <div className="flex justify-center gap-2">
                {[3, 20, 30, 40].map(count => (
                  <button
                    key={count}
                    onClick={() => setSessionConfig(prev => ({ ...prev, chordCount: count }))}
                    className={`px-4 py-2 text-sm border border-gray-400 ${
                      sessionConfig.chordCount === count
                        ? 'bg-black text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {count}
                  </button>
                ))}
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
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  types
                </button>
                <button
                  onClick={() => setSessionConfig(prev => ({ ...prev, mode: 'scales' }))}
                  className={`px-4 py-2 text-sm border border-gray-400 ${
                    sessionConfig.mode === 'scales'
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
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
                        : 'bg-white text-gray-600 hover:bg-gray-100'
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
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {scale.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={startSession}
                disabled={
                  (sessionConfig.mode === 'chordTypes' && sessionConfig.chordTypes.length === 0) ||
                  (sessionConfig.mode === 'scales' && sessionConfig.scales.length === 0)
                }
                className="text-blue-600 underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="p-8">
          <div className="flex justify-between items-center">
            <div className="flex-1" />
            <div className="flex justify-center gap-4">
              <Link href="/" className="text-blue-600 hover:underline font-medium">
                home
              </Link>
              <Link href="/live" className="text-blue-600 hover:underline font-medium">
                live
              </Link>
              <Link href="/practice" className="text-blue-600 font-medium underline">
                chord
              </Link>
              <Link href="/drawing" className="text-blue-600 hover:underline font-medium">
                reference
              </Link>
            </div>
            <div className="flex-1 flex justify-end">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${activeMode === 'midi' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className="text-sm text-gray-600">
                  {activeMode === 'midi' ? 'midi' : 'keyboard'}
                </span>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex-1 p-8 flex flex-col items-center justify-center gap-8">
          <div className="text-4xl font-bold text-blue-600">
            {sessionMetrics.attemptAccuracy.toFixed(0)}%
          </div>

          <div className="flex gap-8 text-sm text-gray-600">
            <div>{sessionMetrics.totalAttempts} attempts</div>
            <div>{sessionMetrics.avgCorrectTime.toFixed(1)}s avg</div>
            <div>{sessionMetrics.fastestTime.toFixed(1)}s best</div>
          </div>

          <div className="flex gap-4 text-sm">
            <button
              onClick={() => {
                setIsSessionComplete(false);
                setSessionResults([]);
                startSession();
              }}
              className="text-blue-600 hover:underline"
            >
              again
            </button>
            <button
              onClick={() => {
                setIsSessionComplete(false);
                setSessionResults([]);
                setIsSessionActive(false);
              }}
              className="text-blue-600 hover:underline"
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
      <nav className="p-8">
        <div className="flex justify-between items-center">
          <div className="flex-1" />
          <div className="flex justify-center gap-4">
            <Link href="/" className="text-blue-600 hover:underline font-medium">
              home
            </Link>
            <Link href="/live" className="text-blue-600 hover:underline font-medium">
              live
            </Link>
            <Link href="/practice" className="text-blue-600 font-medium underline">
              chord
            </Link>
            <Link href="/drawing" className="text-blue-600 hover:underline font-medium">
              reference
            </Link>
          </div>
          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${activeMode === 'midi' ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="text-sm text-gray-600">
                {activeMode === 'midi' ? 'midi' : 'keyboard'}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 p-8 flex flex-col items-center justify-center gap-8">

        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div>{currentChordIndex + 1}/{sessionChords.length}</div>
          <div>·</div>
          <div>{(currentTime / 1000).toFixed(1)}s</div>
          <div>·</div>
          <div>{currentAttempts} attempts</div>
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
          isCorrect ? 'text-green-600' : 'text-gray-400'
        }`}>
          {currentChord || '-'}
        </div>

        <div>
          <Piano
            pressedKeys={pressedKeys}
            targetChordKeys={showChordNotes ? new Set(getChordMidiNotes(targetChord)) : new Set()}
          />
        </div>
      </div>
    </div>
  );
}