/**
 * Session Sync Service
 *
 * Simple sync between localStorage and Supabase:
 * - Save: Write to localStorage immediately, sync to Supabase if logged in
 * - Pull: On first login, pull all historical data from Supabase
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

export interface SyncStatus {
  lastSyncTime: number | null;
  error: string | null;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Save chord session to localStorage and sync to Supabase if logged in
 */
export const saveChordSession = async (
  config: ChordSessionConfig,
  metrics: ChordSessionMetrics,
  results: ChordSessionResult[]
): Promise<ChordSession> => {
  const session = saveChordSessionLocal(config, metrics, results);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await syncChordSessionToSupabase(session, user.id);
    }
  } catch (error) {
    // Silently fail - session saved to localStorage
  }

  return session;
};

/**
 * Save drawing session to localStorage and sync to Supabase if logged in
 */
export const saveDrawingSession = async (
  config: DrawingSessionConfig,
  results: DrawingSessionResults
): Promise<DrawingSession> => {
  const session = saveDrawingSessionLocal(config, results);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await syncDrawingSessionToSupabase(session, user.id);
    }
  } catch (error) {
    // Silently fail - session saved to localStorage
  }

  return session;
};

/**
 * Pull historical data from Supabase on first login
 */
export const performSync = async (): Promise<SyncStatus> => {
  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();

    if (!authSession?.user) {
      return { lastSyncTime: null, error: 'Not logged in' };
    }

    const userId = authSession.user.id;
    const lastSyncTime = getLastSyncTime(userId);

    // Only pull on first sync
    if (lastSyncTime === null) {
      console.log('First login - pulling historical data from Supabase');
      await pullAllSessions(userId);
    }

    // Update last sync time
    const now = Date.now();
    if (typeof window !== 'undefined') {
      localStorage.setItem(`drill-last-sync-${userId}`, now.toString());
    }

    return { lastSyncTime: now, error: null };
  } catch (error) {
    console.error('Sync failed:', error);
    return {
      lastSyncTime: null,
      error: error instanceof Error ? error.message : 'Unknown sync error',
    };
  }
};

export const getSyncStatus = (): SyncStatus => {
  return { lastSyncTime: getLastSyncTime(), error: null };
};

// ============================================================================
// Internal Functions
// ============================================================================

async function syncChordSessionToSupabase(session: ChordSession, userId: string): Promise<void> {
  const row: ChordPracticeSessionRow = {
    user_id: userId,
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

  const { data, error } = await supabase
    .from('chord_practice_sessions')
    .insert([row])
    .select('id')
    .single();

  if (error) throw error;

  // Update local ID to match Supabase UUID
  if (data) {
    const sessions = getChordSessions();
    const sessionIndex = sessions.findIndex(s => s.id === session.id);
    if (sessionIndex >= 0) {
      sessions[sessionIndex].id = data.id;
      localStorage.setItem('drill-chord-sessions', JSON.stringify(sessions));
    }
  }
}

async function syncDrawingSessionToSupabase(session: DrawingSession, userId: string): Promise<void> {
  const row: DrawingPracticeSessionRow = {
    user_id: userId,
    duration_seconds: session.config.duration === 'inf' ? null : session.config.duration,
    image_count: session.config.imageCount,
    category: session.config.category,
    gender: session.config.gender,
    clothing: session.config.clothing,
    always_generate_new: session.config.alwaysGenerateNew,
    images_completed: session.results.imagesCompleted,
    total_time_seconds: session.results.totalTimeSeconds,
  };

  const { data, error } = await supabase
    .from('drawing_practice_sessions')
    .insert([row])
    .select('id')
    .single();

  if (error) throw error;

  // Update local ID to match Supabase UUID
  if (data) {
    const sessions = getDrawingSessions();
    const sessionIndex = sessions.findIndex(s => s.id === session.id);
    if (sessionIndex >= 0) {
      sessions[sessionIndex].id = data.id;
      localStorage.setItem('drill-drawing-sessions', JSON.stringify(sessions));
    }
  }
}

async function pullAllSessions(userId: string): Promise<void> {
  // Pull all chord sessions
  const { data: chordRows, error: chordError } = await supabase
    .from('chord_practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (chordError) throw chordError;

  if (chordRows && chordRows.length > 0) {
    const sessions: ChordSession[] = chordRows.map(row => ({
      id: row.id,
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

  // Pull all drawing sessions
  const { data: drawingRows, error: drawingError } = await supabase
    .from('drawing_practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (drawingError) throw drawingError;

  if (drawingRows && drawingRows.length > 0) {
    const sessions: DrawingSession[] = drawingRows.map(row => ({
      id: row.id,
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

function getLastSyncTime(userId?: string): number | null {
  if (typeof window === 'undefined') return null;

  if (userId) {
    const stored = localStorage.getItem(`drill-last-sync-${userId}`);
    if (stored) return parseInt(stored, 10);
  }

  // Legacy fallback
  const legacyStored = localStorage.getItem('drill-last-sync');
  return legacyStored ? parseInt(legacyStored, 10) : null;
}
