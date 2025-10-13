/**
 * ChordSessionResults Component
 *
 * Display session completion stats and actions.
 */

interface ChordSessionResultsProps {
  finalEffectiveChords: number;
  isNewPB: boolean;
  pbEffectiveChords: number;
  finalPercentile: number;
  betterThanCount: number;
  totalHistoricalSessions: number;
  sessionMetrics: {
    correctChords: number;
    chordAccuracy: number;
    avgTimePerChord: number;
  };
  onAgain: () => void;
  onBack: () => void;
}

export default function ChordSessionResults({
  finalEffectiveChords,
  isNewPB,
  pbEffectiveChords,
  finalPercentile,
  betterThanCount,
  totalHistoricalSessions,
  sessionMetrics,
  onAgain,
  onBack,
}: ChordSessionResultsProps) {
  return (
    <div className="flex-1 p-8 flex flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <div className="text-6xl font-bold text-blue-600">
          {finalEffectiveChords}
        </div>
        {isNewPB && (
          <div className="text-green-600 text-sm">new pb 🎉</div>
        )}
      </div>

      <div className="flex flex-col items-start gap-1 text-sm text-gray-500 font-mono whitespace-pre">
        {pbEffectiveChords > 0 && (
          <div>{'pb         : '}{pbEffectiveChords}</div>
        )}
        {totalHistoricalSessions > 0 && (
          <div>{'percentile : '}{finalPercentile}% ({betterThanCount}/{totalHistoricalSessions})</div>
        )}
        <div>{'chords     : '}{sessionMetrics.correctChords}</div>
        <div>{'accuracy   : '}{sessionMetrics.chordAccuracy.toFixed(0)}%</div>
        <div>{'avg        : '}{sessionMetrics.avgTimePerChord.toFixed(1)}s</div>
      </div>

      <div className="flex gap-4 text-sm">
        <button
          onClick={onAgain}
          className="text-blue-500 lowercase hover:underline"
        >
          again
        </button>
        <button
          onClick={onBack}
          className="text-blue-500 lowercase hover:underline"
        >
          back
        </button>
      </div>
    </div>
  );
}
