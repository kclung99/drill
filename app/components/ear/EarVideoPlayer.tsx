/**
 * EarVideoPlayer Component
 *
 * YouTube video player with session timer and controls.
 */

interface EarVideoPlayerProps {
  formattedTime: string;
  onStop: () => void;
}

export default function EarVideoPlayer({ formattedTime, onStop }: EarVideoPlayerProps) {
  return (
    <div className="flex-1 p-8 flex flex-col items-center justify-center gap-4">
      <div className="bg-black">
        <div id="youtube-player"></div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500">{formattedTime}</span>
        <button onClick={onStop} className="text-blue-500 hover:underline">
          stop
        </button>
      </div>
    </div>
  );
}
