/**
 * User Settings Service
 *
 * Manages user preferences for heatmap targets, session validation, and timezone.
 * Guest users use localStorage defaults, logged-in users sync to Supabase.
 */

import { supabase } from '@/app/lib/supabase';
import { pullAndReplaceSingle } from './syncUtils';

// ============================================================================
// Types
// ============================================================================

export interface UserSettings {
  // Heatmap daily targets
  musicDailyTarget: number;
  drawingDailyTarget: number;

  // Session validation thresholds
  minMusicDurationMinutes: number;
  minDrawingRefs: number;
  minDrawingDurationSeconds: number;

  // Timezone (UTC offset in hours)
  timezoneOffset: number;
}

interface UserSettingsRow {
  user_id: string;
  music_daily_target: number;
  drawing_daily_target: number;
  min_music_duration_minutes: number;
  min_drawing_refs: number;
  min_drawing_duration_seconds: number;
  timezone_offset: number;
}

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS: UserSettings = {
  musicDailyTarget: 2,
  drawingDailyTarget: 2,
  minMusicDurationMinutes: 10,
  minDrawingRefs: 10,
  minDrawingDurationSeconds: 60,
  timezoneOffset: -6, // Chicago (UTC-6)
};

const STORAGE_KEY = 'drill-user-settings';

// ============================================================================
// localStorage Functions (for guest users and caching)
// ============================================================================

export const getSettingsFromLocalStorage = (): UserSettings => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Error loading settings from localStorage:', error);
  }

  return DEFAULT_SETTINGS;
};

export const saveSettingsToLocalStorage = (settings: UserSettings): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
};

// ============================================================================
// Supabase Functions (for logged-in users)
// ============================================================================

/**
 * Fetch user settings - always uses localStorage first (fast, no auth required)
 * Only call fetchSettingsFromSupabase() explicitly when you need to sync from server
 */
export const fetchSettings = async (): Promise<UserSettings> => {
  // Always use localStorage - fast and works offline
  return getSettingsFromLocalStorage();
};

/**
 * Fetch user settings from Supabase and update localStorage cache
 * Only call this explicitly when you need fresh data from server (e.g., settings page)
 */
export const fetchSettingsFromSupabase = async (): Promise<UserSettings> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Guest user - use localStorage
    return getSettingsFromLocalStorage();
  }

  try {
    return await pullAndReplaceSingle<UserSettings>(
      'user_settings',
      STORAGE_KEY,
      user.id,
      rowToSettings,
      DEFAULT_SETTINGS
    );
  } catch (error) {
    console.error('Error fetching settings:', error);
    // Fallback to localStorage or defaults
    return getSettingsFromLocalStorage();
  }
};

/**
 * Update user settings in Supabase and localStorage
 * Uses upsert to insert if doesn't exist, update if it does
 */
export const updateSettings = async (settings: Partial<UserSettings>): Promise<UserSettings> => {
  const { data: { user } } = await supabase.auth.getUser();

  // Get current settings
  const current = await fetchSettings();
  const updated = { ...current, ...settings };

  // Always save to localStorage (immediate feedback)
  saveSettingsToLocalStorage(updated);

  if (!user) {
    // Guest user - only localStorage
    return updated;
  }

  try {
    // Upsert in Supabase (insert if doesn't exist, update if it does)
    const row: Partial<UserSettingsRow> = {
      user_id: user.id,
      music_daily_target: updated.musicDailyTarget,
      drawing_daily_target: updated.drawingDailyTarget,
      min_music_duration_minutes: updated.minMusicDurationMinutes,
      min_drawing_refs: updated.minDrawingRefs,
      min_drawing_duration_seconds: updated.minDrawingDurationSeconds,
      timezone_offset: updated.timezoneOffset,
    };

    const { error } = await supabase
      .from('user_settings')
      .upsert(row, { onConflict: 'user_id' });

    if (error) throw error;

    return updated;
  } catch (error) {
    console.error('Error updating settings:', error);
    return updated; // Return updated localStorage version even if Supabase fails
  }
};

/**
 * Get timezone string from offset
 * This is a simplified version - for production you'd want a full timezone database
 */
export const getTimezoneFromOffset = (offset: number): string => {
  const offsetMap: Record<number, string> = {
    '-12': 'Pacific/Wake',
    '-11': 'Pacific/Samoa',
    '-10': 'Pacific/Honolulu',
    '-9': 'America/Anchorage',
    '-8': 'America/Los_Angeles',
    '-7': 'America/Denver',
    '-6': 'America/Chicago',
    '-5': 'America/New_York',
    '-4': 'America/Halifax',
    '-3': 'America/Sao_Paulo',
    '-2': 'Atlantic/South_Georgia',
    '-1': 'Atlantic/Azores',
    '0': 'UTC',
    '1': 'Europe/Paris',
    '2': 'Europe/Athens',
    '3': 'Europe/Moscow',
    '4': 'Asia/Dubai',
    '5': 'Asia/Karachi',
    '6': 'Asia/Dhaka',
    '7': 'Asia/Bangkok',
    '8': 'Asia/Shanghai',
    '9': 'Asia/Tokyo',
    '10': 'Australia/Sydney',
    '11': 'Pacific/Noumea',
    '12': 'Pacific/Fiji',
  };

  return (offsetMap as any)[offset.toString()] || 'America/Chicago';
};

// ============================================================================
// Helper Functions
// ============================================================================

const rowToSettings = (row: UserSettingsRow): UserSettings => ({
  musicDailyTarget: row.music_daily_target,
  drawingDailyTarget: row.drawing_daily_target,
  minMusicDurationMinutes: row.min_music_duration_minutes,
  minDrawingRefs: row.min_drawing_refs,
  minDrawingDurationSeconds: row.min_drawing_duration_seconds,
  timezoneOffset: row.timezone_offset,
});
