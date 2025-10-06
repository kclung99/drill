/**
 * Supabase Sync Service
 *
 * Handles background synchronization of localStorage data to Supabase
 * for logged-in users only. Guest users remain localStorage-only.
 */

import { supabase } from '@/app/lib/supabase';
import {
  getSyncQueue,
  clearSyncQueue,
  ChordSession,
  DrawingSession,
} from './localStorageService';

// ============================================================================
// Types
// ============================================================================

interface HabitSessionRow {
  user_id: string;
  session_type: 'music' | 'drawing';
  session_date: string; // YYYY-MM-DD
}

interface ChordPracticeSessionRow {
  user_id: string;
  duration_minutes: number;
  mode: 'chordTypes' | 'scales';
  chord_types: string[] | null;
  scales: string[] | null;
  total_chords: number;
  total_attempts: number;
  accuracy: number;
  avg_time_per_chord: number;
  fastest_time: number;
  slowest_time: number;
  chord_results: Record<string, unknown>[];
}

interface DrawingPracticeSessionRow {
  user_id: string;
  duration_seconds: number | null;
  image_count: number;
  category: string;
  gender: string;
  clothing: string;
  always_generate_new: boolean;
  images_completed: number;
  total_time_seconds: number | null;
}

export interface SyncStatus {
  isSync: boolean;
  lastSyncTime: number | null;
  pendingCount: number;
  error: string | null;
}

// ============================================================================
// Queue Management
// ============================================================================

/**
 * Add a habit session to the sync queue
 */
export const queueHabitSession = async (sessionType: 'music' | 'drawing', date: string): Promise<void> => {
  const { addToSyncQueue } = await import('./localStorageService');
  addToSyncQueue('habit_sessions', {
    session_type: sessionType,
    session_date: date,
  });
};

/**
 * Add a chord practice session to the sync queue
 */
export const queueChordSession = async (session: ChordSession): Promise<void> => {
  const { addToSyncQueue } = await import('./localStorageService');
  addToSyncQueue('chord_practice_sessions', {
    duration_minutes: session.config.duration,
    mode: session.config.mode,
    chord_types: session.config.mode === 'chordTypes' ? session.config.chordTypes : null,
    scales: session.config.mode === 'scales' ? session.config.scales : null,
    total_chords: session.metrics.totalChords,
    total_attempts: session.metrics.totalAttempts,
    accuracy: session.metrics.accuracy,
    avg_time_per_chord: session.metrics.avgTimePerChord,
    fastest_time: session.metrics.fastestTime,
    slowest_time: session.metrics.slowestTime,
    chord_results: session.chordResults,
  });
};

/**
 * Add a drawing practice session to the sync queue
 */
export const queueDrawingSession = async (session: DrawingSession): Promise<void> => {
  const { addToSyncQueue } = await import('./localStorageService');
  addToSyncQueue('drawing_practice_sessions', {
    duration_seconds: session.config.duration === 'inf' ? null : session.config.duration,
    image_count: session.config.imageCount,
    category: session.config.category,
    gender: session.config.gender,
    clothing: session.config.clothing,
    always_generate_new: session.config.alwaysGenerateNew,
    images_completed: session.results.imagesCompleted,
    total_time_seconds: session.results.totalTimeSeconds,
  });
};

// ============================================================================
// Sync Functions
// ============================================================================

/**
 * Sync all queued items to Supabase
 * Should be called periodically by the background sync worker
 */
export const syncToSupabase = async (): Promise<SyncStatus> => {
  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      isSync: false,
      lastSyncTime: null,
      pendingCount: 0,
      error: 'User not logged in',
    };
  }

  // Get queued items
  const queue = getSyncQueue();

  if (queue.length === 0) {
    return {
      isSync: true,
      lastSyncTime: Date.now(),
      pendingCount: 0,
      error: null,
    };
  }

  try {
    // Separate items by table
    const chordItems = queue.filter((item) => item.table === 'chord_practice_sessions');
    const drawingItems = queue.filter((item) => item.table === 'drawing_practice_sessions');

    // Sync chord practice sessions
    if (chordItems.length > 0) {
      const chordRows: ChordPracticeSessionRow[] = chordItems.map((item) => ({
        user_id: user.id,
        duration_minutes: item.data.duration_minutes as number,
        mode: item.data.mode as 'chordTypes' | 'scales',
        chord_types: item.data.chord_types as string[] | null,
        scales: item.data.scales as string[] | null,
        total_chords: item.data.total_chords as number,
        total_attempts: item.data.total_attempts as number,
        accuracy: item.data.accuracy as number,
        avg_time_per_chord: item.data.avg_time_per_chord as number,
        fastest_time: item.data.fastest_time as number,
        slowest_time: item.data.slowest_time as number,
        chord_results: item.data.chord_results as Record<string, unknown>[],
      }));

      const { error: chordError } = await supabase
        .from('chord_practice_sessions')
        .insert(chordRows);

      if (chordError) {
        console.error('Error syncing chord sessions:', chordError);
        throw chordError;
      }
    }

    // Sync drawing practice sessions
    if (drawingItems.length > 0) {
      const drawingRows: DrawingPracticeSessionRow[] = drawingItems.map((item) => ({
        user_id: user.id,
        duration_seconds: item.data.duration_seconds as number | null,
        image_count: item.data.image_count as number,
        category: item.data.category as string,
        gender: item.data.gender as string,
        clothing: item.data.clothing as string,
        always_generate_new: item.data.always_generate_new as boolean,
        images_completed: item.data.images_completed as number,
        total_time_seconds: item.data.total_time_seconds as number | null,
      }));

      const { error: drawingError } = await supabase
        .from('drawing_practice_sessions')
        .insert(drawingRows);

      if (drawingError) {
        console.error('Error syncing drawing sessions:', drawingError);
        throw drawingError;
      }
    }

    // Clear the queue after successful sync
    clearSyncQueue();

    return {
      isSync: true,
      lastSyncTime: Date.now(),
      pendingCount: 0,
      error: null,
    };
  } catch (error: unknown) {
    console.error('Sync failed:', error);
    return {
      isSync: false,
      lastSyncTime: null,
      pendingCount: queue.length,
      error: error instanceof Error ? error.message : 'Unknown sync error',
    };
  }
};

/**
 * Get current sync status
 */
export const getSyncStatus = (): SyncStatus => {
  const queue = getSyncQueue();

  return {
    isSync: true, // We don't track this yet, assume true
    lastSyncTime: null, // We don't track this yet
    pendingCount: queue.length,
    error: null,
  };
};

// ============================================================================
// Migration Functions
// ============================================================================

/**
 * Migrate all localStorage data to Supabase on first sign-in
 * This is a one-time operation
 */
export const migrateGuestData = async (): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not logged in');
  }

  const { getHabitData, getChordSessions, setMigrated, isMigrated } = await import('./localStorageService');

  // Check if already migrated
  if (isMigrated()) {
    console.log('Data already migrated, skipping');
    return;
  }

  try {
    // Migrate habit data
    const habitData = getHabitData();
    const habitRows: HabitSessionRow[] = [];

    habitData.days.forEach((day) => {
      // Add music sessions
      for (let i = 0; i < day.musicSessions; i++) {
        habitRows.push({
          user_id: user.id,
          session_type: 'music',
          session_date: day.date,
        });
      }

      // Add drawing sessions
      for (let i = 0; i < day.drawingSessions; i++) {
        habitRows.push({
          user_id: user.id,
          session_type: 'drawing',
          session_date: day.date,
        });
      }
    });

    if (habitRows.length > 0) {
      const { error: habitError } = await supabase
        .from('habit_sessions')
        .insert(habitRows);

      if (habitError) {
        console.error('Error migrating habit data:', habitError);
        throw habitError;
      }
    }

    // Migrate chord sessions
    const chordSessions = getChordSessions();

    if (chordSessions.length > 0) {
      const chordRows: ChordPracticeSessionRow[] = chordSessions.map((session: ChordSession) => ({
        user_id: user.id,
        duration_minutes: session.config.duration,
        mode: session.config.mode,
        chord_types: session.config.mode === 'chordTypes' ? session.config.chordTypes : null,
        scales: session.config.mode === 'scales' ? session.config.scales : null,
        total_chords: session.metrics.totalChords,
        total_attempts: session.metrics.totalAttempts,
        accuracy: session.metrics.accuracy,
        avg_time_per_chord: session.metrics.avgTimePerChord,
        fastest_time: session.metrics.fastestTime,
        slowest_time: session.metrics.slowestTime,
        chord_results: session.chordResults,
      }));

      const { error: chordError } = await supabase
        .from('chord_practice_sessions')
        .insert(chordRows);

      if (chordError) {
        console.error('Error migrating chord sessions:', chordError);
        throw chordError;
      }
    }

    // Mark as migrated
    setMigrated();

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

/**
 * Fetch data from Supabase and merge into localStorage
 * This syncs remote data to local for logged-in users
 */
export const syncFromSupabase = async (): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const {
    getHabitData,
    saveHabitData,
    getChordSessions,
    getDrawingSessions,
    DayHabitData,
    ChordSession,
    DrawingSession
  } = await import('./localStorageService');

  try {
    // 1. Fetch both chord and drawing practice sessions from Supabase
    const { data: chordRows, error: chordError } = await supabase
      .from('chord_practice_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false});

    if (chordError) throw chordError;

    const { data: drawingRows, error: drawingError } = await supabase
      .from('drawing_practice_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (drawingError) throw drawingError;

    // 2. Build heatmap from both tables (aggregate by date)
    const habitData = getHabitData();
    const dayMap = new Map<string, { musicSessions: number; drawingSessions: number }>();

    // Aggregate chord sessions by date (music)
    if (chordRows && chordRows.length > 0) {
      const { formatDateInUserTimezone } = await import('@/app/utils/timezoneHelper');
      chordRows.forEach(row => {
        // Convert UTC timestamp to date in user's timezone
        const date = formatDateInUserTimezone(new Date(row.created_at));
        const existing = dayMap.get(date) || { musicSessions: 0, drawingSessions: 0 };
        existing.musicSessions++;
        dayMap.set(date, existing);
      });
    }

    // Aggregate drawing sessions by date (drawing)
    if (drawingRows && drawingRows.length > 0) {
      const { formatDateInUserTimezone } = await import('@/app/utils/timezoneHelper');
      drawingRows.forEach(row => {
        // Convert UTC timestamp to date in user's timezone
        const date = formatDateInUserTimezone(new Date(row.created_at));
        const existing = dayMap.get(date) || { musicSessions: 0, drawingSessions: 0 };
        existing.drawingSessions++;
        dayMap.set(date, existing);
      });
    }

    // Convert to array and save
    const mergedDays: DayHabitData[] = Array.from(dayMap.entries()).map(([date, counts]) => ({
      date,
      musicSessions: counts.musicSessions,
      drawingSessions: counts.drawingSessions,
    }));

    // Save merged heatmap data
    saveHabitData({
      settings: habitData.settings,
      days: mergedDays,
    });

    // 3. Merge chord sessions into localStorage
    if (chordRows && chordRows.length > 0) {
      const existingSessions = getChordSessions();
      const existingIds = new Set(existingSessions.map(s => s.id));

      chordRows.forEach(row => {
        const sessionId = `supabase-chord-${row.id}`;

        if (!existingIds.has(sessionId)) {
          const localSession: ChordSession = {
            id: sessionId,
            config: {
              duration: row.duration_minutes,
              mode: row.mode as 'chordTypes' | 'scales',
              chordTypes: row.chord_types || [],
              scales: row.scales || [],
            },
            metrics: {
              totalChords: row.total_chords,
              totalAttempts: row.total_attempts,
              accuracy: parseFloat(row.accuracy?.toString() || '0'),
              avgTimePerChord: parseFloat(row.avg_time_per_chord?.toString() || '0'),
              fastestTime: parseFloat(row.fastest_time?.toString() || '0'),
              slowestTime: parseFloat(row.slowest_time?.toString() || '0'),
            },
            chordResults: (row.chord_results as unknown[]) || [],
            timestamp: new Date(row.created_at).getTime(),
          };

          existingSessions.push(localSession);
        }
      });

      localStorage.setItem('drill-chord-sessions', JSON.stringify(existingSessions));
    }

    // 4. Merge drawing sessions into localStorage
    if (drawingRows && drawingRows.length > 0) {
      const existingSessions = getDrawingSessions();
      const existingIds = new Set(existingSessions.map(s => s.id));

      drawingRows.forEach(row => {
        const sessionId = `supabase-drawing-${row.id}`;

        if (!existingIds.has(sessionId)) {
          const localSession: DrawingSession = {
            id: sessionId,
            config: {
              duration: row.duration_seconds === null ? 'inf' : row.duration_seconds,
              imageCount: row.image_count,
              category: row.category || '',
              gender: row.gender || '',
              clothing: row.clothing || '',
              alwaysGenerateNew: row.always_generate_new || false,
            },
            results: {
              imagesCompleted: row.images_completed,
              totalTimeSeconds: row.total_time_seconds,
            },
            timestamp: new Date(row.created_at).getTime(),
          };

          existingSessions.push(localSession);
        }
      });

      localStorage.setItem('drill-drawing-sessions', JSON.stringify(existingSessions));
    }

    console.log('Sync from Supabase completed');
  } catch (error) {
    console.error('Failed to sync from Supabase:', error);
  }
};
