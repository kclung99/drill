/**
 * ReferenceFilters Component
 *
 * Filter controls for reference images in modal.
 */

interface ReferenceFiltersProps {
  bodyPart: string;
  gender: string;
  refsCount: number;
  loading: boolean;
  onBodyPartChange: (part: string) => void;
  onGenderChange: (gender: string) => void;
  onClose: () => void;
}

export default function ReferenceFilters({
  bodyPart,
  gender,
  refsCount,
  loading,
  onBodyPartChange,
  onGenderChange,
  onClose,
}: ReferenceFiltersProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-50 max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 space-y-6 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6 w-full max-w-2xl">
          {/* Body Part Filter */}
          <div className="flex flex-col gap-2">
            <div className="text-sm text-gray-500 text-center">body part</div>
            <div className="flex gap-2 flex-wrap justify-center">
              {['all', 'full-body', 'hands', 'feet', 'portraits'].map((part) => (
                <button
                  key={part}
                  onClick={() => onBodyPartChange(part)}
                  className={`px-4 py-2 text-sm border border-gray-400 ${
                    bodyPart === part
                      ? 'bg-black text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {part.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Gender Filter */}
          <div className="flex flex-col gap-2">
            <div className="text-sm text-gray-500 text-center">gender</div>
            <div className="flex gap-2 justify-center">
              {['all', 'male', 'female'].map((g) => (
                <button
                  key={g}
                  onClick={() => onGenderChange(g)}
                  className={`px-4 py-2 text-sm border border-gray-400 ${
                    gender === g
                      ? 'bg-black text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Count Display */}
          <div className="text-sm text-gray-500 text-center">
            {refsCount} reference image(s)
            {loading && ' (loading...)'}
          </div>
        </div>
      </div>
    </div>
  );
}
