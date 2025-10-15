/**
 * ReferenceImageGrid Component
 *
 * Displays grid of reference images with selection and metadata.
 */

import { DrawingRef } from '@/app/hooks/useReferenceImagesAdmin';

interface ReferenceImageGridProps {
  refs: DrawingRef[];
  selectedRefIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onImageClick: (ref: DrawingRef) => void;
}

export default function ReferenceImageGrid({
  refs,
  selectedRefIds,
  onToggleSelect,
  onImageClick,
}: ReferenceImageGridProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (refs.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        No reference images found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {refs.map((ref) => (
        <div key={ref.id} className="relative group">
          {/* Select button - only show on hover */}
          <div
            className="absolute top-3 left-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => onToggleSelect(ref.id)}
              className="text-blue-500 text-xs lowercase hover:underline"
            >
              {selectedRefIds.has(ref.id) ? 'deselect' : 'select'}
            </button>
          </div>

          {/* Selected indicator - center, hidden on hover */}
          {selectedRefIds.has(ref.id) && (
            <div className="absolute inset-0 flex items-center justify-center z-20 opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none">
              <div className="text-blue-500 text-sm lowercase">selected</div>
            </div>
          )}

          {/* Image */}
          <div
            className={`aspect-square relative overflow-hidden cursor-pointer ${
              selectedRefIds.has(ref.id) ? 'opacity-20' : ''
            }`}
            onClick={() => onImageClick(ref)}
          >
            <img
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${ref.filename}`}
              alt={ref.filename}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Metadata overlay on hover */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-75 transition-all duration-200 flex flex-col justify-between opacity-0 group-hover:opacity-100 pointer-events-none">
            {/* Spacer for select button */}
            <div className="p-3"></div>

            {/* Metadata - aligned to bottom */}
            <div className="p-3 text-white text-xs space-y-1 w-full">
              <div className="font-medium truncate">{ref.filename}</div>
              {ref.body_part && (
                <div>part: {ref.body_part.replace('_', ' ')}</div>
              )}
              {ref.gender && <div>gender: {ref.gender}</div>}
              {ref.platform && <div>source: {ref.platform}</div>}
              <div className="text-gray-300 pt-1 border-t border-gray-600">
                created: {formatDate(ref.created_at)}
              </div>
              <div className="text-gray-300">
                used: {ref.used_count}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
