import { supabase, DrawingImage } from '../lib/supabase';
import { ReplicateService } from './replicateService';
import { generateDrawingPrompt } from '../utils/promptGenerator';

export class ImagePoolService {
  private replicateService: ReplicateService;

  constructor() {
    this.replicateService = new ReplicateService();
  }

  async getImagesForSession(count: number): Promise<DrawingImage[]> {
    try {
      // First, try to get images from the pool
      const { data: availableImages, error } = await supabase
        .from('drawing_images')
        .select('*')
        .order('used_count', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(count);

      if (error) {
        throw error;
      }

      const existingCount = availableImages?.length || 0;

      // If we don't have enough images, generate more
      if (existingCount < count) {
        const needToGenerate = count - existingCount;
        console.log(`Need to generate ${needToGenerate} more images`);

        const newImages = await this.generateImages(needToGenerate);

        // Combine existing and new images
        return [...(availableImages || []), ...newImages];
      }

      // Mark these images as used
      const imageIds = availableImages.map(img => img.id);
      await this.markImagesAsUsed(imageIds);

      return availableImages;
    } catch (error) {
      console.error('Failed to get images for session:', error);
      throw error;
    }
  }

  async generateImages(
    count: number,
    category: string = 'full-body',
    gender: string = 'female',
    clothing: string = 'minimal'
  ): Promise<DrawingImage[]> {
    console.log(`🚀 Starting parallel generation of ${count} images...`);

    // Create array of generation promises
    const generationPromises = Array.from({ length: count }, async (_, i) => {
      try {
        console.log(`📝 Generating image ${i + 1}/${count}...`);

        // Generate prompt with random attributes
        const { prompt, bodyType, race, pose } = generateDrawingPrompt(category, gender, clothing);

        // Generate image using Replicate (this is the slow part)
        const imageUrl = await this.replicateService.generateImage(prompt);
        console.log(`✅ Generated image ${i + 1}/${count} successfully`);

        // Download and upload to Supabase Storage
        const storagePath = await this.uploadImageToStorage(imageUrl);

        // Determine actual gender for storage
        const actualGender = gender === 'both' ? (Math.random() > 0.5 ? 'male' : 'female') : gender;

        // Get current user (null = public image)
        const { data: { user } } = await supabase.auth.getUser();

        // Save metadata to database using new schema
        const { data, error } = await supabase
          .from('drawing_images')
          .insert({
            image_url: imageUrl,
            storage_path: storagePath,
            prompt,
            category: category,
            subject_type: actualGender,
            clothing_state: clothing,
            attributes: {
              body_type: bodyType,
              race: race,
              pose: pose
            },
            user_id: user?.id || null, // null = public for everyone
            // Keep old columns for backward compatibility
            body_type: bodyType,
            race: race,
            pose: pose
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        console.log(`💾 Saved image ${i + 1}/${count} to database`);
        return data;
      } catch (error) {
        console.error(`❌ Failed to generate image ${i + 1}:`, error);
        return null; // Return null for failed generations
      }
    });

    // Wait for all generations to complete
    console.log(`⏳ Waiting for all ${count} images to complete...`);
    const results = await Promise.all(generationPromises);

    // Filter out failed generations
    const successfulImages = results.filter((img): img is DrawingImage => img !== null);

    console.log(`🎉 Completed ${successfulImages.length}/${count} images successfully`);
    return successfulImages;
  }

  private async uploadImageToStorage(imageUrl: string): Promise<string> {
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
          upsert: false
        });

      if (error) {
        throw error;
      }

      return data.path;
    } catch (error) {
      console.error('Failed to upload image to storage:', error);
      throw error;
    }
  }

  private async markImagesAsUsed(imageIds: string[]): Promise<void> {
    try {
      // Update each image individually to increment used_count
      for (const imageId of imageIds) {
        const { error } = await supabase.rpc('increment_image_usage', {
          image_id: imageId
        });

        if (error) {
          console.error(`Failed to mark image ${imageId} as used:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to mark images as used:', error);
      // Non-critical error, don't throw
    }
  }

  async getPoolStats(): Promise<{ total: number; recent: number }> {
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
        recent: recent || 0
      };
    } catch (error) {
      console.error('Failed to get pool stats:', error);
      return { total: 0, recent: 0 };
    }
  }
}