/**
 * ReferenceActions Component
 *
 * Action controls for selected reference images in modal.
 */

interface ReferenceActionsProps {
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function ReferenceActions({
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onClose,
}: ReferenceActionsProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-50 max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 space-y-6 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6 w-full max-w-md">
          {/* Selected Count */}
          <div className="text-sm text-gray-500 text-center">
            {selectedCount} image(s) selected
          </div>

          {/* Selection Controls */}
          <div className="flex flex-col gap-2">
            <div className="text-sm text-gray-500 text-center">selection</div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={onSelectAll}
                className="text-sm text-blue-500 lowercase hover:underline"
              >
                select-all
              </button>
              <button
                onClick={onDeselectAll}
                className="text-sm text-blue-500 lowercase hover:underline"
              >
                deselect-all
              </button>
            </div>
          </div>

          {/* Delete Action */}
          {selectedCount > 0 && (
            <div className="flex flex-col gap-2">
              <div className="text-sm text-gray-500 text-center">delete</div>
              <div className="flex justify-center">
                <button
                  onClick={onDelete}
                  className="text-sm text-blue-500 lowercase hover:underline"
                >
                  delete-selected
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
