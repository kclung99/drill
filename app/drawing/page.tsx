'use client';

import { useState, useEffect } from 'react';
import { NavBar } from '@/components/nav-bar';
import { UserSettings } from '@/app/services/settingsService';
import {
  useDrawingPracticeSession,
  DrawingSessionConfig as DrawingSessionConfigType,
} from '@/app/hooks/useDrawingPracticeSession';
import DrawingSessionConfig from '@/app/components/DrawingSessionConfig';
import DrawingSessionActive from '@/app/components/DrawingSessionActive';
import DrawingSessionResults from '@/app/components/DrawingSessionResults';

export default function DrawingPractice() {
  // User settings for validation thresholds
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  // Load user settings on mount
  useEffect(() => {
    import('@/app/services/settingsService').then(({ fetchSettings }) => {
      fetchSettings().then(setUserSettings);
    });
  }, []);

  // Session configuration state
  const [sessionConfig, setSessionConfig] = useState<DrawingSessionConfigType>({
    category: 'full-body',
    gender: 'female',
    clothing: 'minimal',
    imageCount: 10,
    duration: 60,
    imageSource: 'references',
    alwaysGenerateNew: false,
  });

  // Session hook manages all session state and logic
  const session = useDrawingPracticeSession(sessionConfig);

  // Session Configuration Screen
  if (!session.isSessionActive && !session.isSessionComplete) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavBar currentPage="drawing" />
        <DrawingSessionConfig
          sessionConfig={sessionConfig}
          userSettings={userSettings}
          isLoading={session.isLoading}
          onConfigChange={setSessionConfig}
          onStart={session.startSession}
        />
      </div>
    );
  }

  // Session Results Screen
  if (session.isSessionComplete && session.sessionConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavBar currentPage="drawing" />
        <DrawingSessionResults
          imagesCompleted={session.currentImageIndex + 1}
          totalTimeSeconds={
            session.sessionConfig.duration !== 'inf'
              ? Math.floor(
                  ((session.sessionConfig.duration as number) * session.currentImageIndex) +
                    (session.sessionConfig.duration as number - session.timeRemaining)
                )
              : null
          }
          onAgain={() => {
            session.resetSession();
            session.startSession();
          }}
          onBack={session.resetSession}
        />
      </div>
    );
  }

  // Active Session Screen
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar currentPage="drawing" />
      <DrawingSessionActive
        currentImage={session.currentImage}
        currentImageIndex={session.currentImageIndex}
        totalImages={session.images.length}
        timeRemaining={session.timeRemaining}
        duration={sessionConfig.duration}
        isPaused={session.isPaused}
        imageSource={sessionConfig.imageSource}
        onTogglePause={session.togglePause}
        onNext={session.goToNext}
        onStop={session.stopSession}
      />
    </div>
  );
}
