/**
 * Pose Extractor
 *
 * Extract poses from reference images and generate new images.
 */

import { ImageGenerationService, ImageModel } from './imageGenerationService';
import { GeneratedImagesService, DrawingImage } from './generatedImagesService';
import { generateDrawingPrompt } from './promptGenerator';
import { withRetry } from './retryHelper';

/**
 * Generate image from reference pose
 */
export async function extractPoseAndGenerate(
  poseImageDataUrl: string,
  gender: 'male' | 'female' = 'female',
  model: ImageModel = 'google/nano-banana',
  maxRetries: number = 2
): Promise<DrawingImage> {
  console.log(`🎭 Extracting pose with ${model} (${gender})...`);

  const generationService = new ImageGenerationService();
  const imagesService = new GeneratedImagesService();

  const base64Image = poseImageDataUrl.split(',')[1];

  // Create prompt based on gender
  const prompt =
    gender === 'male'
      ? `Keep the exact same full body pose and position from head to toe. Wearing athletic shorts, barefoot. No jewelry or decorative items. Swap out the head. Neutral grey background with soft spotlight.`
      : `Keep the exact same full body pose and position from head to toe. Wearing skin-tone short athletic top and tight shorts, barefoot. No jewelry or decorative items. Swap out the head. Neutral grey background with soft spotlight.`;

  return withRetry(
    async () => {
      // Generate using image-to-image
      const result = await generationService.generateImage({
        prompt,
        model,
        generationType: 'image-to-image',
        baseImage: base64Image,
      });

      // Upload to storage
      const storagePath = await imagesService.uploadToStorage(result.imageUrl);

      // Generate random attributes for metadata
      const { bodyType, race } = generateDrawingPrompt('full-body', gender, 'minimal');

      // Save to database
      const image = await imagesService.create({
        imageUrl: result.imageUrl,
        storagePath,
        prompt,
        category: 'full-body',
        subjectType: gender,
        clothingState: 'minimal',
        attributes: {
          body_type: bodyType,
          race,
          pose: 'extracted from reference',
        },
        model: result.model,
        generationType: result.generationType,
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
    console.log('✅ Pose extraction successful');
    return result;
  });
}
