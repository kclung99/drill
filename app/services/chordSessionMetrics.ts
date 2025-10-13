/**
 * Chord Session Metrics Service
 *
 * Calculate session performance metrics and statistics.
 */

export interface SessionResult {
  chord: string;
  attempts: number;
  correctTime: number;
  totalTime: number;
}

export interface SessionMetrics {
  totalAttempts: number;
  correctChords: number;
  chordAccuracy: number;
  avgTimePerChord: number;
  fastestTime: number;
  slowestTime: number;
}

export interface CurrentSessionStats {
  currentEffectiveChords: number;
  projectedFinal: number;
}

/**
 * Calculate final session metrics from results
 */
export const calculateSessionMetrics = (
  sessionResults: SessionResult[],
  totalChordsAnswered: number
): SessionMetrics | null => {
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
};

/**
 * Calculate current session statistics during active session
 */
export const calculateCurrentStats = (
  sessionResults: SessionResult[],
  totalChordsAnswered: number,
  sessionStartTime: number | null,
  sessionDuration: number
): CurrentSessionStats | null => {
  if (sessionResults.length === 0) return null;

  const totalAttempts = sessionResults.reduce((sum, r) => sum + r.attempts, 0);
  const accuracy = totalChordsAnswered > 0 ? (totalChordsAnswered / totalAttempts) * 100 : 0;
  const currentEffectiveChords = parseFloat((totalChordsAnswered * (accuracy / 100)).toFixed(2));

  const elapsedMs = sessionStartTime ? Date.now() - sessionStartTime : 0;
  const elapsedMinutes = elapsedMs / 60000;
  const projectedFinal = elapsedMinutes > 0
    ? parseFloat((currentEffectiveChords / elapsedMinutes * sessionDuration).toFixed(2))
    : 0;

  return {
    currentEffectiveChords,
    projectedFinal,
  };
};

/**
 * Calculate effective chords from accuracy
 */
export const calculateEffectiveChords = (totalChords: number, accuracy: number): number => {
  return parseFloat((totalChords * (accuracy / 100)).toFixed(2));
};

/**
 * Prepare metrics for saving to database
 */
export const prepareMetricsForSave = (
  sessionResults: SessionResult[],
  totalChordsAnswered: number
) => {
  const totalAttempts = sessionResults.reduce((sum, r) => sum + r.attempts, 0);
  const avgCorrectTime = totalChordsAnswered > 0
    ? sessionResults.filter(r => r.correctTime > 0).reduce((sum, r) => sum + r.correctTime, 0) / totalChordsAnswered
    : 0;
  const correctTimes = sessionResults.filter(r => r.correctTime > 0).map(r => r.correctTime);

  const accuracy = totalChordsAnswered > 0 ? (totalChordsAnswered / totalAttempts) * 100 : 0;
  const effectiveChords = calculateEffectiveChords(totalChordsAnswered, accuracy);

  return {
    totalChords: totalChordsAnswered,
    totalAttempts,
    accuracy,
    avgTimePerChord: avgCorrectTime / 1000,
    fastestTime: correctTimes.length > 0 ? Math.min(...correctTimes) / 1000 : 0,
    slowestTime: correctTimes.length > 0 ? Math.max(...correctTimes) / 1000 : 0,
    effectiveChords,
  };
};
