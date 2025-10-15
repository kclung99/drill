/**
 * DrawingSessionConfig Component
 *
 * Session configuration UI for drawing practice.
 * Extracted from drawing/page.tsx to reduce complexity.
 */

import { DrawingSessionConfig as DrawingSessionConfigType } from '@/app/hooks/useDrawingPracticeSession';
import { UserSettings } from '@/app/services/settingsService';

interface DrawingSessionConfigProps {
  sessionConfig: DrawingSessionConfigType;
  userSettings: UserSettings | null;
  isLoading: boolean;
  onConfigChange: (config: DrawingSessionConfigType) => void;
  onStart: () => void;
}

export default function DrawingSessionConfig({
  sessionConfig,
  userSettings,
  isLoading,
  onConfigChange,
  onStart,
}: DrawingSessionConfigProps) {
  const updateConfig = (updates: Partial<DrawingSessionConfigType>) => {
    onConfigChange({ ...sessionConfig, ...updates });
  };

  return (
    <div className="flex-1 p-8 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full space-y-8">
        {/* Body Parts */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-500">parts</div>
          <div className="flex justify-center gap-2 flex-wrap">
            {['full-body', 'hands', 'feet', 'portraits'].map((cat) => (
              <button
                key={cat}
                onClick={() => updateConfig({ category: cat })}
                className={`px-4 py-2 text-sm border border-gray-400 ${
                  sessionConfig.category === cat
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Gender */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-500">gender</div>
          <div className="flex justify-center gap-2">
            {['male', 'female', 'both'].map((g) => (
              <button
                key={g}
                onClick={() => updateConfig({ gender: g })}
                className={`px-4 py-2 text-sm border border-gray-400 ${
                  sessionConfig.gender === g
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Clothing (only for full-body) */}
        {sessionConfig.category === 'full-body' && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm text-gray-500">clothing</div>
            <div className="flex justify-center gap-2 flex-wrap">
              {['minimal', 'clothed'].map((c) => (
                <button
                  key={c}
                  onClick={() => updateConfig({ clothing: c })}
                  className={`px-4 py-2 text-sm border border-gray-400 ${
                    sessionConfig.clothing === c
                      ? 'bg-black text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Image Source (commented out in original) */}
        {/* <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-500">source</div>
          <div className="flex justify-center gap-2">
            {['generated', 'references'].map(source => (
              <button
                key={source}
                onClick={() => updateConfig({ imageSource: source as 'generated' | 'references' })}
                className={`px-4 py-2 text-sm border border-gray-400 ${
                  sessionConfig.imageSource === source
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {source}
              </button>
            ))}
          </div>
        </div> */}

        {/* Image Count */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-500">count</div>
          <div className="flex justify-center gap-2">
            {[1, 3, 10, 20, 30].map((count) => {
              const isValid = userSettings
                ? count >= userSettings.minDrawingRefs
                : true;
              return (
                <button
                  key={count}
                  onClick={() => updateConfig({ imageCount: count })}
                  className={`px-4 py-2 text-sm border border-gray-400 ${
                    sessionConfig.imageCount === count
                      ? isValid
                        ? 'bg-black text-white'
                        : 'bg-gray-300 text-gray-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={!isValid ? "Won't count toward heatmap" : undefined}
                >
                  {count}
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-500">duration</div>
          <div className="flex justify-center gap-2">
            {[30, 60, 90, 120, 'inf'].map((dur) => {
              const isValid = userSettings
                ? dur !== 'inf' &&
                  (dur as number) >= userSettings.minDrawingDurationSeconds
                : true;
              return (
                <button
                  key={dur}
                  onClick={() => updateConfig({ duration: dur as number | 'inf' })}
                  className={`px-4 py-2 text-sm border border-gray-400 ${
                    sessionConfig.duration === dur
                      ? isValid
                        ? 'bg-black text-white'
                        : 'bg-gray-300 text-gray-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={!isValid ? "Won't count toward heatmap" : undefined}
                >
                  {dur === 'inf' ? 'inf' : `${dur}s`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Button */}
        <div className="flex justify-center">
          <button
            onClick={onStart}
            disabled={isLoading}
            className="text-blue-500 text-sm lowercase hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'loading...' : 'start'}
          </button>
        </div>
      </div>
    </div>
  );
}
