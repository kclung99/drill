/**
 * useChordSession Hook
 *
 * Manages chord practice session state and logic.
 * Extracts complex state management from practice page component.
 */

import { useState, useEffect, useCallback } from 'react';
import { SessionConfig, generateSessionChords } from '@/app/utils/chord';

export interface SessionResult {
  chord: string;
  attempts: number;
  correctTime: number; // milliseconds
  totalTime: number; // milliseconds
}

export interface SessionMetrics {
  totalAttempts: number;
  correctChords: number;
  chordAccuracy: number; // percentage
  avgTimePerChord: number; // seconds
  fastestTime: number; // seconds
  slowestTime: number; // seconds
}

export interface ChordSessionState {
  // Session config
  sessionConfig: SessionConfig;
  sessionDuration: number; // minutes
  setSessionConfig: (config: SessionConfig) => void;
  setSessionDuration: (duration: number) => void;

  // Session lifecycle
  isSessionActive: boolean;
  isSessionComplete: boolean;
  startSession: () => void;
  stopSession: () => void;
  resetSession: () => void;

  // Current chord state
  sessionChords: string[];
  currentChordIndex: number;
  targetChord: string;
  currentAttempts: number;
  incrementAttempts: () => void;
  advanceToNextChord: () => void;

  // Session progress
  sessionResults: SessionResult[];
  totalChordsAnswered: number;
  addResult: (result: SessionResult) => void;

  // Timing
  sessionTimeRemaining: number; // milliseconds
  currentChordStartTime: number | null;
  currentChordElapsed: number; // milliseconds

  // Calculated metrics
  sessionMetrics: SessionMetrics | null;
}

export const useChordSession = (): ChordSessionState => {
  // Session configuration
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    chordCount: 3,
    mode: 'chordTypes',
    chordTypes: ['maj', 'min'],
    scales: ['C'],
    includeInversions: true,
  });
  const [sessionDuration, setSessionDuration] = useState<number>(3); // minutes

  // Session lifecycle
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  // Session data
  const [sessionChords, setSessionChords] = useState<string[]>([]);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [totalChordsAnswered, setTotalChordsAnswered] = useState(0);

  // Timing
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState<number>(0);
  const [currentChordStartTime, setCurrentChordStartTime] = useState<number | null>(null);
  const [currentChordElapsed, setCurrentChordElapsed] = useState<number>(0);

  // Current chord state
  const [currentAttempts, setCurrentAttempts] = useState(0);

  const targetChord = sessionChords[currentChordIndex] || '';

  // Start a new session
  const startSession = useCallback(() => {
    const chords = generateSessionChords(sessionConfig);
    setSessionChords(chords);
    setCurrentChordIndex(0);
    setSessionResults([]);
    setTotalChordsAnswered(0);
    setIsSessionActive(true);
    setIsSessionComplete(false);
    setSessionStartTime(Date.now());
    setSessionTimeRemaining(sessionDuration * 60 * 1000);
    setCurrentChordStartTime(Date.now());
    setCurrentChordElapsed(0);
    setCurrentAttempts(0);
  }, [sessionConfig, sessionDuration]);

  // Stop the session
  const stopSession = useCallback(() => {
    setIsSessionActive(false);
    setIsSessionComplete(true);
    setSessionTimeRemaining(0);
  }, []);

  // Reset to config screen
  const resetSession = useCallback(() => {
    setIsSessionActive(false);
    setIsSessionComplete(false);
    setSessionResults([]);
    setSessionChords([]);
    setCurrentChordIndex(0);
    setTotalChordsAnswered(0);
  }, []);

  // Increment attempts counter
  const incrementAttempts = useCallback(() => {
    setCurrentAttempts(prev => prev + 1);
  }, []);

  // Move to next chord
  const advanceToNextChord = useCallback(() => {
    const newChords = generateSessionChords({ ...sessionConfig, chordCount: 1 });
    setSessionChords(prev => [...prev, ...newChords]);
    setCurrentChordIndex(prev => prev + 1);
    setTotalChordsAnswered(prev => prev + 1);
    setCurrentChordStartTime(Date.now());
    setCurrentChordElapsed(0);
    setCurrentAttempts(0);
  }, [sessionConfig]);

  // Add a session result
  const addResult = useCallback((result: SessionResult) => {
    setSessionResults(prev => [...prev, result]);
  }, []);

  // Session countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStartTime && isSessionActive) {
      interval = setInterval(() => {
        const elapsed = Date.now() - sessionStartTime;
        const remaining = sessionDuration * 60 * 1000 - elapsed;

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

  // Current chord stopwatch
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentChordStartTime && isSessionActive) {
      interval = setInterval(() => {
        setCurrentChordElapsed(Date.now() - currentChordStartTime);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [currentChordStartTime, isSessionActive]);

  // Calculate session metrics
  const sessionMetrics = useCallback((): SessionMetrics | null => {
    if (sessionResults.length === 0) return null;

    const totalAttempts = sessionResults.reduce((sum, r) => sum + r.attempts, 0);
    const correctChords = totalChordsAnswered;
    const avgCorrectTime =
      correctChords > 0
        ? sessionResults.filter(r => r.correctTime > 0).reduce((sum, r) => sum + r.correctTime, 0) / correctChords
        : 0;
    const correctTimes = sessionResults.filter(r => r.correctTime > 0).map(r => r.correctTime);

    return {
      totalAttempts,
      correctChords,
      chordAccuracy: correctChords > 0 ? (correctChords / totalAttempts) * 100 : 0,
      avgTimePerChord: avgCorrectTime / 1000,
      fastestTime: correctTimes.length > 0 ? Math.min(...correctTimes) / 1000 : 0,
      slowestTime: correctTimes.length > 0 ? Math.max(...correctTimes) / 1000 : 0,
    };
  }, [sessionResults, totalChordsAnswered])();

  return {
    // Config
    sessionConfig,
    sessionDuration,
    setSessionConfig,
    setSessionDuration,

    // Lifecycle
    isSessionActive,
    isSessionComplete,
    startSession,
    stopSession,
    resetSession,

    // Current chord
    sessionChords,
    currentChordIndex,
    targetChord,
    currentAttempts,
    incrementAttempts,
    advanceToNextChord,

    // Results
    sessionResults,
    totalChordsAnswered,
    addResult,

    // Timing
    sessionTimeRemaining,
    currentChordStartTime,
    currentChordElapsed,

    // Metrics
    sessionMetrics,
  };
};
