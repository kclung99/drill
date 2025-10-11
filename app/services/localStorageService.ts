/**
 * localStorage Service
 *
 * Centralized service for managing all localStorage operations.
 * This is the primary data store for both guest and logged-in users.
 */

// localStorage keys
const KEYS = {
  HABIT_DATA: 'drill-habit-data',
  CHORD_SESSIONS: 'drill-chord-sessions',
  DRAWING_SESSIONS: 'drill-drawing-sessions',
  SYNC_QUEUE: 'drill-sync-queue',
  MIGRATED: 'drill-migrated',
} as const;

// ============================================================================
// Types
// ============================================================================

export interface HabitSettings {
  musicDailyTarget: number;
  drawingDailyTarget: number;
}

export interface DayHabitData {
  date: string; // YYYY-MM-DD format
  musicSessions: number;
  drawingSessions: number;
}

export interface HabitData {
  settings: HabitSettings;
  days: DayHabitData[];
}

export interface ChordSessionResult {
  chord: string;
  attempts: number;
  correctTime: number; // milliseconds
  totalTime: number; // milliseconds
}

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
  effectiveChords: number; // totalChords * (accuracy / 100), rounded to 2 decimals
}

export interface ChordSession {
  id: string;
  config: ChordSessionConfig;
  metrics: ChordSessionMetrics;
  chordResults: ChordSessionResult[];
  timestamp: number; // Unix timestamp
}

export interface DrawingSessionConfig {
  duration: number | 'inf'; // seconds per image (or infinite)
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

export interface SyncQueueItem {
  id: string;
  table: 'chord_practice_sessions' | 'drawing_practice_sessions';
  data: Record<string, unknown>;
  timestamp: number;
}

// ============================================================================
// Habit Data Functions (existing functionality)
// ============================================================================

const DEFAULT_SETTINGS: HabitSettings = {
  musicDailyTarget: 2,
  drawingDailyTarget: 2,
};

export const getHabitData = (): HabitData => {
  if (typeof window === 'undefined') {
    return { settings: DEFAULT_SETTINGS, days: [] };
  }

  try {
    const stored = localStorage.getItem(KEYS.HABIT_DATA);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        settings: { ...DEFAULT_SETTINGS, ...data.settings },
        days: data.days || [],
      };
    }
  } catch (error) {
    console.error('Error loading habit data:', error);
  }

  return { settings: DEFAULT_SETTINGS, days: [] };
};

export const saveHabitData = (data: HabitData): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(KEYS.HABIT_DATA, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving habit data:', error);
  }
};

const getTodayInTimezone = (): string => {
  if (typeof window !== 'undefined') {
    try {
      // Use inline implementation to avoid circular dependencies
      const stored = localStorage.getItem('drill-user-settings');
      const settings = stored ? JSON.parse(stored) : { timezoneOffset: -6 };
      const offsetMap: Record<number, string> = {
        '-6': 'America/Chicago',
        '-5': 'America/New_York',
        '-8': 'America/Los_Angeles',
        // Add more as needed
      };
      const timezone = offsetMap[settings.timezoneOffset] || 'America/Chicago';
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(now);
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }
  return new Date().toISOString().split('T')[0];
};

export const incrementSession = (type: 'music' | 'drawing'): void => {
  const data = getHabitData();
  const today = getTodayInTimezone();

  let dayData = data.days.find((d) => d.date === today);
  if (!dayData) {
    dayData = { date: today, musicSessions: 0, drawingSessions: 0 };
    data.days.push(dayData);
  }

  if (type === 'music') {
    dayData.musicSessions++;
  } else {
    dayData.drawingSessions++;
  }

  saveHabitData(data);
};

export const getDayData = (date: string): DayHabitData => {
  const data = getHabitData();
  return (
    data.days.find((d) => d.date === date) || {
      date,
      musicSessions: 0,
      drawingSessions: 0,
    }
  );
};

// ============================================================================
// Chord Session Functions (new functionality)
// ============================================================================

export const getChordSessions = (): ChordSession[] => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(KEYS.CHORD_SESSIONS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading chord sessions:', error);
  }

  return [];
};

export const saveChordSession = (session: Omit<ChordSession, 'id' | 'timestamp'>): ChordSession => {
  const newSession: ChordSession = {
    id: generateId(),
    ...session,
    timestamp: Date.now(),
  };

  const sessions = getChordSessions();
  sessions.push(newSession);

  try {
    localStorage.setItem(KEYS.CHORD_SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving chord session:', error);
  }

  return newSession;
};

export const clearChordSessions = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEYS.CHORD_SESSIONS);
};

// ============================================================================
// Drawing Session Functions
// ============================================================================

export const getDrawingSessions = (): DrawingSession[] => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(KEYS.DRAWING_SESSIONS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading drawing sessions:', error);
  }

  return [];
};

export const saveDrawingSession = (session: Omit<DrawingSession, 'id' | 'timestamp'>): DrawingSession => {
  const newSession: DrawingSession = {
    id: generateId(),
    ...session,
    timestamp: Date.now(),
  };

  const sessions = getDrawingSessions();
  sessions.push(newSession);

  try {
    localStorage.setItem(KEYS.DRAWING_SESSIONS, JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving drawing session:', error);
  }

  return newSession;
};

export const clearDrawingSessions = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEYS.DRAWING_SESSIONS);
};

// ============================================================================
// Sync Queue Functions (new functionality)
// ============================================================================

export const getSyncQueue = (): SyncQueueItem[] => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(KEYS.SYNC_QUEUE);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading sync queue:', error);
  }

  return [];
};

export const addToSyncQueue = (
  table: SyncQueueItem['table'],
  data: Record<string, unknown>
): void => {
  const queue = getSyncQueue();
  queue.push({
    id: generateId(),
    table,
    data,
    timestamp: Date.now(),
  });

  try {
    localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('Error adding to sync queue:', error);
  }
};

export const clearSyncQueue = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify([]));
};

export const removeSyncQueueItem = (id: string): void => {
  const queue = getSyncQueue();
  const filtered = queue.filter((item) => item.id !== id);
  localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(filtered));
};

// ============================================================================
// Migration Flag Functions
// ============================================================================

export const isMigrated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(KEYS.MIGRATED) === 'true';
};

export const setMigrated = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEYS.MIGRATED, 'true');
};

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const clearAllData = (): void => {
  if (typeof window === 'undefined') return;
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
};
