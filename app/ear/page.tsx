'use client';

import { useState, useEffect, useRef } from 'react';
import { useMidi } from '../hooks/useMidi';
import { useYouTubePlayer } from '../hooks/useYouTubePlayer';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { NavBar } from '@/components/nav-bar';
import EarUrlInput from '../components/ear/EarUrlInput';
import EarVideoPlayer from '../components/ear/EarVideoPlayer';

// MIDI control mappings
const MIDI_CONTROLS = {
  24: { name: 'C1', action: 'back 5s' },
  26: { name: 'D1', action: 'play/pause' },
  28: { name: 'E1', action: 'forward 5s' },
  25: { name: 'C#1', action: 'speed down' },
  27: { name: 'D#1', action: 'speed up' },
};

/**
 * Extract video ID from YouTube URL
 */
function extractVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export default function EarPage() {
  const { pressedKeys, isSupported, activeMode } = useMidi();
  const [videoUrl, setVideoUrl] = useState('');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  // YouTube player hook
  const { controls, togglePlayPause } = useYouTubePlayer(activeVideoId);

  // Session timer hook
  const { formattedTime } = useSessionTimer(!!activeVideoId);

  // Track previously pressed keys for edge detection
  const lastPressedKeysRef = useRef<Set<number>>(new Set());

  /**
   * Handle MIDI controls
   */
  useEffect(() => {
    const newKeys = Array.from(pressedKeys).filter(
      (key) => !lastPressedKeysRef.current.has(key)
    );

    newKeys.forEach((key) => {
      const control = MIDI_CONTROLS[key as keyof typeof MIDI_CONTROLS];
      if (!control) return;

      switch (control.action) {
        case 'play/pause':
          togglePlayPause();
          break;
        case 'back 5s':
          controls.seekBy(-5);
          break;
        case 'forward 5s':
          controls.seekBy(5);
          break;
        case 'speed down':
          const currentRate = controls.getCurrentPlaybackRate();
          controls.setPlaybackRate(currentRate - 0.25);
          break;
        case 'speed up':
          const rate = controls.getCurrentPlaybackRate();
          controls.setPlaybackRate(rate + 0.25);
          break;
      }
    });

    lastPressedKeysRef.current = new Set(pressedKeys);
  }, [pressedKeys, controls, togglePlayPause]);

  /**
   * Handle URL submission
   */
  const handleSubmit = () => {
    const id = extractVideoId(videoUrl);
    if (id) {
      setActiveVideoId(id);
    }
  };

  /**
   * Handle stop button
   */
  const handleStop = () => {
    setActiveVideoId(null);
    setVideoUrl('');
  };

  // MIDI not supported screen
  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavBar currentPage="ear" showMidiStatus={true} midiActive={activeMode === 'midi'} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">MIDI Not Supported</h1>
            <p className="text-gray-600">Your browser doesn't support Web MIDI API.</p>
          </div>
        </div>
      </div>
    );
  }

  // URL input screen
  if (!activeVideoId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <NavBar currentPage="ear" showMidiStatus={true} midiActive={activeMode === 'midi'} />
        <EarUrlInput
          videoUrl={videoUrl}
          onVideoUrlChange={setVideoUrl}
          onSubmit={handleSubmit}
        />
      </div>
    );
  }

  // Video player screen
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar currentPage="ear" showMidiStatus={true} midiActive={activeMode === 'midi'} />
      <EarVideoPlayer formattedTime={formattedTime} onStop={handleStop} />
    </div>
  );
}
