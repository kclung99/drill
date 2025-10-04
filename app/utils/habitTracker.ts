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

const HABIT_STORAGE_KEY = 'drill-habit-data';
const DEFAULT_SETTINGS: HabitSettings = {
  musicDailyTarget: 2,
  drawingDailyTarget: 2
};

export const getHabitData = (): HabitData => {
  if (typeof window === 'undefined') {
    return { settings: DEFAULT_SETTINGS, days: [] };
  }

  try {
    const stored = localStorage.getItem(HABIT_STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        settings: { ...DEFAULT_SETTINGS, ...data.settings },
        days: data.days || []
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
    localStorage.setItem(HABIT_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving habit data:', error);
  }
};

export const updateHabitSettings = (settings: HabitSettings): void => {
  const data = getHabitData();
  data.settings = settings;
  saveHabitData(data);
};

export const incrementSession = (type: 'music' | 'drawing'): void => {
  const data = getHabitData();
  const today = new Date().toISOString().split('T')[0];

  let dayData = data.days.find(d => d.date === today);
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
  return data.days.find(d => d.date === date) || {
    date,
    musicSessions: 0,
    drawingSessions: 0
  };
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