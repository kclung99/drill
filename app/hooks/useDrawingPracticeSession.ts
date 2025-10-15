/**
 * useDrawingPracticeSession Hook
 *
 * Manages drawing practice session state, timer, and persistence.
 * Extracted from drawing page to keep UI clean.
 */

import { useState, useEffect, useCallback } from 'react';
import { DrawingRefsService, DrawingRef } from '../services/drawingRefsService';

export interface DrawingSessionConfig {
  category: string;
  gender: string;
  clothing: string;
  imageCount: number;
  duration: number | 'inf';
  imageSource: 'generated' | 'references';
  alwaysGenerateNew: boolean;
}

export interface DrawingSessionMetrics {
  imagesCompleted: number;
  totalTimeSeconds: number | null;
}

export const useDrawingPracticeSession = (
  sessionConfig: DrawingSessionConfig,
  onConfigUpdate?: (config: Partial<DrawingSessionConfig>) => void
) => {
  // Session state
  const [images, setImages] = useState<DrawingRef[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionConfigSnapshot, setSessionConfigSnapshot] = useState<DrawingSessionConfig | null>(null);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Wake lock state
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  const refsService = new DrawingRefsService();

  /**
   * Wake lock management
   */
  useEffect(() => {
    if (isSessionActive) {
      // Request wake lock when session starts
      if ('wakeLock' in navigator) {
        navigator.wakeLock
          .request('screen')
          .then((lock) => {
            setWakeLock(lock);
          })
          .catch((err) => {
            console.log('Wake lock failed:', err);
          });
      }
    } else {
      // Release wake lock when session ends
      if (wakeLock) {
        wakeLock.release();
        setWakeLock(null);
      }
    }

    return () => {
      if (wakeLock) {
        wakeLock.release();
      }
    };
  }, [isSessionActive]);

  /**
   * Timer countdown (only for non-infinite sessions)
   */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (
      isSessionActive &&
      !isPaused &&
      timeRemaining > 0 &&
      sessionConfig.duration !== 'inf'
    ) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, isPaused, timeRemaining, sessionConfig.duration]);

  /**
   * Handle timer reaching 0
   */
  useEffect(() => {
    if (
      isSessionActive &&
      timeRemaining === 0 &&
      sessionConfig.duration !== 'inf'
    ) {
      // Check if we're at the last image
      if (currentImageIndex >= images.length - 1) {
        completeSession();
      } else {
        // Move to next image and reset timer
        setCurrentImageIndex((prev) => prev + 1);
        setTimeRemaining(sessionConfig.duration as number);
      }
    }
  }, [timeRemaining, isSessionActive, currentImageIndex, images.length, sessionConfig.duration]);

  /**
   * Start a new drawing session
   */
  const startSession = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get reference images from drawing_refs table
      const sessionImages = await refsService.getRefsForSession(
        sessionConfig.imageCount,
        sessionConfig.category,
        sessionConfig.gender,
        sessionConfig.clothing
      );

      // Save session config snapshot
      setSessionConfigSnapshot({ ...sessionConfig });

      setImages(sessionImages);
      setCurrentImageIndex(0);
      setTimeRemaining(sessionConfig.duration === 'inf' ? 0 : sessionConfig.duration);
      setSessionStartTime(Date.now());
      setIsSessionActive(true);
      setIsSessionComplete(false);
      setIsPaused(false);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session. Please check your configuration.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionConfig]);

  /**
   * Complete the session
   */
  const completeSession = useCallback(() => {
    setIsSessionActive(false);
    setIsSessionComplete(true);
    setTimeRemaining(0);
    setIsPaused(false);
  }, []);

  /**
   * Stop the session (go back to config)
   */
  const stopSession = useCallback(() => {
    setIsSessionActive(false);
    setIsSessionComplete(false);
    setTimeRemaining(0);
    setIsPaused(false);
  }, []);

  /**
   * Reset to config screen
   */
  const resetSession = useCallback(() => {
    setIsSessionComplete(false);
    setIsSessionActive(false);
    setImages([]);
    setCurrentImageIndex(0);
  }, []);

  /**
   * Toggle pause state
   */
  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  /**
   * Go to next image (for infinite duration mode)
   */
  const goToNext = useCallback(() => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    } else {
      completeSession();
    }
  }, [currentImageIndex, images.length, completeSession]);

  /**
   * Save session when complete
   */
  useEffect(() => {
    if (isSessionComplete && sessionConfigSnapshot && sessionStartTime) {
      const totalTimeSeconds =
        sessionConfig.duration !== 'inf'
          ? Math.floor((Date.now() - sessionStartTime) / 1000)
          : null;

      const metrics: DrawingSessionMetrics = {
        imagesCompleted: currentImageIndex + 1, // +1 because index is 0-based
        totalTimeSeconds,
      };

      // Save session (works for both guest and logged users)
      import('@/app/services/sessionSyncService').then(({ saveDrawingSession }) => {
        saveDrawingSession(sessionConfigSnapshot, metrics);
      });
    }
  }, [
    isSessionComplete,
    sessionConfigSnapshot,
    sessionStartTime,
    currentImageIndex,
    sessionConfig.duration,
  ]);

  const currentImage = images[currentImageIndex];

  return {
    // Session state
    isSessionActive,
    isSessionComplete,
    isLoading,
    images,
    currentImage,
    currentImageIndex,
    timeRemaining,
    isPaused,

    // Session control
    startSession,
    stopSession,
    completeSession,
    resetSession,
    togglePause,
    goToNext,

    // Config
    sessionConfig: sessionConfigSnapshot,
  };
};
