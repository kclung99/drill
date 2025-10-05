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
    // Only sync chord practice sessions (habit counts are derived from this table)
    const chordItems = queue.filter((item) => item.table === 'chord_practice_sessions');

    // Sync chord practice sessions
    if (chordItems.length > 0) {
      const chordRows: ChordPracticeSessionRow[] = chordItems.map((item) => ({
        user_id: user.id,
        duration_minutes: item.data.duration_minutes,
        mode: item.data.mode,
        chord_types: item.data.chord_types,
        scales: item.data.scales,
        total_chords: item.data.total_chords,
        total_attempts: item.data.total_attempts,
        accuracy: item.data.accuracy,
        avg_time_per_chord: item.data.avg_time_per_chord,
        fastest_time: item.data.fastest_time,
        slowest_time: item.data.slowest_time,
        chord_results: item.data.chord_results,
      }));

      const { error: chordError } = await supabase
        .from('chord_practice_sessions')
        .insert(chordRows);

      if (chordError) {
        console.error('Error syncing chord sessions:', chordError);
        throw chordError;
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
    DayHabitData,
    ChordSession
  } = await import('./localStorageService');

  try {
    // 1. Fetch chord practice sessions from Supabase
    const { data: chordRows, error: chordError } = await supabase
      .from('chord_practice_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (chordError) throw chordError;

    // 2. Build heatmap from chord sessions (aggregate by date)
    const habitData = getHabitData();
    const dayMap = new Map<string, { musicSessions: number; drawingSessions: number }>();

    // Aggregate chord sessions by date
    if (chordRows && chordRows.length > 0) {
      chordRows.forEach(row => {
        // Extract date from created_at timestamp
        const date = new Date(row.created_at).toISOString().split('T')[0];
        const existing = dayMap.get(date) || { musicSessions: 0, drawingSessions: 0 };
        existing.musicSessions++;
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
      const { saveChordSession: saveToLS } = await import('./localStorageService');
      const existingSessions = getChordSessions();
      const existingIds = new Set(existingSessions.map(s => s.id));

      // Only add sessions that don't exist locally (avoid duplicates)
      chordRows.forEach(row => {
        // Use created_at timestamp as ID for Supabase sessions
        const sessionId = `supabase-${row.id}`;

        if (!existingIds.has(sessionId)) {
          const session: Omit<ChordSession, 'id' | 'timestamp'> = {
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
          };

          // Save with custom ID and timestamp from Supabase
          const localSession = {
            ...session,
            id: sessionId,
            timestamp: new Date(row.created_at).getTime(),
          };

          // Manually add to localStorage without using saveChordSession (to preserve ID)
          const sessions = getChordSessions();
          sessions.push(localSession);
          localStorage.setItem('drill-chord-sessions', JSON.stringify(sessions));
        }
      });
    }

    console.log('Sync from Supabase completed');
  } catch (error) {
    console.error('Failed to sync from Supabase:', error);
  }
};
