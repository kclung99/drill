import { supabase, DrawingImage } from '../lib/supabase';
import { ImageGenerationService, ImageModel } from './imageGenerationService';
import { generateDrawingPrompt } from '../utils/promptGenerator';

export class ImagePoolService {
  private imageGenerationService: ImageGenerationService;
  private defaultModel: ImageModel = 'gemini-2.5-flash-image';

  constructor(defaultModel?: ImageModel) {
    this.imageGenerationService = new ImageGenerationService();
    if (defaultModel) {
      this.defaultModel = defaultModel;
      this.imageGenerationService.setDefaultModel(defaultModel);
    } else {
      this.imageGenerationService.setDefaultModel(this.defaultModel);
    }
  }

  setDefaultModel(model: ImageModel) {
    this.defaultModel = model;
    this.imageGenerationService.setDefaultModel(model);
  }

  async getImagesForSession(
    count: number,
    category: string = 'full-body',
    gender: string = 'female',
    clothing: string = 'minimal'
  ): Promise<DrawingImage[]> {
    try {
      // Build query with filters - fetch more than needed for randomization
      const fetchCount = Math.min(count * 3, 50); // Fetch 3x what we need (up to 50) for better randomization

      let query = supabase
        .from('drawing_images')
        .select('*')
        .eq('category', category)
        .eq('clothing_state', clothing);

      // Filter by gender (handle 'both' case)
      if (gender !== 'both') {
        query = query.eq('subject_type', gender);
      }

      // Get images prioritizing least used, but fetch more for randomization
      const { data: availableImages, error } = await query
        .order('used_count', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(fetchCount);

      if (error) {
        throw error;
      }

      const existingCount = availableImages?.length || 0;

      // If we don't have enough images at all, generate more
      if (existingCount < count) {
        const needToGenerate = count - existingCount;
        console.log(`Need to generate ${needToGenerate} more images for ${category}/${gender}/${clothing}`);

        const newImages = await this.generateImages(needToGenerate, category, gender, clothing);

        // Combine existing and new images
        const combined = [...(availableImages || []), ...newImages];

        // Mark selected images as used
        const imageIds = combined.map(img => img.id);
        await this.markImagesAsUsed(imageIds);

        return combined;
      }

      // Randomly select from the pool of least-used images
      const selectedImages = this.randomlySelectImages(availableImages, count);

      // Mark selected images as used
      const imageIds = selectedImages.map(img => img.id);
      await this.markImagesAsUsed(imageIds);

      return selectedImages;
    } catch (error) {
      console.error('Failed to get images for session:', error);
      throw error;
    }
  }

  private randomlySelectImages(images: DrawingImage[], count: number): DrawingImage[] {
    // Fisher-Yates shuffle algorithm
    const shuffled = [...images];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  async generateImages(
    count: number,
    category: string = 'full-body',
    gender: string = 'female',
    clothing: string = 'minimal',
    model?: ImageModel
  ): Promise<DrawingImage[]> {
    console.log(`🚀 Starting parallel generation of ${count} images...`);

    const modelToUse = model || this.defaultModel;

    // Create array of generation promises
    const generationPromises = Array.from({ length: count }, async (_, i) => {
      return this.generateSingleImageWithRetry(i + 1, count, category, gender, clothing, modelToUse);
    });

    // Wait for all generations to complete
    console.log(`⏳ Waiting for all ${count} images to complete...`);
    const results = await Promise.all(generationPromises);

    // Filter out failed generations
    const successfulImages = results.filter((img): img is DrawingImage => img !== null);

    console.log(`🎉 Completed ${successfulImages.length}/${count} images successfully`);
    return successfulImages;
  }

  private async generateSingleImageWithRetry(
    imageNum: number,
    totalCount: number,
    category: string,
    gender: string,
    clothing: string,
    model: ImageModel,
    maxRetries: number = 2
  ): Promise<DrawingImage | null> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retrying image ${imageNum}/${totalCount} (attempt ${attempt + 1}/${maxRetries + 1})...`);
        } else {
          console.log(`📝 Generating image ${imageNum}/${totalCount} with ${model}...`);
        }

        // Generate prompt with random attributes
        const { prompt, bodyType, race, pose } = generateDrawingPrompt(category, gender, clothing);

        // Generate image using selected model
        const result = await this.imageGenerationService.generateImage({
          prompt,
          model,
          generationType: 'text-to-image'
        });
        console.log(`✅ Generated image ${imageNum}/${totalCount} successfully`);

        // Download and upload to Supabase Storage
        const storagePath = await this.uploadImageToStorage(result.imageUrl);

        // Determine actual gender for storage
        const actualGender = gender === 'both' ? (Math.random() > 0.5 ? 'male' : 'female') : gender;

        // Save metadata to database using new schema
        // All admin-generated images are public (user_id = null)
        const { data, error } = await supabase
          .from('drawing_images')
          .insert({
            image_url: result.imageUrl,
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
            model: result.model,
            generation_type: result.generationType,
            user_id: null // All images are public/shared
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        console.log(`💾 Saved image ${imageNum}/${totalCount} to database`);
        return data;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          console.log(`⚠️  Image ${imageNum} failed, will retry...`);
        } else {
          console.error(`❌ Failed to generate image ${imageNum} after ${maxRetries + 1} attempts:`, error);
        }
      }
    }

    return null; // Return null after all retries exhausted
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

  async generateFromPose(poseImageDataUrl: string, maxRetries: number = 2): Promise<DrawingImage> {
    console.log('🎭 Extracting pose and generating new image...');

    const base64Image = poseImageDataUrl.split(',')[1];
    const prompt = `Keep the exact same full body pose and position from head to toe. Wearing skin-tone short athletic top and tight shorts, barefoot. No jewelry or decorative items. Swap out the head. Neutral grey background with soft spotlight.`;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retrying pose extraction (attempt ${attempt + 1}/${maxRetries + 1})...`);
        }

        console.log('📝 Pose extraction prompt:', prompt);

        // Generate random attributes for metadata storage only
        const { bodyType, race } = generateDrawingPrompt('full-body', 'female', 'minimal');

        // Generate using Gemini img2img
        const result = await this.imageGenerationService.generateImage({
          prompt,
          model: 'gemini-2.5-flash-image',
          generationType: 'image-to-image',
          baseImage: base64Image,
        });

        // Upload to storage
        const storagePath = await this.uploadImageToStorage(result.imageUrl);

        // Save to database
        const { data, error } = await supabase
          .from('drawing_images')
          .insert({
            image_url: result.imageUrl,
            storage_path: storagePath,
            prompt,
            category: 'full-body',
            subject_type: 'female',
            clothing_state: 'minimal',
            attributes: {
              body_type: bodyType,
              race: race,
              pose: 'extracted from reference',
            },
            model: result.model,
            generation_type: result.generationType,
            user_id: null,
          })
          .select()
          .single();

        if (error) throw error;

        console.log('✅ Successfully generated image from pose');
        return data;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || String(error);

        // Check if it's a content moderation block
        if (errorMessage.includes('IMAGE_OTHER') || errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
          console.warn(`⚠️  Attempt ${attempt + 1} blocked by content filters`);
          if (attempt < maxRetries) {
            console.log('🔄 Retrying...');
            continue; // Try again without throwing
          } else {
            console.error('❌ Failed after all retries due to content filtering');
            throw new Error('Content filtered: Image generation blocked by safety filters. Try a different reference image.');
          }
        } else {
          console.warn(`⚠️  Attempt ${attempt + 1} failed:`, errorMessage);
          if (attempt < maxRetries) {
            console.log('🔄 Retrying...');
            continue; // Try again without throwing
          } else {
            console.error('❌ Failed after all retries');
            throw new Error(`Failed to generate from pose after ${maxRetries + 1} attempts: ${errorMessage}`);
          }
        }
      }
    }

    // If we get here, all retries failed
    throw lastError;
  }

  async generateClothedVersions(baseImages: DrawingImage[]): Promise<DrawingImage[]> {
    console.log(`🎨 Generating clothed versions for ${baseImages.length} images...`);

    const results = await Promise.all(
      baseImages.map(async (baseImage, i) => {
        try {
          console.log(`👔 Generating clothed version ${i + 1}/${baseImages.length}...`);

          // Fetch the base image and convert to base64
          const imageResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/drawing-images/${baseImage.storage_path}`
          );
          const imageBlob = await imageResponse.blob();
          const buffer = await imageBlob.arrayBuffer();
          const base64Image = Buffer.from(buffer).toString('base64');

          // Extract attributes from base image
          const attrs = baseImage.attributes as any;
          const bodyType = attrs?.body_type || '';
          const race = attrs?.race || '';
          const pose = attrs?.pose || '';

          // Random clothing options for variety
          const clothingOptions = [
            'casual t-shirt and jeans',
            'business casual outfit',
            'athletic wear',
            'summer dress',
            'hoodie and joggers',
            'formal business suit',
            'casual button-up shirt and chinos',
            'sweater and slacks',
            'tank top and shorts',
            'blouse and skirt',
          ];
          const clothing = clothingOptions[Math.floor(Math.random() * clothingOptions.length)];

          // Generate clothing prompt
          const prompt = `Add ${clothing} to this person. ${bodyType} ${race} ${baseImage.subject_type} ${pose}. Keep the same pose and body position. Neutral grey background with soft spotlight.`;

          // Generate clothed image using Gemini
          const result = await this.imageGenerationService.generateImage({
            prompt,
            model: 'gemini-2.5-flash-image',
            generationType: 'image-to-image',
            baseImage: base64Image,
          });

          // Upload to storage
          const storagePath = await this.uploadImageToStorage(result.imageUrl);

          // Save to database with base_image_id link
          const { data, error } = await supabase
            .from('drawing_images')
            .insert({
              image_url: result.imageUrl,
              storage_path: storagePath,
              prompt,
              category: baseImage.category,
              subject_type: baseImage.subject_type,
              clothing_state: 'clothed',
              attributes: baseImage.attributes,
              model: result.model,
              generation_type: result.generationType,
              base_image_id: baseImage.id,
              user_id: null,
            })
            .select()
            .single();

          if (error) throw error;

          console.log(`✅ Generated clothed version ${i + 1}/${baseImages.length}`);
          return data;
        } catch (error) {
          console.error(`❌ Failed to generate clothed version ${i + 1}:`, error);
          return null;
        }
      })
    );

    const successful = results.filter((img): img is DrawingImage => img !== null);
    console.log(`🎉 Generated ${successful.length}/${baseImages.length} clothed versions`);
    return successful;
  }
}