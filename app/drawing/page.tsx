'use client';

import { useState, useEffect } from 'react';
import { ImagePoolService } from '../services/imagePoolService';
import { DrawingImage } from '../lib/supabase';
import Link from 'next/link';

export default function DrawingPractice() {
  const [images, setImages] = useState<DrawingImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [duration, setDuration] = useState(60);
  const [imageCount, setImageCount] = useState(1);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [poolStats, setPoolStats] = useState({ total: 0, recent: 0 });
  const [alwaysGenerateNew, setAlwaysGenerateNew] = useState(false);
  const [showImageModal, setShowImageModal] = useState(true);

  const imagePoolService = new ImagePoolService();

  useEffect(() => {
    loadPoolStats();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, timeRemaining]);

  // Separate effect to handle when timer reaches 0
  useEffect(() => {
    if (isSessionActive && timeRemaining === 0) {
      // Check if we're at the last image
      if (currentImageIndex >= images.length - 1) {
        stopSession();
      } else {
        // Move to next image and reset timer
        setCurrentImageIndex(prev => prev + 1);
        setTimeRemaining(duration);
      }
    }
  }, [timeRemaining, isSessionActive, currentImageIndex, images.length, duration]);

  const loadPoolStats = async () => {
    try {
      const stats = await imagePoolService.getPoolStats();
      setPoolStats(stats);
    } catch (error) {
      console.error('Failed to load pool stats:', error);
    }
  };

  const startSession = async () => {
    setIsLoading(true);
    try {
      let sessionImages;
      if (alwaysGenerateNew) {
        // Force generation of new images, skip pool
        sessionImages = await imagePoolService.generateImages(imageCount);
      } else {
        // Use normal pool logic
        sessionImages = await imagePoolService.getImagesForSession(imageCount);
      }

      setImages(sessionImages);
      setCurrentImageIndex(0);
      setTimeRemaining(duration);
      setIsSessionActive(true);
      await loadPoolStats();
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
  };

  const handleNextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
      setTimeRemaining(duration);
    } else {
      stopSession();
    }
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
      setTimeRemaining(duration);
    }
  };

  const currentImage = images[currentImageIndex];
  const progress = images.length > 0 ? ((currentImageIndex + 1) / images.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Drawing Practice</h1>
          <p className="text-gray-600 mb-6">Practice figure drawing with AI-generated references</p>

          <div className="flex justify-center gap-4 mb-6">
            <Link href="/" className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
              Home
            </Link>
            <Link href="/practice" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Chord Practice
            </Link>
            <Link href="/live" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Live Mode
            </Link>
          </div>
        </div>

        {!isSessionActive ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-6 text-center">Session Settings</h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration per image
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value={3}>3 seconds (testing)</option>
                  <option value={60}>60 seconds</option>
                  <option value={90}>90 seconds</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of images
                </label>
                <select
                  value={imageCount}
                  onChange={(e) => setImageCount(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value={1}>1 image (testing)</option>
                  <option value={3}>3 images</option>
                  <option value={10}>10 images</option>
                  <option value={20}>20 images</option>
                  <option value={30}>30 images</option>
                </select>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={alwaysGenerateNew}
                    onChange={(e) => setAlwaysGenerateNew(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Always generate new images (for testing)
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Skip pool and force generation of fresh images
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Pool Status</h3>
              <p className="text-sm text-gray-600">
                Total images: {poolStats.total} | Generated today: {poolStats.recent}
              </p>
            </div>

            <button
              onClick={startSession}
              disabled={isLoading}
              className="w-full bg-purple-500 text-white py-3 rounded-lg hover:bg-purple-600 font-semibold disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Start Session'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Session Controls */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-lg font-semibold text-gray-700">
                  Image {currentImageIndex + 1} of {images.length}
                </div>
                <div className="text-lg font-semibold text-purple-600">
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={handlePrevImage}
                  disabled={currentImageIndex === 0}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={stopSession}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Stop Session
                </button>
                <button
                  onClick={handleNextImage}
                  disabled={currentImageIndex === images.length - 1}
                  className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>

            {/* Current Image Info */}
            {currentImage && !showImageModal && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-center">
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/drawing-images/${currentImage.storage_path}`}
                    alt="Drawing reference"
                    className="max-w-full max-h-96 object-contain rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setShowImageModal(true)}
                  />
                </div>
                <div className="mt-4 text-center text-sm text-gray-600">
                  {currentImage.body_type} {currentImage.race} female, {currentImage.pose}, {currentImage.angle}
                </div>
                <div className="mt-2 text-center">
                  <button
                    onClick={() => setShowImageModal(true)}
                    className="text-blue-500 hover:text-blue-600 text-sm underline"
                  >
                    Click to view full size
                  </button>
                </div>
              </div>
            )}

            {/* Full Size Image Modal */}
            {showImageModal && currentImage && (
              <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-8">
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Timer Display */}
                  <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg z-10">
                    <div className="text-lg font-bold">
                      {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-xs text-gray-300">
                      Image {currentImageIndex + 1} of {images.length}
                    </div>
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={() => setShowImageModal(false)}
                    className="absolute top-4 right-4 text-white text-2xl bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 z-10"
                  >
                    ×
                  </button>

                  {/* Navigation Controls */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 z-10">
                    <button
                      onClick={handlePrevImage}
                      disabled={currentImageIndex === 0}
                      className="bg-black bg-opacity-70 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={stopSession}
                      className="bg-red-500 bg-opacity-80 text-white px-4 py-2 rounded hover:bg-opacity-100"
                    >
                      Stop Session
                    </button>
                    <button
                      onClick={handleNextImage}
                      disabled={currentImageIndex === images.length - 1}
                      className="bg-black bg-opacity-70 text-white px-4 py-2 rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>

                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/drawing-images/${currentImage.storage_path}`}
                    alt="Drawing reference - Full size"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}