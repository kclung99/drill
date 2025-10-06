'use client';

import { useState, useEffect } from 'react';
import { getDrawingSessions, DrawingSession } from '@/app/services/localStorageService';
import { getUserTimezone, getTodayInUserTimezone, formatDateInUserTimezone } from '@/app/utils/timezoneHelper';

export default function RecentDrawingSessions() {
  const [sessions, setSessions] = useState<DrawingSession[]>([]);

  useEffect(() => {
    const allSessions = getDrawingSessions();
    // Get last 3 sessions, sorted by timestamp descending
    const recent = allSessions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3);
    setSessions(recent);
  }, []);

  if (sessions.length === 0) {
    return null;
  }

  const formatTimestamp = (timestamp: number) => {
    const timezone = getUserTimezone();
    const date = new Date(timestamp);

    // Get today's date in the user's timezone
    const todayInTZ = getTodayInUserTimezone();
    const sessionDateInTZ = formatDateInUserTimezone(date);

    const isToday = todayInTZ === sessionDateInTZ;

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }

    return date.toLocaleDateString('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatDuration = (duration: number | 'inf') => {
    if (duration === 'inf') {
      return 'inf';
    }
    return `${duration}s`;
  };

  return (
    <div className="mt-8 w-full max-w-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-300">
            <th className="pb-2 font-normal">time</th>
            <th className="pb-2 font-normal">parts</th>
            <th className="pb-2 font-normal">duration</th>
            <th className="pb-2 font-normal">refs</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id} className="border-b border-gray-200">
              <td className="py-2 text-gray-600">{formatTimestamp(session.timestamp)}</td>
              <td className="py-2 text-gray-600">{session.config.category}</td>
              <td className="py-2 text-gray-600">{formatDuration(session.config.duration)}</td>
              <td className="py-2 text-gray-600">{session.config.imageCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
