/**
 * DrawingSessionResults Component
 *
 * Display session completion stats and actions.
 */

interface DrawingSessionResultsProps {
  imagesCompleted: number;
  totalTimeSeconds: number | null;
  onAgain: () => void;
  onBack: () => void;
}

export default function DrawingSessionResults({
  imagesCompleted,
  totalTimeSeconds,
  onAgain,
  onBack,
}: DrawingSessionResultsProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div className="flex-1 p-8 flex flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-2">
        <div className="text-6xl font-bold text-blue-600">{imagesCompleted}</div>
        <div className="text-sm text-gray-500">images completed</div>
      </div>

      <div className="flex flex-col items-start gap-1 text-sm text-gray-500 font-mono whitespace-pre">
        <div>{'images : '}{imagesCompleted}</div>
        {totalTimeSeconds !== null && (
          <div>{'time   : '}{formatTime(totalTimeSeconds)}</div>
        )}
      </div>

      <div className="flex gap-4 text-sm">
        <button onClick={onAgain} className="text-blue-500 lowercase hover:underline">
          again
        </button>
        <button onClick={onBack} className="text-blue-500 lowercase hover:underline">
          back
        </button>
      </div>
    </div>
  );
}
