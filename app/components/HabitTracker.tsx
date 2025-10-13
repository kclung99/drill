'use client';

import { useState, useEffect } from 'react';
import { fetchSettings, UserSettings } from '@/app/services/settingsService';
import { getUserTimezone, getTodayInUserTimezone } from '@/app/utils/timezoneHelper';
import {
  calculateHeatmap,
  getHeatmapForDate,
  getTodayHeatmap,
  generateHeatmapDates,
  DayHeatmapData
} from '@/app/services/heatmapService';

type FilterMode = 'combined' | 'music' | 'drawing';

export default function HabitTracker() {
  const [heatmapData, setHeatmapData] = useState<DayHeatmapData[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [todayData, setTodayData] = useState<DayHeatmapData | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>('combined');
  const [isClient, setIsClient] = useState(false);

  // Load data function
  const loadData = async () => {
    const settings = await fetchSettings();
    setUserSettings(settings);

    // Calculate heatmap from sessions
    const heatmap = await calculateHeatmap({
      musicDailyTarget: settings.musicDailyTarget,
      drawingDailyTarget: settings.drawingDailyTarget,
    });
    setHeatmapData(heatmap);

    // Get today's data
    const today = await getTodayHeatmap({
      musicDailyTarget: settings.musicDailyTarget,
      drawingDailyTarget: settings.drawingDailyTarget,
    });
    setTodayData(today);
  };

  useEffect(() => {
    setIsClient(true);
    loadData();

    // Reload data after initial sync completes (wait 2s for Supabase pull)
    const reloadTimeout = setTimeout(() => {
      loadData();
    }, 2000);

    return () => clearTimeout(reloadTimeout);
  }, []);

  const getIntensityClass = (dayData: DayHeatmapData) => {
    const musicTarget = userSettings?.musicDailyTarget || 2;
    const drawingTarget = userSettings?.drawingDailyTarget || 2;
    const musicComplete = dayData.musicSessions >= musicTarget;
    const drawingComplete = dayData.drawingSessions >= drawingTarget;

    if (filterMode === 'music') {
      return musicComplete ? 'bg-gray-300' : 'border border-gray-300';
    }

    if (filterMode === 'drawing') {
      return drawingComplete ? 'bg-gray-300' : 'border border-gray-300';
    }

    // Combined view
    if (musicComplete && drawingComplete) return 'bg-black'; // Both
    if (musicComplete || drawingComplete) return 'bg-gray-300'; // Either one
    return 'border border-gray-300'; // None
  };

  const getDayDataByDate = (date: string): DayHeatmapData => {
    const found = heatmapData.find(d => d.date === date);
    if (found) return found;
    return { date, musicSessions: 0, drawingSessions: 0, status: 'none' };
  };

  // Only calculate these on client to avoid hydration mismatch
  const dates = isClient ? generateHeatmapDates() : [];
  const today = isClient ? getTodayInUserTimezone() : '';
  const currentYear = isClient ? (() => {
    const timezone = getUserTimezone();
    return parseInt(new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
    }).format(new Date()));
  })() : 2025;

  // Organize dates into weeks (columns)
  const weeks: string[][] = [];
  if (isClient) {
    for (let i = 0; i < dates.length; i += 7) {
      weeks.push(dates.slice(i, i + 7));
    }
  }

  return (
    <div className="inline-block">
      {/* Filter Controls and Today's Progress */}
      <div className="flex justify-between items-center mb-4">
        {/* Filter Controls */}
        <div className="flex gap-4 text-sm">
          <button
            onClick={() => setFilterMode('combined')}
            className={`${
              filterMode === 'combined'
                ? 'text-black underline'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            combined
          </button>
          <button
            onClick={() => setFilterMode('music')}
            className={`${
              filterMode === 'music'
                ? 'text-black underline'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            music
          </button>
          <button
            onClick={() => setFilterMode('drawing')}
            className={`${
              filterMode === 'drawing'
                ? 'text-black underline'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            drawing
          </button>
        </div>

        {/* Today's Progress */}
        <div className="flex gap-4 text-sm text-gray-500">
          <div>
            music: {todayData?.musicSessions || 0}/{userSettings?.musicDailyTarget || 2}
          </div>
          <div>
            drawing: {todayData?.drawingSessions || 0}/{userSettings?.drawingDailyTarget || 2}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="mb-4">

        {/* Heatmap grid */}
        {!isClient ? (
          <div className="flex items-center justify-center h-24 text-gray-500">
            Loading...
          </div>
        ) : (
          <div className="flex gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((date) => {
                  const dayData = getDayDataByDate(date);
                  const isToday = date === today;
                  const currentYearDate = new Date(date).getFullYear() === currentYear;

                  return (
                    <div
                      key={date}
                      className={`
                        w-3 h-3 rounded-none transition-all hover:ring-1 hover:ring-gray-400
                        ${currentYearDate ? getIntensityClass(dayData) : 'bg-gray-50'}
                        ${isToday ? 'ring-2 ring-blue-500' : ''}
                        cursor-pointer
                      `}
                      title={currentYearDate ? `${date}: ${dayData.musicSessions} music, ${dayData.drawingSessions} drawing` : date}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}