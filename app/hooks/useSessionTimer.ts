/**
 * useSessionTimer Hook
 *
 * Simple session timer that counts seconds.
 */

import { useState, useEffect, useRef } from 'react';

export const useSessionTimer = (isActive: boolean) => {
  const [sessionTime, setSessionTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setSessionTime(0);
      return;
    }

    timerRef.current = setInterval(() => {
      setSessionTime((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    sessionTime,
    formattedTime: formatTime(sessionTime),
  };
};
