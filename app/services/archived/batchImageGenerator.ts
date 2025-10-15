/**
 * Batch Image Generator
 *
 * Simple service for generating multiple AI images in parallel.
 */

import { ImageGenerationService, ImageModel } from './imageGenerationService';
import { GeneratedImagesService, DrawingImage } from './generatedImagesService';
import { generateDrawingPrompt } from './promptGenerator';

/**
 * Generate multiple images with prompts in parallel
 */
export async function generateBatchImages(
  count: number,
  category: 'full-body' | 'hands' | 'feet' | 'portraits',
  gender: 'male' | 'female' | 'both',
  clothing: 'minimal' | 'clothed',
  model: ImageModel = 'google/nano-banana'
): Promise<DrawingImage[]> {
  console.log(`🚀 Generating ${count} images with ${model}...`);

  const generationService = new ImageGenerationService();
  const imagesService = new GeneratedImagesService();

  // Generate all images in parallel
  const promises = Array.from({ length: count }, async (_, i) => {
    try {
      console.log(`📝 [${i + 1}/${count}] Generating...`);

      // Generate prompt
      const { prompt, bodyType, race, pose } = generateDrawingPrompt(category, gender, clothing);

      // Generate image
      const result = await generationService.generateImage({
        prompt,
        model,
        generationType: 'text-to-image',
      });

      // Upload to storage
      const storagePath = await imagesService.uploadToStorage(result.imageUrl);

      // Determine actual gender for storage
      const actualGender = gender === 'both' ? (Math.random() > 0.5 ? 'male' : 'female') : gender;

      // Save to database
      const image = await imagesService.create({
        imageUrl: result.imageUrl,
        storagePath,
        prompt,
        category,
        subjectType: actualGender,
        clothingState: clothing,
        attributes: { body_type: bodyType, race, pose },
        model: result.model,
        generationType: result.generationType,
        userId: null,
      });

      console.log(`✅ [${i + 1}/${count}] Success`);
      return image;
    } catch (error) {
      console.error(`❌ [${i + 1}/${count}] Failed:`, error);
      return null;
    }
  });

  const results = await Promise.all(promises);
  const successful = results.filter((img): img is DrawingImage => img !== null);

  console.log(`🎉 Completed ${successful.length}/${count} images`);
  return successful;
}
