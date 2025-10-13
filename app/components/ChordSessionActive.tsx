/**
 * ChordSessionActive Component
 *
 * Active chord practice session UI with live feedback.
 */

import Piano from './Piano';
import { getChordMidiNotes } from '@/app/utils/chord';

interface ChordSessionActiveProps {
  targetChord: string;
  currentChord: string;
  isCorrect: boolean;
  pressedKeys: Set<number>;
  targetChordNotes: string[];
  showChordNotes: boolean;
  onShowChordNotes: () => void;
  sessionTimeRemaining: number;
  currentSessionStats: {
    currentEffectiveChords: number;
    projectedFinal: number;
  } | null;
  pbEffectiveChords: number;
  onStop: () => void;
}

export default function ChordSessionActive({
  targetChord,
  currentChord,
  isCorrect,
  pressedKeys,
  targetChordNotes,
  showChordNotes,
  onShowChordNotes,
  sessionTimeRemaining,
  currentSessionStats,
  pbEffectiveChords,
  onStop,
}: ChordSessionActiveProps) {
  return (
    <div className="flex-1 p-8 flex flex-col items-center justify-center gap-8">
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div>{Math.floor(sessionTimeRemaining / 60000)}:{((sessionTimeRemaining % 60000) / 1000).toFixed(0).padStart(2, '0')}</div>
        {currentSessionStats && (
          <>
            <div>effective: {currentSessionStats.currentEffectiveChords}</div>
            {currentSessionStats.projectedFinal > 0 && (
              <div className={currentSessionStats.projectedFinal > pbEffectiveChords ? 'text-blue-500' : 'text-red-500'}>
                proj: {currentSessionStats.projectedFinal}
              </div>
            )}
          </>
        )}
        {pbEffectiveChords > 0 && <div>pb: {pbEffectiveChords}</div>}
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="text-6xl font-bold text-blue-600">
          {targetChord}
        </div>
        <div className="text-lg text-gray-500 min-h-[28px]">
          {showChordNotes && targetChordNotes.length > 0 ? (
            targetChordNotes.join(' ')
          ) : (
            <button
              onClick={onShowChordNotes}
              className="text-blue-600 hover:underline text-sm"
            >
              show
            </button>
          )}
        </div>
      </div>

      <div className={`text-2xl font-bold ${
        isCorrect ? 'text-green-600' : 'text-gray-500'
      }`}>
        {currentChord || '\u00A0'}
      </div>

      <div className="flex flex-col items-center gap-4">
        <Piano
          pressedKeys={pressedKeys}
          targetChordKeys={showChordNotes ? new Set(getChordMidiNotes(targetChord)) : new Set()}
        />
        <button
          onClick={onStop}
          className="text-blue-500 text-sm lowercase hover:underline"
        >
          stop
        </button>
      </div>
    </div>
  );
}
