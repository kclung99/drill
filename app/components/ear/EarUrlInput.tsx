/**
 * EarUrlInput Component
 *
 * Input form for YouTube URL.
 */

interface EarUrlInputProps {
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  onSubmit: () => void;
}

export default function EarUrlInput({
  videoUrl,
  onVideoUrlChange,
  onSubmit,
}: EarUrlInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl px-8">
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => onVideoUrlChange(e.target.value)}
          placeholder="paste youtube url and press enter"
          className="w-full px-4 py-2 border border-gray-400 text-sm text-gray-500 focus:outline-none"
          autoFocus
        />
      </form>
    </div>
  );
}
