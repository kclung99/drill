'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, DrawingImage } from '@/app/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { ImagePoolService } from '@/app/services/imagePoolService';
import { ImageModel } from '@/app/services/imageGenerationService';
import { NavBar } from '@/components/nav-bar';

interface DrawingRef {
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
  generation_status: 'pending' | 'processing' | 'success' | 'failed' | 'blocked';
  generation_attempts: number;
  last_attempt_at: string | null;
  last_error: string | null;
  generatedImage?: DrawingImage | null;
}

export default function AdminImagesPage() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);

  // View mode: 'generated' or 'refs'
  const [viewMode, setViewMode] = useState<'generated' | 'refs'>('refs');

  // Generated images state
  const [images, setImages] = useState<DrawingImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<DrawingImage | null>(null);
  const [poseImage, setPoseImage] = useState<string | null>(null);
  const [isPoseExtracting, setIsPoseExtracting] = useState(false);

  // Reference images state
  const [refs, setRefs] = useState<DrawingRef[]>([]);
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(new Set());
  const [fullscreenRef, setFullscreenRef] = useState<DrawingRef | null>(null);
  const [isExtractingRefs, setIsExtractingRefs] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState({ current: 0, total: 0 });

  // Filters
  const [category, setCategory] = useState<string>('full-body');
  const [gender, setGender] = useState<string>('female');
  const [clothing, setClothing] = useState<string>('minimal');
  const [selectedModel, setSelectedModel] = useState<ImageModel>('google/nano-banana');

  // Ref filters
  const [refBodyPart, setRefBodyPart] = useState<string>('full-body');
  const [refGender, setRefGender] = useState<string>('female');
  const [showGenerationInfo, setShowGenerationInfo] = useState<boolean>(false);

  // Modal state
  const [showFilters, setShowFilters] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const imagePoolService = new ImagePoolService();

  // Check admin access - wait for auth to load before redirecting
  useEffect(() => {
    if (authLoading) return; // Wait for auth to finish loading

    if (!isAdmin) {
      router.push('/');
    } else {
      setLoading(false);
    }
  }, [authLoading, isAdmin, router]);

  // Load images when filters change
  useEffect(() => {
    if (!loading && viewMode === 'generated') {
      loadImages();
    }
  }, [category, gender, clothing, loading, viewMode]);

  // Load refs when filters change
  useEffect(() => {
    if (!loading && viewMode === 'refs') {
      loadRefs();
    }
  }, [refBodyPart, refGender, loading, viewMode]);

  const loadImages = async () => {
    try {
      let query = supabase
        .from('drawing_images')
        .select('*')
        .eq('category', category)
        .eq('clothing_state', clothing)
        .order('created_at', { ascending: false });

      if (gender !== 'both') {
        query = query.eq('subject_type', gender);
      }

      const { data, error } = await query;

      if (error) throw error;

      // For clothed images, also fetch their base images
      const imagesWithBase = await Promise.all(
        (data || []).map(async (img) => {
          if (img.base_image_id) {
            const { data: baseImage } = await supabase
              .from('drawing_images')
              .select('*')
              .eq('id', img.base_image_id)
              .single();
            return { ...img, baseImage };
          }
          return img;
        })
      );

      setImages(imagesWithBase as any);
      setSelectedIds(new Set()); // Clear selection when filters change
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      const imagesToDelete = images.filter(img => selectedIds.has(img.id));

      // Delete from storage
      const storagePaths = imagesToDelete.map(img => img.storage_path);
      const { error: storageError } = await supabase.storage
        .from('drawing-images')
        .remove(storagePaths);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('drawing_images')
        .delete()
        .in('id', Array.from(selectedIds));

      if (dbError) throw dbError;

      // Reload images
      await loadImages();
    } catch (error) {
      console.error('Failed to delete images:', error);
      alert('Failed to delete images');
    }
  };

  const handleGenerate = async (count: number) => {
    setIsGenerating(true);
    try {
      await imagePoolService.generateImages(count, category, gender, clothing, selectedModel);
      await loadImages();
    } catch (error) {
      console.error('Failed to generate images:', error);
      alert('Failed to generate images');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateClothed = async () => {
    if (selectedIds.size === 0) return;
    if (category !== 'full-body' || clothing !== 'minimal') {
      alert('Can only generate clothed versions for full-body minimal clothing images');
      return;
    }

    setIsGenerating(true);
    try {
      const selectedImages = images.filter(img => selectedIds.has(img.id));
      await imagePoolService.generateClothedVersions(selectedImages);
      await loadImages();
      setSelectedIds(new Set()); // Clear selection
    } catch (error) {
      console.error('Failed to generate clothed versions:', error);
      alert('Failed to generate clothed versions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePoseImagePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setPoseImage(event.target?.result as string);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handlePoseImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPoseImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtractPose = async () => {
    if (!poseImage) return;

    setIsPoseExtracting(true);
    try {
      await imagePoolService.generateFromPose(poseImage);
      await loadImages();
      setPoseImage(null); // Clear the pose image
    } catch (error: any) {
      console.error('Failed to extract pose:', error);
    } finally {
      setIsPoseExtracting(false);
    }
  };

  // Reference image functions
  const loadRefs = async () => {
    try {
      console.log('Loading refs with filters:', { refBodyPart, refGender });

      // First get all refs with filters
      let query = supabase
        .from('drawing_refs')
        .select('*')
        .order('created_at', { ascending: false });

      if (refBodyPart !== 'all') {
        query = query.eq('body_part', refBodyPart);
      }

      if (refGender !== 'all') {
        query = query.eq('gender', refGender);
      }

      const { data: refs, error } = await query;

      if (error) {
        console.error('Error loading refs:', error);
        throw error;
      }

      console.log('Loaded refs:', refs?.length, 'images');

      if (!refs || refs.length === 0) {
        setRefs([]);
        setSelectedRefIds(new Set());
        return;
      }

      // Fetch all generated images for these refs in a single query
      const refIds = refs.map(ref => ref.id);
      const { data: generatedImages } = await supabase
        .from('drawing_images')
        .select('*')
        .in('ref_image_id', refIds)
        .order('created_at', { ascending: false });

      // Create a map of ref_id -> latest generated image
      const generatedMap = new Map();
      generatedImages?.forEach(img => {
        if (!generatedMap.has(img.ref_image_id)) {
          generatedMap.set(img.ref_image_id, img);
        }
      });

      // Combine refs with their generated images
      const refsWithGenerated = refs.map(ref => ({
        ...ref,
        generatedImage: generatedMap.get(ref.id) || null
      }));

      setRefs(refsWithGenerated as any);
      setSelectedRefIds(new Set());
    } catch (error) {
      console.error('Failed to load refs:', error);
    }
  };

  const toggleRefSelect = (id: string) => {
    setSelectedRefIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllRefs = () => {
    setSelectedRefIds(new Set(refs.map(ref => ref.id)));
  };

  const deselectAllRefs = () => {
    setSelectedRefIds(new Set());
  };

  const handleDeleteRefs = async () => {
    if (selectedRefIds.size === 0) return;
    if (!confirm(`Delete ${selectedRefIds.size} reference image(s)?`)) return;

    try {
      const refsToDelete = refs.filter(ref => selectedRefIds.has(ref.id));

      // Delete from storage
      const filenames = refsToDelete.map(ref => ref.filename);
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
  };

  const handleExtractPosesFromRefs = async () => {
    if (selectedRefIds.size === 0) return;

    setIsExtractingRefs(true);
    const selectedRefs = refs.filter(ref => selectedRefIds.has(ref.id));
    setExtractionProgress({ current: 0, total: selectedRefs.length });

    const results = {
      successful: 0,
      failed: 0,
      blocked: 0,
      errors: [] as string[]
    };

    try {
      // Process all refs in parallel
      const processRef = async (ref: DrawingRef, index: number) => {
      let lastError: string | null = null;
      let isBlocked = false;

      console.log(`🔵 Processing ${index + 1}/${selectedRefs.length}: ${ref.filename} with ${selectedModel}`);

      // Mark as processing and reset previous errors
      console.log(`🔵 Updating DB status to 'processing' for ${ref.filename}`);
      try {
        const { error: updateError } = await supabase
          .from('drawing_refs')
          .update({
            generation_status: 'processing',
            last_attempt_at: new Date().toISOString(),
            last_error: null
          })
          .eq('id', ref.id);

        if (updateError) {
          console.log(`⚠️  DB update error (non-critical):`, updateError);
        } else {
          console.log(`🔵 DB status updated successfully`);
        }
      } catch (dbError) {
        console.log(`⚠️  DB update failed (non-critical):`, dbError);
      }

      // Try once, then retry once if failed (2 total attempts)
      let success = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`🔵 Retry ${attempt + 1} for ${ref.filename}`);
          }

          // Fetch image and convert to data URL
          console.log(`🔵 Fetching image from storage: ${ref.filename}`);
          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${ref.filename}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }

          const blob = await response.blob();
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          // Extract pose using selected model - NO RETRY in the service itself
          console.log(`🔵 About to call generateFromPoseWithModel with gender: ${ref.gender || 'female'}`);
          const generatedImage = await imagePoolService.generateFromPoseWithModel(
            dataUrl,
            selectedModel,
            0,
            ref.gender || 'female' // Pass gender from ref, default to female
          );
          console.log(`🔵 generateFromPoseWithModel completed`);

          // Link the generated image back to the ref image
          await supabase
            .from('drawing_images')
            .update({ ref_image_id: ref.id })
            .eq('id', generatedImage.id);

          // Mark as success
          await supabase
            .from('drawing_refs')
            .update({
              used_for_generation: true,
              used_at: new Date().toISOString(),
              generation_status: 'success',
              generation_attempts: ref.generation_attempts + attempt + 1,
              last_attempt_at: new Date().toISOString(),
              last_error: null
            })
            .eq('id', ref.id);

          results.successful++;
          success = true;
          console.log(`✅ Success: ${ref.filename}`);
          break;

        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          lastError = errorMessage;

          // Check if it's a content moderation block
          if (errorMessage.includes('IMAGE_OTHER') ||
              errorMessage.includes('SAFETY') ||
              errorMessage.includes('blocked') ||
              errorMessage.includes('Content filtered')) {
            isBlocked = true;
            console.warn(`⚠️  ${ref.filename} blocked by content filters`);
            break; // Don't retry if blocked
          } else {
            console.warn(`⚠️  Attempt ${attempt + 1}/2 failed for ${ref.filename}: ${errorMessage}`);
          }

          // Suppress error notifications - don't throw
        }
      }

      // ALWAYS update status, even if failed - critical to prevent stuck state
      if (!success) {
        const finalStatus = isBlocked ? 'blocked' : 'failed';

        try {
          await supabase
            .from('drawing_refs')
            .update({
              generation_status: finalStatus,
              generation_attempts: ref.generation_attempts + 2,
              last_attempt_at: new Date().toISOString(),
              last_error: lastError
            })
            .eq('id', ref.id);
        } catch (dbError) {
          console.error(`Failed to update DB status for ${ref.filename}:`, dbError);
        }

        if (isBlocked) {
          results.blocked++;
        } else {
          results.failed++;
        }
        results.errors.push(`${ref.filename}: ${lastError}`);
        console.log(`❌ Failed: ${ref.filename}`);
      }

      // Update progress - ALWAYS do this
      setExtractionProgress(prev => ({ current: prev.current + 1, total: prev.total }));
    };

      // Run all in parallel
      await Promise.all(selectedRefs.map((ref, i) => processRef(ref, i)));

      // Reload all refs once at the end
      await loadRefs();

      // Small delay before closing to show completion
      await new Promise(resolve => setTimeout(resolve, 500));

      // Log results to console
      console.log(`✅ Successfully extracted ${results.successful} pose(s)`);
      if (results.blocked > 0) {
        console.log(`⚠️  Blocked by content filters: ${results.blocked}`);
      }
      if (results.failed > 0) {
        console.log(`❌ Failed: ${results.failed}`);
        results.errors.forEach(err => console.log(err));
      }

      deselectAllRefs();
    } catch (error) {
      console.log('💥 Extraction handler error:', error);
    } finally {
      // ALWAYS clean up, even if there's an error
      setIsExtractingRefs(false);
      setExtractionProgress({ current: 0, total: 0 });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

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

          {viewMode === 'generated' ? (
            <>
              {/* Filters and Actions */}
              <div className="mb-8 space-y-4">
                <div className="flex items-start justify-center gap-8">
              {/* Left: Filters */}
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <div className="text-sm text-gray-500">parts</div>
                  <div className="flex gap-2 flex-wrap">
                    {['full-body', 'hands', 'feet', 'portraits'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-4 py-2 text-sm border border-gray-400 ${
                          category === cat
                            ? 'bg-black text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-sm text-gray-500">gender</div>
                  <div className="flex gap-2">
                    {['male', 'female', 'both'].map(g => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
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

                {category === 'full-body' && (
                  <div className="flex flex-col gap-2">
                    <div className="text-sm text-gray-500">clothing</div>
                    <div className="flex gap-2 flex-wrap">
                      {['minimal', 'clothed'].map(c => (
                        <button
                          key={c}
                          onClick={() => setClothing(c)}
                          className={`px-4 py-2 text-sm border border-gray-400 ${
                            clothing === c
                              ? 'bg-black text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Middle: Generation */}
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <div className="text-sm text-gray-500">model</div>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value as ImageModel)}
                    className="px-3 py-2 border border-gray-400 text-sm text-gray-500"
                  >
                    <option value="ideogram-ai/ideogram-v3-turbo">Ideogram v3 Turbo</option>
                    <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
                    <option value="google/nano-banana">Nano Banana</option>
                    <option value="black-forest-labs/flux-kontext-pro">FLUX Kontext Pro</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-sm text-gray-500">generate</div>
                  <div className="flex gap-2">
                    {[1, 3, 10].map(count => (
                      <button
                        key={count}
                        onClick={() => handleGenerate(count)}
                        disabled={isGenerating}
                        className="px-3 py-2 bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedIds.size > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="text-sm text-gray-500">selected ({selectedIds.size})</div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleDelete}
                        className="px-4 py-2 bg-red-600 text-white text-sm hover:bg-red-700"
                      >
                        Delete
                      </button>

                      {category === 'full-body' && clothing === 'minimal' && (
                        <button
                          onClick={handleGenerateClothed}
                          disabled={isGenerating}
                          className="px-4 py-2 bg-purple-600 text-white text-sm hover:bg-purple-700 disabled:opacity-50"
                        >
                          Add Clothes
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  {images.length} images
                </div>

                {isGenerating && (
                  <div className="text-sm text-blue-600">
                    Generating...
                  </div>
                )}
              </div>

              {/* Right: Pose Extraction */}
              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <div className="text-sm text-gray-500">extract pose</div>
                  <div
                    className="border-2 border-dashed border-gray-400 p-4 text-center cursor-pointer hover:bg-gray-50"
                    onPaste={handlePoseImagePaste}
                    tabIndex={0}
                  >
                    {poseImage ? (
                      <div className="relative">
                        <img src={poseImage} alt="Pose reference" className="max-h-32 mx-auto" />
                        <button
                          onClick={() => setPoseImage(null)}
                          className="absolute top-0 right-0 bg-red-600 text-white text-xs px-2 py-1"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Paste image (Cmd+V) or{' '}
                        <label className="text-blue-600 cursor-pointer hover:underline">
                          upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handlePoseImageUpload}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  {poseImage && (
                    <button
                      onClick={handleExtractPose}
                      disabled={isPoseExtracting}
                      className="px-4 py-2 bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      {isPoseExtracting ? 'Extracting...' : 'Generate from Pose'}
                    </button>
                  )}
                </div>

                {isPoseExtracting && (
                  <div className="text-sm text-green-600">
                    Extracting pose...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map(image => (
              <div
                key={image.id}
                className="relative group border border-gray-300 bg-white"
              >
                {/* Checkbox */}
                <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(image.id)}
                    onChange={() => toggleSelect(image.id)}
                    className="w-5 h-5 rounded border-gray-400"
                  />
                </div>

                {/* Image */}
                <div
                  className="aspect-square relative overflow-hidden cursor-pointer"
                  onClick={() => setFullscreenImage(image)}
                >
                  {image.base_image_id && (image as any).baseImage ? (
                    // Show base image + clothed image side by side
                    <div className="flex h-full">
                      <div className="w-1/2 relative">
                        <img
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/drawing-images/${(image as any).baseImage.storage_path}`}
                          alt="Base"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="w-1/2 relative">
                        <img
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/drawing-images/${image.storage_path}`}
                          alt="Clothed"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/drawing-images/${image.storage_path}`}
                      alt="Reference"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Metadata overlay on hover */}
                <div
                  className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-75 transition-all duration-200 flex items-end opacity-0 group-hover:opacity-100 pointer-events-none"
                >
                  <div className="p-3 text-white text-xs space-y-1 w-full">
                    <div>used: {image.used_count}</div>
                    {image.attributes && typeof image.attributes === 'object' && (
                      <>
                        {(image.attributes as any).body_type && (
                          <div>body: {(image.attributes as any).body_type}</div>
                        )}
                        {(image.attributes as any).race && (
                          <div>race: {(image.attributes as any).race}</div>
                        )}
                        {(image.attributes as any).pose && (
                          <div>pose: {(image.attributes as any).pose}</div>
                        )}
                      </>
                    )}
                    <div className="pt-1 border-t border-gray-600">
                      <div>model: {image.model?.split('/').pop() || image.model}</div>
                      <div>type: {image.generation_type}</div>
                    </div>
                    <div className="text-gray-300 pt-1 border-t border-gray-600">
                      {formatDate(image.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {images.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              No images found for this combination
            </div>
          )}
            </>
          ) : (
            <>
              {/* Floating Buttons */}
              <div className="fixed bottom-8 right-8 z-40 flex gap-4">
                <button
                  onClick={() => setShowActions(true)}
                  className="text-blue-500 text-sm lowercase hover:underline"
                >
                  action({selectedRefIds.size})
                </button>
                <button
                  onClick={() => setShowFilters(true)}
                  className="text-blue-500 text-sm lowercase hover:underline"
                >
                  filters
                </button>
              </div>

              {/* Action Modal */}
              {showActions && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  onClick={() => setShowActions(false)}
                >
                  <div
                    className="bg-gray-50 max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 space-y-6 flex flex-col items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-6 w-full max-w-md">
                      <div className="text-sm text-gray-500 text-center">
                        {selectedRefIds.size} image(s) selected
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="text-sm text-gray-500 text-center">selection</div>
                        <div className="flex gap-4 justify-center">
                          <button
                            onClick={selectAllRefs}
                            className="text-sm text-blue-500 lowercase hover:underline"
                          >
                            select-all
                          </button>
                          <button
                            onClick={deselectAllRefs}
                            className="text-sm text-blue-500 lowercase hover:underline"
                          >
                            deselect-all
                          </button>
                        </div>
                      </div>

                      {selectedRefIds.size > 0 && (
                        <>
                          <div className="flex flex-col gap-2">
                            <div className="text-sm text-gray-500 text-center">model</div>
                            <div className="flex justify-center">
                              <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value as ImageModel)}
                                className="px-3 py-2 border border-gray-400 text-sm text-gray-500"
                              >
                                <option value="google/nano-banana">Nano Banana</option>
                                <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
                                <option value="black-forest-labs/flux-kontext-pro">FLUX Kontext Pro</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="text-sm text-gray-500 text-center">generate</div>
                            <div className="flex justify-center">
                              <button
                                onClick={() => {
                                  handleExtractPosesFromRefs();
                                  setShowActions(false);
                                }}
                                disabled={isExtractingRefs}
                                className="text-sm text-blue-500 lowercase hover:underline disabled:opacity-50"
                              >
                                start
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="text-sm text-gray-500 text-center">delete</div>
                            <div className="flex justify-center">
                              <button
                                onClick={() => {
                                  handleDeleteRefs();
                                  setShowActions(false);
                                }}
                                disabled={isExtractingRefs}
                                className="text-sm text-blue-500 lowercase hover:underline disabled:opacity-50"
                              >
                                delete-selected
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {isExtractingRefs && (
                        <div className="text-sm space-y-1">
                          <div className="text-green-600 font-medium">
                            Extracting poses...
                          </div>
                          <div className="text-gray-600">
                            {extractionProgress.current} / {extractionProgress.total}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all"
                              style={{
                                width: `${(extractionProgress.current / extractionProgress.total) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Filter Modal */}
              {showFilters && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                  onClick={() => setShowFilters(false)}
                >
                  <div
                    className="bg-gray-50 max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 space-y-6 flex flex-col items-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Filters */}
                    <div className="space-y-6 w-full max-w-2xl">
                    <div className="flex flex-col gap-2">
                      <div className="text-sm text-gray-500 text-center">view mode</div>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => setViewMode('generated')}
                          className={`px-4 py-2 text-sm border border-gray-400 ${
                            viewMode === 'generated'
                              ? 'bg-black text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          generated
                        </button>
                        <button
                          onClick={() => setViewMode('refs')}
                          className={`px-4 py-2 text-sm border border-gray-400 ${
                            viewMode === 'refs'
                              ? 'bg-black text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          references
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="text-sm text-gray-500 text-center">body part</div>
                      <div className="flex gap-2 flex-wrap justify-center">
                        {['all', 'full-body', 'hands', 'feet', 'portraits'].map(part => (
                          <button
                            key={part}
                            onClick={() => setRefBodyPart(part)}
                            className={`px-4 py-2 text-sm border border-gray-400 ${
                              refBodyPart === part
                                ? 'bg-black text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {part.replace('-', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="text-sm text-gray-500 text-center">gender</div>
                      <div className="flex gap-2 justify-center">
                        {['all', 'male', 'female'].map(g => (
                          <button
                            key={g}
                            onClick={() => setRefGender(g)}
                            className={`px-4 py-2 text-sm border border-gray-400 ${
                              refGender === g
                                ? 'bg-black text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="text-sm text-gray-500 text-center">display</div>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => setShowGenerationInfo(true)}
                          className={`px-4 py-2 text-sm border border-gray-400 ${
                            showGenerationInfo
                              ? 'bg-black text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          with generation info
                        </button>
                        <button
                          onClick={() => setShowGenerationInfo(false)}
                          className={`px-4 py-2 text-sm border border-gray-400 ${
                            !showGenerationInfo
                              ? 'bg-black text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          refs only
                        </button>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500 text-center">
                      {refs.length} reference image(s)
                      {loading && ' (loading...)'}
                    </div>
                  </div>
                    </div>
                  </div>
              )}

              {/* Reference Images Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {refs.map(ref => (
                  <div
                    key={ref.id}
                    className="relative group"
                  >
                    {/* Select button - only show on hover */}
                    <div className="absolute top-3 left-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleRefSelect(ref.id)}
                        className="text-blue-500 text-xs lowercase hover:underline"
                      >
                        {selectedRefIds.has(ref.id) ? 'deselect' : 'select'}
                      </button>
                    </div>

                    {/* Selected indicator - center, hidden on hover */}
                    {selectedRefIds.has(ref.id) && (
                      <div className="absolute inset-0 flex items-center justify-center z-20 opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none">
                        <div className="text-blue-500 text-sm lowercase">
                          selected
                        </div>
                      </div>
                    )}

                    {/* Status badge - only show when generation info is enabled */}
                    {showGenerationInfo && (
                      <>
                        {ref.generation_status === 'success' && (
                          <div className="absolute top-2 right-2 z-10 bg-green-600 text-white text-xs px-2 py-1 rounded">
                            ✓ Success
                          </div>
                        )}
                        {ref.generation_status === 'blocked' && (
                          <div className="absolute top-2 right-2 z-10 bg-orange-600 text-white text-xs px-2 py-1 rounded">
                            ⚠ Blocked
                          </div>
                        )}
                        {ref.generation_status === 'failed' && (
                          <div className="absolute top-2 right-2 z-10 bg-red-600 text-white text-xs px-2 py-1 rounded">
                            ✕ Failed
                          </div>
                        )}
                        {ref.generation_status === 'processing' && (
                          <div className="absolute top-2 right-2 z-10 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                            ⟳ Processing
                          </div>
                        )}
                      </>
                    )}

                    {/* Image */}
                    <div
                      className={`aspect-square relative overflow-hidden cursor-pointer ${selectedRefIds.has(ref.id) ? 'opacity-20' : ''}`}
                      onClick={() => setFullscreenRef(ref)}
                    >
                      {showGenerationInfo && ref.generatedImage ? (
                        // Show ref + generated side by side
                        <div className="flex h-full">
                          <div className="w-1/2 relative">
                            <img
                              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${ref.filename}`}
                              alt="Reference"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="w-1/2 relative">
                            <img
                              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/drawing-images/${ref.generatedImage.storage_path}`}
                              alt="Generated"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      ) : (
                        <img
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${ref.filename}`}
                          alt={ref.filename}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Metadata overlay on hover */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-75 transition-all duration-200 flex flex-col justify-between opacity-0 group-hover:opacity-100 pointer-events-none">
                      {/* Select button area - aligned to top */}
                      <div className="p-3">
                        {/* Spacer for select button */}
                      </div>

                      {/* Metadata - aligned to bottom */}
                      <div className="p-3 text-white text-xs space-y-1 w-full">
                        <div className="font-medium truncate">{ref.filename}</div>
                        {ref.body_part && <div>part: {ref.body_part.replace('_', ' ')}</div>}
                        {ref.gender && <div>gender: {ref.gender}</div>}
                        {ref.platform && <div>source: {ref.platform}</div>}
                        <div className="text-gray-300 pt-1 border-t border-gray-600">
                          created: {formatDate(ref.created_at)}
                        </div>
                        {ref.generation_attempts > 0 && (
                          <div className="text-yellow-300 text-xs">
                            attempts: {ref.generation_attempts}
                          </div>
                        )}
                        {ref.last_error && (
                          <div className="text-red-300 text-xs truncate" title={ref.last_error}>
                            error: {ref.last_error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {refs.length === 0 && (
                <div className="text-center text-gray-500 py-12">
                  No reference images found
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-gray-50 z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative h-full flex gap-4 items-center">
            {fullscreenImage.base_image_id && (fullscreenImage as any).baseImage ? (
              <>
                {/* Base image */}
                <img
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/drawing-images/${(fullscreenImage as any).baseImage.storage_path}`}
                  alt="Base"
                  className="h-full object-contain"
                />
                {/* Clothed image */}
                <img
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/drawing-images/${fullscreenImage.storage_path}`}
                  alt="Clothed"
                  className="h-full object-contain"
                />
              </>
            ) : (
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/drawing-images/${fullscreenImage.storage_path}`}
                alt="Reference"
                className="max-w-full max-h-screen object-contain"
              />
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Ref Modal */}
      {fullscreenRef && (
        <div
          className="fixed inset-0 bg-gray-50 z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreenRef(null)}
        >
          <div className="relative h-full flex gap-4 items-center">
            {showGenerationInfo && fullscreenRef.generatedImage ? (
              <>
                {/* Reference image */}
                <img
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${fullscreenRef.filename}`}
                  alt="Reference"
                  className="h-full object-contain"
                />
                {/* Generated image */}
                <img
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/drawing-images/${fullscreenRef.generatedImage.storage_path}`}
                  alt="Generated"
                  className="h-full object-contain"
                />
              </>
            ) : (
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${fullscreenRef.filename}`}
                alt={fullscreenRef.filename}
                className="max-w-full max-h-screen object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
