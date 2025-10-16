/**
 * useReferenceImagesAdmin Hook
 *
 * Manages reference images admin operations.
 * Handles loading, filtering, selection, and deletion of reference images.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase';

export interface DrawingRef {
  id: string;
  filename: string;
  source_url: string;
  page_url: string | null;
  platform: string | null;
  body_part: string | null;
  gender: string | null;
  clothing_state: string;
  attributes: any;
  used_count: number;
  used_for_generation: boolean;
  created_at: string;
  used_at: string | null;
}

export const useReferenceImagesAdmin = () => {
  // Filter state
  const [bodyPart, setBodyPart] = useState<string>('full-body');
  const [gender, setGender] = useState<string>('female');

  // Data state
  const [refs, setRefs] = useState<DrawingRef[]>([]);
  const [loading, setLoading] = useState(false);

  // Selection state
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(new Set());

  // Fullscreen state
  const [fullscreenRef, setFullscreenRef] = useState<DrawingRef | null>(null);

  /**
   * Load reference images based on filters
   */
  const loadRefs = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Loading refs with filters:', { bodyPart, gender });

      let query = supabase
        .from('drawing_refs')
        .select('*')
        .order('created_at', { ascending: false });

      if (bodyPart !== 'all') {
        query = query.eq('body_part', bodyPart);
      }

      if (gender !== 'all') {
        query = query.eq('gender', gender);
      }

      const { data: refs, error } = await query;

      if (error) {
        console.error('Error loading refs:', error);
        setRefs([]);
        return;
      }

      console.log('Loaded refs:', refs?.length, 'images');
      setRefs(refs || []);
      setSelectedRefIds(new Set());
    } catch (error) {
      console.error('Failed to load refs:', error);
      setRefs([]);
    } finally {
      setLoading(false);
    }
  }, [bodyPart, gender]);

  /**
   * Load refs when filters change
   */
  useEffect(() => {
    loadRefs();
  }, [loadRefs]);

  /**
   * Toggle selection of a single ref
   */
  const toggleRefSelect = useCallback((id: string) => {
    setSelectedRefIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  /**
   * Select all refs
   */
  const selectAll = useCallback(() => {
    setSelectedRefIds(new Set(refs.map((ref) => ref.id)));
  }, [refs]);

  /**
   * Deselect all refs
   */
  const deselectAll = useCallback(() => {
    setSelectedRefIds(new Set());
  }, []);

  /**
   * Delete selected refs
   */
  const deleteSelected = useCallback(async () => {
    if (selectedRefIds.size === 0) return;
    if (!confirm(`Delete ${selectedRefIds.size} reference image(s)?`)) return;

    try {
      const refsToDelete = refs.filter((ref) => selectedRefIds.has(ref.id));

      // Delete from storage
      const filenames = refsToDelete.map((ref) => ref.filename);
      const { error: storageError } = await supabase.storage
        .from('images')
        .remove(filenames);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('drawing_refs')
        .delete()
        .in('id', Array.from(selectedRefIds));

      if (dbError) throw dbError;

      // Reload refs
      await loadRefs();
    } catch (error) {
      console.error('Failed to delete refs:', error);
      alert('Failed to delete references');
    }
  }, [selectedRefIds, refs, loadRefs]);

  return {
    // Filter state
    bodyPart,
    setBodyPart,
    gender,
    setGender,

    // Data
    refs,
    loading,
    loadRefs,

    // Selection
    selectedRefIds,
    toggleRefSelect,
    selectAll,
    deselectAll,
    deleteSelected,

    // Fullscreen
    fullscreenRef,
    setFullscreenRef,
  };
};
