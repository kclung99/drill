/**
 * Clothing Generator
 *
 * Add clothing to existing minimal clothing images.
 */

import { ImageGenerationService } from './imageGenerationService';
import { GeneratedImagesService, DrawingImage } from './generatedImagesService';
import { withRetry } from './retryHelper';

const CLOTHING_OPTIONS = [
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

/**
 * Generate clothed version of a single image
 */
export async function generateClothedVersion(
  baseImage: DrawingImage,
  maxRetries: number = 2
): Promise<DrawingImage> {
  const generationService = new ImageGenerationService();
  const imagesService = new GeneratedImagesService();

  console.log(`👔 Generating clothed version...`);

  return withRetry(
    async () => {
      // Fetch the base image
      const imageResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/drawing-images/${baseImage.storage_path}`
      );
      const imageBlob = await imageResponse.blob();
      const buffer = await imageBlob.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString('base64');

      // Get attributes
      const attrs = baseImage.attributes as any;
      const bodyType = attrs?.body_type || '';
      const race = attrs?.race || '';
      const pose = attrs?.pose || '';

      // Pick random clothing
      const clothing = CLOTHING_OPTIONS[Math.floor(Math.random() * CLOTHING_OPTIONS.length)];

      // Create prompt
      const prompt = `Add ${clothing} to this person. ${bodyType} ${race} ${baseImage.subject_type} ${pose}. Keep the same pose and body position. Neutral grey background with soft spotlight.`;

      // Generate clothed image
      const result = await generationService.generateImage({
        prompt,
        model: 'gemini-2.5-flash-image',
        generationType: 'image-to-image',
        baseImage: base64Image,
      });

      // Upload to storage
      const storagePath = await imagesService.uploadToStorage(result.imageUrl);

      // Save to database
      const image = await imagesService.create({
        imageUrl: result.imageUrl,
        storagePath,
        prompt,
        category: baseImage.category,
        subjectType: baseImage.subject_type,
        clothingState: 'clothed',
        attributes: baseImage.attributes,
        model: result.model,
        generationType: result.generationType,
        baseImageId: baseImage.id,
        userId: null,
      });

      return image;
    },
    {
      maxRetries,
      retryOnContentFilter: true,
      onAttempt: (attempt, max) => {
        console.log(`🔄 Retry ${attempt}/${max}...`);
      },
      onError: (error, errorType, attempt) => {
        if (errorType === 'CONTENT_FILTERED') {
          console.warn(`⚠️  Attempt ${attempt + 1} blocked by content filters`);
        } else {
          const errorMessage = error?.message || String(error);
          console.warn(`⚠️  Attempt ${attempt + 1} failed: ${errorMessage}`);
        }
      },
    }
  ).then((result) => {
    console.log(`✅ Clothed version generated`);
    return result;
  });
}

/**
 * Generate clothed versions for multiple images in parallel
 */
export async function generateClothedVersions(
  baseImages: DrawingImage[],
  maxRetries: number = 2
): Promise<DrawingImage[]> {
  console.log(`🎨 Generating clothed versions for ${baseImages.length} images...`);

  const promises = baseImages.map(async (baseImage, i) => {
    try {
      console.log(`[${i + 1}/${baseImages.length}] Generating...`);
      const result = await generateClothedVersion(baseImage, maxRetries);
      console.log(`✅ [${i + 1}/${baseImages.length}] Success`);
      return result;
    } catch (error) {
      console.error(`❌ [${i + 1}/${baseImages.length}] Failed:`, error);
      return null;
    }
  });

  const results = await Promise.all(promises);
  const successful = results.filter((img): img is DrawingImage => img !== null);

  console.log(`🎉 Generated ${successful.length}/${baseImages.length} clothed versions`);
  return successful;
}
