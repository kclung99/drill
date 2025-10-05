/**
 * Habit Tracker Utility
 *
 * Now uses the centralized localStorage service and queues
 * habit sessions for Supabase sync when user is logged in.
 */

import {
  getHabitData,
  saveHabitData,
  getDayData,
  incrementSession as incrementSessionLS,
  HabitSettings,
  DayHabitData,
  HabitData,
} from '@/app/services/localStorageService';

// Re-export types for backward compatibility
export type { HabitSettings, DayHabitData, HabitData };

// Re-export functions that don't need modification
export { getHabitData, saveHabitData, getDayData };

// Hardcoded settings (as per new design)
const DEFAULT_SETTINGS: HabitSettings = {
  musicDailyTarget: 2,
  drawingDailyTarget: 2,
};

export const updateHabitSettings = (settings: HabitSettings): void => {
  const data = getHabitData();
  data.settings = settings;
  saveHabitData(data);
};

const getTodayInTimezone = (): string => {
  const timezone = process.env.NEXT_PUBLIC_TIMEZONE || 'America/Chicago';
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now); // Returns YYYY-MM-DD
};

/**
 * Increment session counter and queue for Supabase sync
 * This is the main entry point for tracking sessions
 */
export const incrementSession = (type: 'music' | 'drawing'): void => {
  const today = getTodayInTimezone();

  // 1. Write to localStorage (immediate, synchronous)
  incrementSessionLS(type);

  // 2. Queue for Supabase sync (async, background)
  // Dynamic import to avoid circular dependencies
  if (typeof window !== 'undefined') {
    import('@/app/services/supabaseSyncService').then(({ queueHabitSession }) => {
      queueHabitSession(type, today);
    });
  }
};

export const getHabitStatus = (dayData: DayHabitData, settings: HabitSettings): 'none' | 'music' | 'drawing' | 'both' => {
  const musicComplete = dayData.musicSessions >= settings.musicDailyTarget;
  const drawingComplete = dayData.drawingSessions >= settings.drawingDailyTarget;

  if (musicComplete && drawingComplete) return 'both';
  if (musicComplete) return 'music';
  if (drawingComplete) return 'drawing';
  return 'none';
};

export const generateDatesForHeatmap = (): string[] => {
  const dates: string[] = [];
  const today = new Date();
  const currentYear = today.getFullYear();

  // Start from January 1st of current year
  const startDate = new Date(currentYear, 0, 1);

  // Find the Sunday before or on January 1st to align with GitHub's grid
  const startDay = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const adjustedStart = new Date(startDate);
  adjustedStart.setDate(startDate.getDate() - startDay);

  // Generate 53 weeks worth of dates (371 days) to cover full year
  for (let i = 0; i < 53 * 7; i++) {
    const date = new Date(adjustedStart);
    date.setDate(adjustedStart.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
};

export const getMonthLabels = (): { month: string; startIndex: number }[] => {
  const dates = generateDatesForHeatmap();
  const monthLabels: { month: string; startIndex: number }[] = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let currentMonth = -1;

  dates.forEach((dateStr, index) => {
    const date = new Date(dateStr);
    const month = date.getMonth();

    if (month !== currentMonth && date.getDate() <= 7) { // Only label if it's early in the month
      currentMonth = month;
      monthLabels.push({
        month: months[month],
        startIndex: Math.floor(index / 7) // Column index
      });
    }
  });

  return monthLabels;
};