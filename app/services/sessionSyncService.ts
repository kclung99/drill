/**
 * Session Sync Service
 *
 * Handles synchronization between localStorage and Supabase.
 * This layer wraps sessionDataService and adds sync capabilities for logged-in users.
 */

import { supabase } from '@/app/lib/supabase';
import {
  ChordSession,
  ChordSessionConfig,
  ChordSessionMetrics,
  ChordSessionResult,
  DrawingSession,
  DrawingSessionConfig,
  DrawingSessionResults,
  saveChordSession as saveChordSessionLocal,
  saveDrawingSession as saveDrawingSessionLocal,
  getChordSessions,
  getDrawingSessions,
  mergeChordSessions,
  mergeDrawingSessions,
} from './sessionDataService';

// ============================================================================
// Types
// ============================================================================

interface ChordPracticeSessionRow {
  user_id: string;
  duration_minutes: number;
  mode: 'chordTypes' | 'scales';
  chord_types: string[] | null;
  scales: string[] | null;
  include_inversions: boolean;
  total_chords: number;
  total_attempts: number;
  accuracy: number;
  avg_time_per_chord: number;
  fastest_time: number;
  slowest_time: number;
  effective_chords: number;
  chord_results: ChordSessionResult[];
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

interface SyncQueueItem {
  id: string;
  type: 'chord' | 'drawing';
  data: ChordPracticeSessionRow | DrawingPracticeSessionRow;
  timestamp: number;
}

export interface SyncStatus {
  pending: number;
  lastSyncTime: number | null;
  error: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const SYNC_QUEUE_KEY = 'drill-sync-queue';
const LAST_SYNC_KEY = 'drill-last-sync';

// ============================================================================
// High-Level API (Used by Components)
// ============================================================================

/**
 * Save a chord session - works for both guest and logged users
 */
export const saveChordSession = async (
  config: ChordSessionConfig,
  metrics: ChordSessionMetrics,
  results: ChordSessionResult[]
): Promise<ChordSession> => {
  // 1. Save to localStorage immediately (guest + logged)
  const session = saveChordSessionLocal(config, metrics, results);

  // 2. Queue for Supabase sync (logged users only)
  const { data: { session: authSession } } = await supabase.auth.getSession();
  if (authSession?.user) {
    queueChordSession(session);
  }

  return session;
};

/**
 * Save a drawing session - works for both guest and logged users
 */
export const saveDrawingSession = async (
  config: DrawingSessionConfig,
  results: DrawingSessionResults
): Promise<DrawingSession> => {
  // 1. Save to localStorage immediately (guest + logged)
  const session = saveDrawingSessionLocal(config, results);

  // 2. Queue for Supabase sync (logged users only)
  const { data: { session: authSession } } = await supabase.auth.getSession();
  if (authSession?.user) {
    queueDrawingSession(session);
  }

  return session;
};

/**
 * Perform full sync: push queued items, pull new items
 * Called by background sync hook
 */
export const performSync = async (): Promise<SyncStatus> => {
  const { data: { session: authSession } } = await supabase.auth.getSession();

  if (!authSession?.user) {
    return {
      pending: 0,
      lastSyncTime: null,
      error: 'Not logged in',
    };
  }

  const user = authSession.user;

  try {
    // 1. Push queued items to Supabase
    await pushQueuedSessions(user.id);

    // 2. Pull new items from Supabase (commented out to prevent double-counting)
    // await pullNewSessions(user.id);

    // 3. Update last sync time
    const now = Date.now();
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_SYNC_KEY, now.toString());
    }

    return {
      pending: 0,
      lastSyncTime: now,
      error: null,
    };
  } catch (error) {
    console.error('Sync failed:', error);
    return {
      pending: getSyncQueue().length,
      lastSyncTime: getLastSyncTime(),
      error: error instanceof Error ? error.message : 'Unknown sync error',
    };
  }
};

/**
 * Get current sync status
 */
export const getSyncStatus = (): SyncStatus => {
  return {
    pending: getSyncQueue().length,
    lastSyncTime: getLastSyncTime(),
    error: null,
  };
};

// ============================================================================
// Queue Management (Internal)
// ============================================================================

function getSyncQueue(): SyncQueueItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading sync queue:', error);
  }

  return [];
}

function addToQueue(item: SyncQueueItem): void {
  const queue = getSyncQueue();
  queue.push(item);

  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Error adding to sync queue:', error);
  }
}

function clearQueue(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify([]));
}

function getLastSyncTime(): number | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem(LAST_SYNC_KEY);
  return stored ? parseInt(stored, 10) : null;
}

function queueChordSession(session: ChordSession): void {
  const row: ChordPracticeSessionRow = {
    user_id: '', // Will be filled during push
    duration_minutes: session.config.duration,
    mode: session.config.mode,
    chord_types: session.config.mode === 'chordTypes' ? session.config.chordTypes : null,
    scales: session.config.mode === 'scales' ? session.config.scales : null,
    include_inversions: session.config.includeInversions,
    total_chords: session.metrics.totalChords,
    total_attempts: session.metrics.totalAttempts,
    accuracy: session.metrics.accuracy,
    avg_time_per_chord: session.metrics.avgTimePerChord,
    fastest_time: session.metrics.fastestTime,
    slowest_time: session.metrics.slowestTime,
    effective_chords: session.metrics.effectiveChords,
    chord_results: session.chordResults,
  };

  addToQueue({
    id: session.id,
    type: 'chord',
    data: row,
    timestamp: session.timestamp,
  });
}

function queueDrawingSession(session: DrawingSession): void {
  const row: DrawingPracticeSessionRow = {
    user_id: '', // Will be filled during push
    duration_seconds: session.config.duration === 'inf' ? null : session.config.duration,
    image_count: session.config.imageCount,
    category: session.config.category,
    gender: session.config.gender,
    clothing: session.config.clothing,
    always_generate_new: session.config.alwaysGenerateNew,
    images_completed: session.results.imagesCompleted,
    total_time_seconds: session.results.totalTimeSeconds,
  };

  addToQueue({
    id: session.id,
    type: 'drawing',
    data: row,
    timestamp: session.timestamp,
  });
}

// ============================================================================
// Push Functions (Internal)
// ============================================================================

async function pushQueuedSessions(userId: string): Promise<void> {
  const queue = getSyncQueue();

  if (queue.length === 0) return;

  const chordItems = queue.filter(item => item.type === 'chord');
  const drawingItems = queue.filter(item => item.type === 'drawing');

  // Push chord sessions
  if (chordItems.length > 0) {
    const rows = chordItems.map(item => ({
      ...(item.data as ChordPracticeSessionRow),
      user_id: userId,
    }));

    const { error } = await supabase
      .from('chord_practice_sessions')
      .insert(rows);

    if (error) {
      console.error('Error pushing chord sessions:', error);
      throw error;
    }
  }

  // Push drawing sessions
  if (drawingItems.length > 0) {
    const rows = drawingItems.map(item => ({
      ...(item.data as DrawingPracticeSessionRow),
      user_id: userId,
    }));

    const { error } = await supabase
      .from('drawing_practice_sessions')
      .insert(rows);

    if (error) {
      console.error('Error pushing drawing sessions:', error);
      throw error;
    }
  }

  // Clear queue after successful push
  clearQueue();
}

// ============================================================================
// Pull Functions (Internal)
// ============================================================================

async function pullNewSessions(userId: string): Promise<void> {
  const lastSyncTime = getLastSyncTime();
  const sinceTimestamp = lastSyncTime
    ? new Date(lastSyncTime).toISOString()
    : new Date(0).toISOString(); // Pull all if first sync

  // Pull chord sessions
  let chordQuery = supabase
    .from('chord_practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .gt('created_at', sinceTimestamp)
    .order('created_at', { ascending: true });

  const { data: chordRows, error: chordError } = await chordQuery;

  if (chordError) {
    console.error('Error pulling chord sessions:', chordError);
    throw chordError;
  }

  if (chordRows && chordRows.length > 0) {
    const sessions: ChordSession[] = chordRows.map(row => ({
      id: `supabase-chord-${row.id}`,
      config: {
        duration: row.duration_minutes,
        mode: row.mode as 'chordTypes' | 'scales',
        chordTypes: row.chord_types || [],
        scales: row.scales || [],
        includeInversions: row.include_inversions || false,
      },
      metrics: {
        totalChords: row.total_chords,
        totalAttempts: row.total_attempts,
        accuracy: parseFloat(row.accuracy?.toString() || '0'),
        avgTimePerChord: parseFloat(row.avg_time_per_chord?.toString() || '0'),
        fastestTime: parseFloat(row.fastest_time?.toString() || '0'),
        slowestTime: parseFloat(row.slowest_time?.toString() || '0'),
        effectiveChords: parseFloat(row.effective_chords?.toString() || '0'),
      },
      chordResults: (row.chord_results as ChordSessionResult[]) || [],
      timestamp: new Date(row.created_at).getTime(),
    }));

    mergeChordSessions(sessions);
  }

  // Pull drawing sessions
  let drawingQuery = supabase
    .from('drawing_practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .gt('created_at', sinceTimestamp)
    .order('created_at', { ascending: true });

  const { data: drawingRows, error: drawingError } = await drawingQuery;

  if (drawingError) {
    console.error('Error pulling drawing sessions:', drawingError);
    throw drawingError;
  }

  if (drawingRows && drawingRows.length > 0) {
    const sessions: DrawingSession[] = drawingRows.map(row => ({
      id: `supabase-drawing-${row.id}`,
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
    }));

    mergeDrawingSessions(sessions);
  }
}

// ============================================================================
// Migration Function (One-time on first login)
// ============================================================================

export const migrateGuestSessions = async (): Promise<void> => {
  const { data: { session: authSession } } = await supabase.auth.getSession();

  if (!authSession?.user) {
    throw new Error('User not logged in');
  }

  const user = authSession.user;

  // Check if already migrated - use user-specific key to prevent cross-contamination
  const migrationKey = `drill-migrated-${user.id}`;
  const migrated = localStorage.getItem(migrationKey);
  if (migrated === 'true') {
    console.log('Sessions already migrated for this user');
    return;
  }

  try {
    // Get all local sessions
    const chordSessions = getChordSessions();
    const drawingSessions = getDrawingSessions();

    console.log(`Migrating ${chordSessions.length} chord sessions and ${drawingSessions.length} drawing sessions`);

    // Push chord sessions
    if (chordSessions.length > 0) {
      const rows: ChordPracticeSessionRow[] = chordSessions.map(session => ({
        user_id: user.id,
        duration_minutes: session.config.duration,
        mode: session.config.mode,
        chord_types: session.config.mode === 'chordTypes' ? session.config.chordTypes : null,
        scales: session.config.mode === 'scales' ? session.config.scales : null,
        include_inversions: session.config.includeInversions,
        total_chords: session.metrics.totalChords,
        total_attempts: session.metrics.totalAttempts,
        accuracy: session.metrics.accuracy,
        avg_time_per_chord: session.metrics.avgTimePerChord,
        fastest_time: session.metrics.fastestTime,
        slowest_time: session.metrics.slowestTime,
        effective_chords: session.metrics.effectiveChords,
        chord_results: session.chordResults,
      }));

      const { error } = await supabase
        .from('chord_practice_sessions')
        .insert(rows);

      if (error) throw error;
    }

    // Push drawing sessions
    if (drawingSessions.length > 0) {
      const rows: DrawingPracticeSessionRow[] = drawingSessions.map(session => ({
        user_id: user.id,
        duration_seconds: session.config.duration === 'inf' ? null : session.config.duration,
        image_count: session.config.imageCount,
        category: session.config.category,
        gender: session.config.gender,
        clothing: session.config.clothing,
        always_generate_new: session.config.alwaysGenerateNew,
        images_completed: session.results.imagesCompleted,
        total_time_seconds: session.results.totalTimeSeconds,
      }));

      const { error } = await supabase
        .from('drawing_practice_sessions')
        .insert(rows);

      if (error) throw error;
    }

    // Mark as migrated with user-specific key
    localStorage.setItem(migrationKey, 'true');
    // Also set legacy key for backward compat
    localStorage.setItem('drill-migrated', 'true');
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};
