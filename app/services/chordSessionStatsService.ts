import { supabase } from '@/app/lib/supabase';

export interface ChordSessionStats {
  pbEffectiveChords: number;
  percentile: number; // 0-100, where 100 is best
  totalSessions: number;
  betterThanCount: number;
}

export interface SessionConfig {
  durationMinutes: number;
  mode: 'chordTypes' | 'scales';
  chordTypes?: string[];
  scales?: string[];
  includeInversions: boolean;
}

interface SupabaseSession {
  effective_chords: number;
  total_chords: number;
  accuracy: number;
  created_at: string;
}

/**
 * Fetches last 20 sessions with matching config from Supabase
 */
export async function fetchMatchingSessions(config: SessionConfig): Promise<SupabaseSession[]> {

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  let query = supabase
    .from('chord_practice_sessions')
    .select('effective_chords, total_chords, accuracy, created_at')
    .eq('user_id', user.id)
    .eq('duration_minutes', config.durationMinutes)
    .eq('mode', config.mode)
    .eq('include_inversions', config.includeInversions)
    .order('created_at', { ascending: false })
    .limit(20);

  // Filter by chord_types or scales depending on mode
  if (config.mode === 'chordTypes' && config.chordTypes) {
    query = query.contains('chord_types', config.chordTypes);
  } else if (config.mode === 'scales' && config.scales) {
    query = query.contains('scales', config.scales);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }

  return data || [];
}

/**
 * Calculate stats from sessions: PB and percentile
 */
export function calculateSessionStats(
  currentEffectiveChords: number,
  sessions: SupabaseSession[]
): ChordSessionStats {
  if (sessions.length === 0) {
    return {
      pbEffectiveChords: currentEffectiveChords,
      percentile: 100,
      totalSessions: 0,
      betterThanCount: 0,
    };
  }

  const effectiveChordsValues = sessions.map(s => s.effective_chords);
  const pbEffectiveChords = Math.max(...effectiveChordsValues);

  // Calculate how many sessions current performance beats
  const betterThanCount = effectiveChordsValues.filter(
    val => currentEffectiveChords >= val
  ).length;

  // Percentile: higher is better (100 = best, 0 = worst)
  const percentile = sessions.length > 0
    ? Math.round((betterThanCount / sessions.length) * 100)
    : 100;

  return {
    pbEffectiveChords,
    percentile,
    totalSessions: sessions.length,
    betterThanCount,
  };
}

/**
 * Project final effective chords based on current pace
 */
export function projectFinalScore(
  currentEffectiveChords: number,
  elapsedMinutes: number,
  totalMinutes: number
): number {
  if (elapsedMinutes === 0) return 0;
  const pace = currentEffectiveChords / elapsedMinutes;
  return parseFloat((pace * totalMinutes).toFixed(2));
}
