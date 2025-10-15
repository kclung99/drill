/**
 * FullscreenImageModal Component
 *
 * Displays image in fullscreen modal.
 */

interface FullscreenImageModalProps {
  imageUrl: string;
  alt: string;
  onClose: () => void;
}

export default function FullscreenImageModal({
  imageUrl,
  alt,
  onClose,
}: FullscreenImageModalProps) {
  return (
    <div
      className="fixed inset-0 bg-gray-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative h-full flex gap-4 items-center">
        <img
          src={imageUrl}
          alt={alt}
          className="max-w-full max-h-screen object-contain"
        />
      </div>
    </div>
  );
}
