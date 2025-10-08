'use client';

import { useState, useEffect } from 'react';
import { getChordSessions, ChordSession } from '@/app/services/localStorageService';
import { getUserTimezone, getTodayInUserTimezone, formatDateInUserTimezone } from '@/app/utils/timezoneHelper';

export default function RecentSessions() {
  const [sessions, setSessions] = useState<ChordSession[]>([]);

  useEffect(() => {
    const allSessions = getChordSessions();
    // Get last 3 sessions, sorted by timestamp descending
    const recent = allSessions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3);
    setSessions(recent);
  }, []);

  if (sessions.length === 0) {
    return null;
  }

  const formatDateTime = (timestamp: number) => {
    const timezone = getUserTimezone();
    const date = new Date(timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr} ${timeStr}`;
  };

  return (
    <div className="mt-8 w-full max-w-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-300">
            <th className="pb-2 font-normal">time</th>
            <th className="pb-2 font-normal">duration</th>
            <th className="pb-2 font-normal">chords</th>
            <th className="pb-2 font-normal">avg</th>
            <th className="pb-2 font-normal">accuracy</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id} className="border-b border-gray-200">
              <td className="py-2 text-gray-600">{formatDateTime(session.timestamp)}</td>
              <td className="py-2 text-gray-600">{session.config.duration}min</td>
              <td className="py-2 text-gray-600">{session.metrics.totalChords}</td>
              <td className="py-2 text-gray-600">
                {session.metrics.avgTimePerChord > 0
                  ? `${session.metrics.avgTimePerChord.toFixed(1)}s`
                  : '-'}
              </td>
              <td className="py-2 text-gray-600">
                {session.metrics.accuracy > 0
                  ? `${session.metrics.accuracy.toFixed(0)}%`
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
