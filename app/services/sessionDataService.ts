/**
 * Session Data Service
 *
 * Core localStorage operations for practice sessions.
 * Works for both guest and logged-in users.
 * No Supabase dependencies - pure local storage.
 */

// ============================================================================
// Types
// ============================================================================

export interface ChordSessionConfig {
  duration: number; // minutes
  mode: 'chordTypes' | 'scales';
  chordTypes: string[];
  scales: string[];
  includeInversions: boolean;
}

export interface ChordSessionMetrics {
  totalChords: number;
  totalAttempts: number;
  accuracy: number; // percentage (0-100)
  avgTimePerChord: number; // seconds
  fastestTime: number; // seconds
  slowestTime: number; // seconds
  effectiveChords: number; // totalChords * (accuracy / 100)
}

export interface ChordSessionResult {
  chord: string;
  attempts: number;
  correctTime: number; // milliseconds
  totalTime: number; // milliseconds
}

export interface ChordSession {
  id: string;
  config: ChordSessionConfig;
  metrics: ChordSessionMetrics;
  chordResults: ChordSessionResult[];
  timestamp: number; // Unix timestamp
}

export interface DrawingSessionConfig {
  duration: number | 'inf'; // seconds per image
  imageCount: number;
  category: string;
  gender: string;
  clothing: string;
  alwaysGenerateNew: boolean;
}

export interface DrawingSessionResults {
  imagesCompleted: number;
  totalTimeSeconds: number | null;
}

export interface DrawingSession {
  id: string;
  config: DrawingSessionConfig;
  results: DrawingSessionResults;
  timestamp: number; // Unix timestamp
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEYS = {
  CHORD_SESSIONS: 'drill-chord-sessions',
  DRAWING_SESSIONS: 'drill-drawing-sessions',
} as const;

// ============================================================================
// Chord Session Functions
// ============================================================================

export const getChordSessions = (): ChordSession[] => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CHORD_SESSIONS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading chord sessions:', error);
  }

  return [];
};

export const saveChordSession = (
  config: ChordSessionConfig,
  metrics: ChordSessionMetrics,
  results: ChordSessionResult[]
): ChordSession => {
  const session: ChordSession = {
    id: generateId(),
    config,
    metrics,
    chordResults: results,
    timestamp: Date.now(),
  };

  const sessions = getChordSessions();
  sessions.push(session);

  try {
    localStorage.setItem(STORAGE_KEYS.CHORD_SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving chord session:', error);
  }

  return session;
};

export const mergeChordSessions = (newSessions: ChordSession[]): void => {
  const existing = getChordSessions();
  const existingIds = new Set(existing.map(s => s.id));

  // Add only new sessions (by ID)
  const toAdd = newSessions.filter(s => !existingIds.has(s.id));

  if (toAdd.length === 0) return;

  const merged = [...existing, ...toAdd];

  // Sort by timestamp
  merged.sort((a, b) => a.timestamp - b.timestamp);

  try {
    localStorage.setItem(STORAGE_KEYS.CHORD_SESSIONS, JSON.stringify(merged));
  } catch (error) {
    console.error('Error merging chord sessions:', error);
  }
};

// ============================================================================
// Drawing Session Functions
// ============================================================================

export const getDrawingSessions = (): DrawingSession[] => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DRAWING_SESSIONS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading drawing sessions:', error);
  }

  return [];
};

export const saveDrawingSession = (
  config: DrawingSessionConfig,
  results: DrawingSessionResults
): DrawingSession => {
  const session: DrawingSession = {
    id: generateId(),
    config,
    results,
    timestamp: Date.now(),
  };

  const sessions = getDrawingSessions();
  sessions.push(session);

  try {
    localStorage.setItem(STORAGE_KEYS.DRAWING_SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving drawing session:', error);
  }

  return session;
};

export const mergeDrawingSessions = (newSessions: DrawingSession[]): void => {
  const existing = getDrawingSessions();
  const existingIds = new Set(existing.map(s => s.id));

  // Add only new sessions (by ID)
  const toAdd = newSessions.filter(s => !existingIds.has(s.id));

  if (toAdd.length === 0) return;

  const merged = [...existing, ...toAdd];

  // Sort by timestamp
  merged.sort((a, b) => a.timestamp - b.timestamp);

  try {
    localStorage.setItem(STORAGE_KEYS.DRAWING_SESSIONS, JSON.stringify(merged));
  } catch (error) {
    console.error('Error merging drawing sessions:', error);
  }
};

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const clearAllSessions = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.CHORD_SESSIONS);
  localStorage.removeItem(STORAGE_KEYS.DRAWING_SESSIONS);
};
