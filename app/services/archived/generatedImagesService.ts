/**
 * Generated Images Service
 *
 * CRUD operations for AI-generated images in the drawing_images table.
 */

import { supabase } from '../../lib/supabase';

export interface DrawingImage {
  id: string;
  image_url: string;
  storage_path: string;
  prompt: string;
  category: string;
  subject_type: string;
  clothing_state: string;
  attributes: {
    body_type?: string;
    race?: string;
    pose?: string;
  };
  model: string;
  generation_type: string;
  base_image_id: string | null;
  ref_image_id: string | null;
  user_id: string | null;
  used_count: number;
  created_at: string;
}

export interface CreateImageData {
  imageUrl: string;
  storagePath: string;
  prompt: string;
  category: string;
  subjectType: string;
  clothingState: string;
  attributes: {
    body_type?: string;
    race?: string;
    pose?: string;
  };
  model: string;
  generationType: string;
  baseImageId?: string | null;
  refImageId?: string | null;
  userId?: string | null;
}

export interface FilterOptions {
  category?: string;
  gender?: string;
  clothing?: string;
  limit?: number;
}

/**
 * Service for managing generated drawing images
 */
export class GeneratedImagesService {
  /**
   * Create a new generated image record
   */
  async create(data: CreateImageData): Promise<DrawingImage> {
    const { data: image, error } = await supabase
      .from('drawing_images')
      .insert({
        image_url: data.imageUrl,
        storage_path: data.storagePath,
        prompt: data.prompt,
        category: data.category,
        subject_type: data.subjectType,
        clothing_state: data.clothingState,
        attributes: data.attributes,
        model: data.model,
        generation_type: data.generationType,
        base_image_id: data.baseImageId || null,
        ref_image_id: data.refImageId || null,
        user_id: data.userId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return image;
  }

  /**
   * Get images by filters
   */
  async getByFilters(filters: FilterOptions = {}): Promise<DrawingImage[]> {
    let query = supabase
      .from('drawing_images')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.clothing) {
      query = query.eq('clothing_state', filters.clothing);
    }

    if (filters.gender && filters.gender !== 'both') {
      query = query.eq('subject_type', filters.gender);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Get least-used images for session selection
   */
  async getLeastUsed(
    count: number,
    category: string,
    gender: string,
    clothing: string
  ): Promise<DrawingImage[]> {
    const fetchCount = Math.min(count * 3, 50);

    let query = supabase
      .from('drawing_images')
      .select('*')
      .eq('category', category)
      .eq('clothing_state', clothing);

    if (gender !== 'both') {
      query = query.eq('subject_type', gender);
    }

    const { data, error } = await query
      .order('used_count', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(fetchCount);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get a single image by ID
   */
  async getById(id: string): Promise<DrawingImage | null> {
    const { data, error } = await supabase
      .from('drawing_images')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data;
  }

  /**
   * Delete images by IDs
   */
  async deleteByIds(ids: string[]): Promise<void> {
    // First, get the storage paths
    const { data: images } = await supabase
      .from('drawing_images')
      .select('storage_path')
      .in('id', ids);

    if (images && images.length > 0) {
      // Delete from storage
      const storagePaths = images.map((img) => img.storage_path);
      const { error: storageError } = await supabase.storage
        .from('drawing-images')
        .remove(storagePaths);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('drawing_images')
      .delete()
      .in('id', ids);

    if (dbError) throw dbError;
  }

  /**
   * Increment usage count for images
   */
  async incrementUsageCount(imageIds: string[]): Promise<void> {
    for (const imageId of imageIds) {
      const { error } = await supabase.rpc('increment_image_usage', {
        image_id: imageId,
      });

      if (error) {
        console.error(`Failed to increment usage for image ${imageId}:`, error);
      }
    }
  }

  /**
   * Upload image blob to storage
   */
  async uploadToStorage(imageUrl: string): Promise<string> {
    try {
      // Download the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const imageBlob = await response.blob();
      const fileName = `drawing-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('drawing-images')
        .upload(fileName, imageBlob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      return data.path;
    } catch (error) {
      console.error('Failed to upload image to storage:', error);
      throw error;
    }
  }

  /**
   * Get statistics about the image pool
   */
  async getStats(): Promise<{ total: number; recent: number }> {
    try {
      const { count: total } = await supabase
        .from('drawing_images')
        .select('*', { count: 'exact', head: true });

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recent } = await supabase
        .from('drawing_images')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo);

      return {
        total: total || 0,
        recent: recent || 0,
      };
    } catch (error) {
      console.error('Failed to get pool stats:', error);
      return { total: 0, recent: 0 };
    }
  }
}
