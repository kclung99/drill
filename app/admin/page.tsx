'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { NavBar } from '@/components/nav-bar';
import { useReferenceImagesAdmin } from '@/app/hooks/useReferenceImagesAdmin';
import ReferenceImageGrid from '@/app/components/admin/ReferenceImageGrid';
import ReferenceFilters from '@/app/components/admin/ReferenceFilters';
import ReferenceActions from '@/app/components/admin/ReferenceActions';
import FullscreenImageModal from '@/app/components/admin/FullscreenImageModal';

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showFilters, setShowFilters] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Reference images hook
  const refs = useReferenceImagesAdmin();

  // Check admin access
  useEffect(() => {
    if (authLoading) return;

    if (!isAdmin) {
      router.push('/');
    } else {
      setLoading(false);
    }
  }, [authLoading, isAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar currentPage="admin" showMidiStatus={false} />

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Floating Action Buttons */}
          <div className="fixed bottom-8 right-8 z-40 flex gap-4">
            <button
              onClick={() => setShowActions(true)}
              className="text-blue-500 text-sm lowercase hover:underline"
            >
              action({refs.selectedRefIds.size})
            </button>
            <button
              onClick={() => setShowFilters(true)}
              className="text-blue-500 text-sm lowercase hover:underline"
            >
              filters
            </button>
          </div>

          {/* Reference Images Grid */}
          <ReferenceImageGrid
            refs={refs.refs}
            selectedRefIds={refs.selectedRefIds}
            onToggleSelect={refs.toggleRefSelect}
            onImageClick={refs.setFullscreenRef}
          />
        </div>
      </div>

      {/* Filter Modal */}
      {showFilters && (
        <ReferenceFilters
          bodyPart={refs.bodyPart}
          gender={refs.gender}
          refsCount={refs.refs.length}
          loading={refs.loading}
          onBodyPartChange={refs.setBodyPart}
          onGenderChange={refs.setGender}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Actions Modal */}
      {showActions && (
        <ReferenceActions
          selectedCount={refs.selectedRefIds.size}
          onSelectAll={refs.selectAll}
          onDeselectAll={refs.deselectAll}
          onDelete={refs.deleteSelected}
          onClose={() => setShowActions(false)}
        />
      )}

      {/* Fullscreen Modal */}
      {refs.fullscreenRef && (
        <FullscreenImageModal
          imageUrl={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${refs.fullscreenRef.filename}`}
          alt={refs.fullscreenRef.filename}
          onClose={() => refs.setFullscreenRef(null)}
        />
      )}
    </div>
  );
}
