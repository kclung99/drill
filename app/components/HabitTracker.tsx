'use client';

import { useState, useEffect } from 'react';
import {
  getHabitData,
  getDayData,
  getHabitStatus,
  generateDatesForHeatmap,
  HabitData
} from '../utils/habitTracker';

type FilterMode = 'combined' | 'music' | 'drawing';

export default function HabitTracker() {
  const [habitData, setHabitData] = useState<HabitData>({
    settings: { musicDailyTarget: 2, drawingDailyTarget: 2 },
    days: []
  });
  const [filterMode, setFilterMode] = useState<FilterMode>('combined');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const data = getHabitData();
    setHabitData(data);
  }, []);

  const getIntensityClass = (dayData: { date: string; musicSessions: number; drawingSessions: number }) => {
    const musicComplete = dayData.musicSessions >= 2;
    const drawingComplete = dayData.drawingSessions >= 2;

    if (filterMode === 'music') {
      return musicComplete ? 'bg-blue-500' : 'bg-gray-100';
    }

    if (filterMode === 'drawing') {
      return drawingComplete ? 'bg-red-500' : 'bg-gray-100';
    }

    // Combined view - simplified 3 colors
    if (musicComplete && drawingComplete) return 'bg-purple-500'; // Both
    if (musicComplete) return 'bg-blue-500'; // Music only
    if (drawingComplete) return 'bg-red-500'; // Drawing only
    return 'bg-gray-100'; // None
  };

  // Only calculate these on client to avoid hydration mismatch
  const dates = isClient ? generateDatesForHeatmap() : [];
  const today = isClient ? new Date().toISOString().split('T')[0] : '';
  const todayData = isClient ? getDayData(today) : { date: '', musicSessions: 0, drawingSessions: 0 };
  const currentYear = isClient ? new Date().getFullYear() : 2025;

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
        <div className="flex gap-4 text-sm">
          <div>
            <span className="font-medium text-black">music:</span>
            <span className="text-gray-500 ml-1">
              {todayData.musicSessions}/2
            </span>
          </div>
          <div>
            <span className="font-medium text-black">drawing:</span>
            <span className="text-gray-500 ml-1">
              {todayData.drawingSessions}/2
            </span>
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
                  const dayData = getDayData(date);
                  const isToday = date === today;
                  const currentYearDate = new Date(date).getFullYear() === currentYear;

                  return (
                    <div
                      key={date}
                      className={`
                        w-3 h-3 rounded-none transition-all hover:ring-2 hover:ring-gray-400
                        ${currentYearDate ? getIntensityClass(dayData) : 'bg-gray-50'}
                        ${isToday ? 'ring-2 ring-blue-400' : ''}
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