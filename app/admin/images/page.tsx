'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, DrawingImage } from '@/app/lib/supabase';
import { isAdmin } from '@/app/lib/adminAuth';
import { ImagePoolService } from '@/app/services/imagePoolService';
import { ImageModel } from '@/app/services/imageGenerationService';
import { NavBar } from '@/components/nav-bar';

export default function AdminImagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<DrawingImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<DrawingImage | null>(null);
  const [poseImage, setPoseImage] = useState<string | null>(null);
  const [isPoseExtracting, setIsPoseExtracting] = useState(false);

  // Filters
  const [category, setCategory] = useState<string>('full-body');
  const [gender, setGender] = useState<string>('female');
  const [clothing, setClothing] = useState<string>('minimal');
  const [selectedModel, setSelectedModel] = useState<ImageModel>('gemini-2.5-flash-image');

  const imagePoolService = new ImagePoolService();

  // Check admin access
  useEffect(() => {
    const checkAdmin = async () => {
      const admin = await isAdmin();
      if (!admin) {
        router.push('/');
        return;
      }
      setLoading(false);
    };
    checkAdmin();
  }, [router]);

  // Load images when filters change
  useEffect(() => {
    if (!loading) {
      loadImages();
    }
  }, [category, gender, clothing, loading]);

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
      <NavBar currentPage="home" showMidiStatus={false} />

      <div className="p-8">
        <div className="max-w-7xl mx-auto">

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
                            : 'bg-white text-gray-600 hover:bg-gray-100'
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
                            : 'bg-white text-gray-600 hover:bg-gray-100'
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
                              : 'bg-white text-gray-600 hover:bg-gray-100'
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
                    className="px-3 py-2 border border-gray-400 text-sm"
                  >
                    <option value="ideogram-ai/ideogram-v3-turbo">Ideogram v3 Turbo</option>
                    <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
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
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
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
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
