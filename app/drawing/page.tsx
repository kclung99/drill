'use client';

import { useState, useEffect } from 'react';
import { ImagePoolService } from '../services/imagePoolService';
import { DrawingImage } from '../lib/supabase';
import { incrementSession } from '../utils/habitTracker';
import { NavBar } from '@/components/nav-bar';

export default function DrawingPractice() {
  const [images, setImages] = useState<DrawingImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [duration, setDuration] = useState<number | 'inf'>(60);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [alwaysGenerateNew, setAlwaysGenerateNew] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  // New filter options
  const [category, setCategory] = useState<string>('full-body');
  const [gender, setGender] = useState<string>('female');
  const [clothing, setClothing] = useState<string>('minimal');
  const [imageCount, setImageCount] = useState(1);

  const imagePoolService = new ImagePoolService();

  // Wake lock effect
  useEffect(() => {
    if (isSessionActive) {
      // Request wake lock when session starts
      if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').then((lock) => {
          setWakeLock(lock);
        }).catch((err) => {
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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    // Only run timer if duration is not infinite
    if (isSessionActive && !isPaused && timeRemaining > 0 && duration !== 'inf') {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, isPaused, timeRemaining, duration]);

  // Separate effect to handle when timer reaches 0
  useEffect(() => {
    if (isSessionActive && timeRemaining === 0 && duration !== 'inf') {
      // Check if we're at the last image
      if (currentImageIndex >= images.length - 1) {
        stopSession();
      } else {
        // Move to next image and reset timer
        setCurrentImageIndex(prev => prev + 1);
        setTimeRemaining(duration === 'inf' ? 0 : duration);
      }
    }
  }, [timeRemaining, isSessionActive, currentImageIndex, images.length, duration]);

  const startSession = async () => {
    setIsLoading(true);
    try {
      let sessionImages;
      if (alwaysGenerateNew) {
        // Force generation of new images, skip pool
        sessionImages = await imagePoolService.generateImages(imageCount, category, gender, clothing);
      } else {
        // Use normal pool logic
        sessionImages = await imagePoolService.getImagesForSession(imageCount);
      }

      setImages(sessionImages);
      setCurrentImageIndex(0);
      setTimeRemaining(duration === 'inf' ? 0 : duration);
      setIsSessionActive(true);
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start session. Please check your configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const stopSession = () => {
    setIsSessionActive(false);
    setTimeRemaining(0);
    setIsPaused(false);
    // Increment drawing session in habit tracker
    incrementSession('drawing');
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  const goToNext = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    } else {
      stopSession();
    }
  };

  const currentImage = images[currentImageIndex];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar currentPage="reference" />

      {!isSessionActive ? (
        <div className="flex-1 p-8 flex flex-col items-center justify-center">
          <div className="max-w-2xl w-full space-y-8">

            <div className="flex flex-col items-center gap-2">
              <div className="text-sm text-gray-500">parts</div>
              <div className="flex justify-center gap-2 flex-wrap">
                {['full-body', 'hands', 'feet', 'portraits'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2 text-sm border border-gray-400 ${
                      category === cat
                        ? 'bg-black text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="text-sm text-gray-500">gender</div>
              <div className="flex justify-center gap-2">
                {['male', 'female', 'both'].map(g => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`px-4 py-2 text-sm border border-gray-400 ${
                      gender === g
                        ? 'bg-black text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {category === 'full-body' && (
              <div className="flex flex-col items-center gap-2">
                <div className="text-sm text-gray-500">clothing</div>
                <div className="flex justify-center gap-2 flex-wrap">
                  {['minimal', 'clothed'].map(c => (
                    <button
                      key={c}
                      onClick={() => setClothing(c)}
                      className={`px-4 py-2 text-sm border border-gray-400 ${
                        clothing === c
                          ? 'bg-black text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col items-center gap-2">
              <div className="text-sm text-gray-500">count</div>
              <div className="flex justify-center gap-2">
                {[1, 3, 10, 20, 30].map(count => (
                  <button
                    key={count}
                    onClick={() => setImageCount(count)}
                    className={`px-4 py-2 text-sm border border-gray-400 ${
                      imageCount === count
                        ? 'bg-black text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="text-sm text-gray-500">duration</div>
              <div className="flex justify-center gap-2">
                {[30, 60, 90, 120, 'inf'].map(dur => (
                  <button
                    key={dur}
                    onClick={() => setDuration(dur as number | 'inf')}
                    className={`px-4 py-2 text-sm border border-gray-400 ${
                      duration === dur
                        ? 'bg-black text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {dur === 'inf' ? 'inf' : `${dur}s`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={alwaysGenerateNew}
                  onChange={(e) => setAlwaysGenerateNew(e.target.checked)}
                  className="rounded border-gray-400"
                />
                <span>always generate new</span>
              </label>
            </div>

            <div className="flex justify-center">
              <button
                onClick={startSession}
                disabled={isLoading}
                className="text-blue-600 underline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'loading...' : 'start'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-white flex flex-col z-50 overflow-hidden">

          {currentImage && (
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/drawing-images/${currentImage.storage_path}`}
                alt="Drawing reference"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}

          <div className="flex-shrink-0 flex items-center justify-center gap-4 text-sm text-gray-500 py-6">
            <div>{currentImageIndex + 1}/{images.length}</div>
            {duration !== 'inf' && (
              <>
                <div>·</div>
                <div>{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</div>
                <div>·</div>
                <button
                  onClick={togglePause}
                  className="text-blue-600 hover:underline"
                >
                  {isPaused ? 'resume' : 'pause'}
                </button>
              </>
            )}
            {duration === 'inf' && (
              <>
                <div>·</div>
                <button
                  onClick={goToNext}
                  className="text-blue-600 hover:underline"
                >
                  next
                </button>
              </>
            )}
            <div>·</div>
            <button
              onClick={stopSession}
              className="text-blue-600 hover:underline"
            >
              stop
            </button>
          </div>

        </div>
      )}
    </div>
  );
}