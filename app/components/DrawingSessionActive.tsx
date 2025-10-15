/**
 * DrawingSessionActive Component
 *
 * Active drawing practice session UI with image display and controls.
 */

import { DrawingRef } from '@/app/services/drawingRefsService';

interface DrawingSessionActiveProps {
  currentImage: DrawingRef | null;
  currentImageIndex: number;
  totalImages: number;
  timeRemaining: number;
  duration: number | 'inf';
  isPaused: boolean;
  imageSource: 'generated' | 'references';
  onTogglePause: () => void;
  onNext: () => void;
  onStop: () => void;
}

export default function DrawingSessionActive({
  currentImage,
  currentImageIndex,
  totalImages,
  timeRemaining,
  duration,
  isPaused,
  imageSource,
  onTogglePause,
  onNext,
  onStop,
}: DrawingSessionActiveProps) {
  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50 overflow-hidden">
      {currentImage && (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <img
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${currentImage.filename}`}
            alt="Drawing reference"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}

      <div className="flex-shrink-0 flex items-center justify-center gap-4 text-sm text-gray-500 py-6">
        <div>
          {currentImageIndex + 1}/{totalImages}
        </div>
        {duration !== 'inf' && (
          <>
            <div>
              {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </div>
            <button
              onClick={onTogglePause}
              className="text-blue-500 lowercase hover:underline"
            >
              {isPaused ? 'resume' : 'pause'}
            </button>
          </>
        )}
        {duration === 'inf' && (
          <button
            onClick={onNext}
            className="text-blue-500 lowercase hover:underline"
          >
            next
          </button>
        )}
        <button onClick={onStop} className="text-blue-500 lowercase hover:underline">
          stop
        </button>
      </div>
    </div>
  );
}
