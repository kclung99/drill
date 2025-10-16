/**
 * ChordSessionConfig Component
 *
 * Session configuration UI for chord practice.
 * Extracted from practice/page.tsx to reduce complexity.
 */

import { SessionConfig, CHORD_TYPES, SCALES } from '@/app/utils/chord';
import { UserSettings } from '@/app/services/settingsService';

interface ChordSessionConfigProps {
  sessionConfig: SessionConfig;
  sessionDuration: number;
  userSettings: UserSettings | null;
  onConfigChange: (config: SessionConfig) => void;
  onDurationChange: (duration: number) => void;
  onStart: () => void;
}

export default function ChordSessionConfig({
  sessionConfig,
  sessionDuration,
  userSettings,
  onConfigChange,
  onDurationChange,
  onStart,
}: ChordSessionConfigProps) {
  const updateConfig = (updates: Partial<SessionConfig>) => {
    onConfigChange({ ...sessionConfig, ...updates });
  };

  const isStartDisabled =
    (sessionConfig.mode === 'chordTypes' && sessionConfig.chordTypes.length === 0) ||
    (sessionConfig.mode === 'scales' && sessionConfig.scales.length === 0);

  // Pre-compute validity for all durations to avoid render flicker
  const minDuration = userSettings?.minMusicDurationMinutes ?? Infinity;
  const isDurationValid = (duration: number) => duration >= minDuration;

  return (
    <div className="flex-1 p-8 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full space-y-8">
        {/* Duration */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-500">duration</div>
          <div className="flex justify-center gap-2">
            {[1, 3, 5, 10, 20].map(duration => {
              const isValid = isDurationValid(duration);
              return (
                <button
                  key={duration}
                  onClick={() => onDurationChange(duration)}
                  className={`px-4 py-2 text-sm border border-gray-400 ${
                    sessionDuration === duration
                      ? isValid
                        ? 'bg-black text-white'
                        : 'bg-gray-300 text-gray-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={!isValid ? "Won't count toward heatmap" : undefined}
                >
                  {duration === 0.17 ? '10s' : `${duration}min`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-500">mode</div>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => updateConfig({ mode: 'chordTypes' })}
              className={`px-4 py-2 text-sm border border-gray-400 ${
                sessionConfig.mode === 'chordTypes'
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              types
            </button>
            <button
              onClick={() => updateConfig({ mode: 'scales' })}
              className={`px-4 py-2 text-sm border border-gray-400 ${
                sessionConfig.mode === 'scales'
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              scales
            </button>
          </div>
        </div>

        {/* Chord Types */}
        {sessionConfig.mode === 'chordTypes' && (
          <div className="flex flex-wrap justify-center gap-2">
            {CHORD_TYPES.map(chordType => (
              <button
                key={chordType.id}
                onClick={() => {
                  updateConfig({
                    chordTypes: sessionConfig.chordTypes.includes(chordType.id)
                      ? sessionConfig.chordTypes.filter(t => t !== chordType.id)
                      : [...sessionConfig.chordTypes, chordType.id],
                  });
                }}
                className={`px-3 py-2 text-sm border border-gray-400 ${
                  sessionConfig.chordTypes.includes(chordType.id)
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {chordType.name}
              </button>
            ))}
          </div>
        )}

        {/* Scales */}
        {sessionConfig.mode === 'scales' && (
          <div className="flex flex-wrap justify-center gap-2">
            {SCALES.map(scale => (
              <button
                key={scale.id}
                onClick={() => {
                  updateConfig({
                    scales: sessionConfig.scales.includes(scale.id)
                      ? sessionConfig.scales.filter(s => s !== scale.id)
                      : [...sessionConfig.scales, scale.id],
                  });
                }}
                className={`px-3 py-2 text-sm border border-gray-400 ${
                  sessionConfig.scales.includes(scale.id)
                    ? 'bg-black text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {scale.name}
              </button>
            ))}
          </div>
        )}

        {/* Inversions */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-gray-500">inversions</div>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => updateConfig({ includeInversions: true })}
              className={`px-4 py-2 text-sm border border-gray-400 ${
                sessionConfig.includeInversions
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              yes
            </button>
            <button
              onClick={() => updateConfig({ includeInversions: false })}
              className={`px-4 py-2 text-sm border border-gray-400 ${
                !sessionConfig.includeInversions
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              no
            </button>
          </div>
        </div>

        {/* Start Button */}
        <div className="flex justify-center">
          <button
            onClick={onStart}
            disabled={isStartDisabled}
            className="text-blue-500 text-sm lowercase hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            start
          </button>
        </div>
      </div>
    </div>
  );
}
