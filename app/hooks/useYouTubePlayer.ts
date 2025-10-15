/**
 * useYouTubePlayer Hook
 *
 * Manages YouTube IFrame API and player instance.
 */

import { useState, useEffect, useRef } from 'react';

export interface YouTubePlayerControls {
  play: () => void;
  pause: () => void;
  seekBy: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  getCurrentPlaybackRate: () => number;
}

export const useYouTubePlayer = (videoId: string | null) => {
  const [apiReady, setApiReady] = useState(false);
  const playerRef = useRef<any>(null);

  /**
   * Load YouTube IFrame API
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).YT) {
      setApiReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    (window as any).onYouTubeIframeAPIReady = () => {
      setApiReady(true);
    };
  }, []);

  /**
   * Create/destroy player when videoId changes
   */
  useEffect(() => {
    if (!apiReady || !videoId) return;

    // Destroy old player if exists
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    // Create new player
    playerRef.current = new (window as any).YT.Player('youtube-player', {
      height: '480',
      width: '854',
      videoId: videoId,
      playerVars: {
        controls: 1,
        modestbranding: 1,
      },
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, apiReady]);

  /**
   * Player controls
   */
  const controls: YouTubePlayerControls = {
    play: () => {
      if (playerRef.current?.playVideo) {
        playerRef.current.playVideo();
      }
    },
    pause: () => {
      if (playerRef.current?.pauseVideo) {
        playerRef.current.pauseVideo();
      }
    },
    seekBy: (seconds: number) => {
      if (playerRef.current?.getCurrentTime && playerRef.current?.seekTo) {
        const currentTime = playerRef.current.getCurrentTime();
        const newTime = seconds < 0 ? Math.max(0, currentTime + seconds) : currentTime + seconds;
        playerRef.current.seekTo(newTime, true);
      }
    },
    setPlaybackRate: (rate: number) => {
      if (playerRef.current?.setPlaybackRate) {
        playerRef.current.setPlaybackRate(Math.max(0.25, Math.min(2, rate)));
      }
    },
    getCurrentPlaybackRate: () => {
      if (playerRef.current?.getPlaybackRate) {
        return playerRef.current.getPlaybackRate();
      }
      return 1;
    },
  };

  /**
   * Toggle play/pause
   */
  const togglePlayPause = () => {
    if (!playerRef.current?.getPlayerState) return;

    const state = playerRef.current.getPlayerState();
    if (state === 1) {
      // Playing
      controls.pause();
    } else {
      controls.play();
    }
  };

  return {
    apiReady,
    controls,
    togglePlayPause,
    playerRef,
  };
};
