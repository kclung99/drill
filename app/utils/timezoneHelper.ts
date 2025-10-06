/**
 * Timezone Helper
 *
 * Provides timezone functions based on user settings
 */

/**
 * Get timezone string from offset
 */
const getTimezoneFromOffset = (offset: number): string => {
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

  return offsetMap[offset.toString()] || 'America/Chicago';
};

/**
 * Get settings from localStorage (client-side only)
 */
const getSettingsFromStorage = () => {
  if (typeof window === 'undefined') {
    return { timezoneOffset: -6 }; // Default for SSR
  }

  try {
    const stored = localStorage.getItem('drill-user-settings');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors
  }

  return { timezoneOffset: -6 }; // Default
};

/**
 * Get the user's configured timezone string
 */
export const getUserTimezone = (): string => {
  const settings = getSettingsFromStorage();
  return getTimezoneFromOffset(settings.timezoneOffset);
};

/**
 * Get today's date in user's timezone as YYYY-MM-DD
 */
export const getTodayInUserTimezone = (): string => {
  const timezone = getUserTimezone();
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
};

/**
 * Format a timestamp in user's timezone
 */
export const formatDateInUserTimezone = (date: Date): string => {
  const timezone = getUserTimezone();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};
