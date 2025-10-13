/**
 * Heatmap Service
 *
 * Calculates heatmap data from practice sessions.
 * Heatmap is always derived (never stored) to avoid sync conflicts.
 */

import { getChordSessions, getDrawingSessions } from './sessionDataService';
import { formatDateInUserTimezone } from '@/app/utils/timezoneHelper';

// ============================================================================
// Types
// ============================================================================

export interface DayHeatmapData {
  date: string; // YYYY-MM-DD
  musicSessions: number;
  drawingSessions: number;
  status: 'none' | 'music' | 'drawing' | 'both';
}

export interface HeatmapSettings {
  musicDailyTarget: number;
  drawingDailyTarget: number;
}

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS: HeatmapSettings = {
  musicDailyTarget: 2,
  drawingDailyTarget: 2,
};

// ============================================================================
// Heatmap Calculation
// ============================================================================

/**
 * Calculate heatmap from all sessions in localStorage
 * Filters sessions based on validation settings
 */
export const calculateHeatmap = async (
  settings: HeatmapSettings = DEFAULT_SETTINGS
): Promise<DayHeatmapData[]> => {
  // Get validation thresholds
  const { fetchSettings } = await import('./settingsService');
  const validationSettings = await fetchSettings();

  const chordSessions = getChordSessions();
  const drawingSessions = getDrawingSessions();

  // Aggregate sessions by date
  const dayMap = new Map<string, { music: number; drawing: number }>();

  // Count chord sessions (music)
  chordSessions.forEach(session => {
    // Only count valid sessions
    if (session.config.duration >= validationSettings.minMusicDurationMinutes) {
      const date = formatDateInUserTimezone(new Date(session.timestamp));
      const existing = dayMap.get(date) || { music: 0, drawing: 0 };
      existing.music++;
      dayMap.set(date, existing);
    }
  });

  // Count drawing sessions
  drawingSessions.forEach(session => {
    // Only count valid sessions
    const meetsRefThreshold = session.config.imageCount >= validationSettings.minDrawingRefs;
    const meetsDurationThreshold =
      session.config.duration !== 'inf' &&
      session.config.duration >= validationSettings.minDrawingDurationSeconds;

    if (meetsRefThreshold && meetsDurationThreshold) {
      const date = formatDateInUserTimezone(new Date(session.timestamp));
      const existing = dayMap.get(date) || { music: 0, drawing: 0 };
      existing.drawing++;
      dayMap.set(date, existing);
    }
  });

  // Convert to array with status
  const heatmapData: DayHeatmapData[] = Array.from(dayMap.entries()).map(([date, counts]) => {
    const musicComplete = counts.music >= settings.musicDailyTarget;
    const drawingComplete = counts.drawing >= settings.drawingDailyTarget;

    let status: 'none' | 'music' | 'drawing' | 'both' = 'none';
    if (musicComplete && drawingComplete) status = 'both';
    else if (musicComplete) status = 'music';
    else if (drawingComplete) status = 'drawing';

    return {
      date,
      musicSessions: counts.music,
      drawingSessions: counts.drawing,
      status,
    };
  });

  // Sort by date
  heatmapData.sort((a, b) => a.date.localeCompare(b.date));

  return heatmapData;
};

/**
 * Get heatmap data for a specific date
 */
export const getHeatmapForDate = async (
  date: string,
  settings: HeatmapSettings = DEFAULT_SETTINGS
): Promise<DayHeatmapData> => {
  const heatmap = await calculateHeatmap(settings);
  const dayData = heatmap.find(d => d.date === date);

  if (dayData) {
    return dayData;
  }

  // Return empty day if no data
  return {
    date,
    musicSessions: 0,
    drawingSessions: 0,
    status: 'none',
  };
};

/**
 * Get heatmap data for today
 */
export const getTodayHeatmap = async (
  settings: HeatmapSettings = DEFAULT_SETTINGS
): Promise<DayHeatmapData> => {
  const { getTodayInUserTimezone } = await import('@/app/utils/timezoneHelper');
  const today = getTodayInUserTimezone();
  return getHeatmapForDate(today, settings);
};

/**
 * Calculate completion status for a day
 */
export const calculateDayStatus = (
  musicSessions: number,
  drawingSessions: number,
  settings: HeatmapSettings = DEFAULT_SETTINGS
): 'none' | 'music' | 'drawing' | 'both' => {
  const musicComplete = musicSessions >= settings.musicDailyTarget;
  const drawingComplete = drawingSessions >= settings.drawingDailyTarget;

  if (musicComplete && drawingComplete) return 'both';
  if (musicComplete) return 'music';
  if (drawingComplete) return 'drawing';
  return 'none';
};

/**
 * Generate dates for heatmap grid (GitHub-style, current year)
 */
export const generateHeatmapDates = (): string[] => {
  const { getUserTimezone, formatDateInUserTimezone } = require('@/app/utils/timezoneHelper');
  const timezone = getUserTimezone();
  const dates: string[] = [];

  // Get current year in user timezone
  const now = new Date();
  const currentYear = parseInt(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
    }).format(now)
  );

  // Start from January 1st
  const startDate = new Date(currentYear, 0, 1);

  // Find Sunday before or on Jan 1st
  const startDay = startDate.getDay();
  const adjustedStart = new Date(startDate);
  adjustedStart.setDate(startDate.getDate() - startDay);

  // Generate 53 weeks (371 days)
  for (let i = 0; i < 53 * 7; i++) {
    const date = new Date(adjustedStart);
    date.setDate(adjustedStart.getDate() + i);
    const dateStr = formatDateInUserTimezone(date);
    dates.push(dateStr);
  }

  return dates;
};

/**
 * Get month labels for heatmap grid
 */
export const getMonthLabels = (): { month: string; startIndex: number }[] => {
  const dates = generateHeatmapDates();
  const monthLabels: { month: string; startIndex: number }[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let currentMonth = -1;

  dates.forEach((dateStr, index) => {
    const date = new Date(dateStr);
    const month = date.getMonth();

    // Only label if early in month
    if (month !== currentMonth && date.getDate() <= 7) {
      currentMonth = month;
      monthLabels.push({
        month: months[month],
        startIndex: Math.floor(index / 7), // Column index
      });
    }
  });

  return monthLabels;
};
