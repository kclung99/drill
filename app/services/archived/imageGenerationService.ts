/**
 * Image Generation Service
 *
 * Modular service for generating images using various AI models.
 * Supports both text-to-image and image-to-image generation.
 */

export type ImageModel =
  | 'ideogram-ai/ideogram-v3-turbo'
  | 'gemini-2.5-flash-image'
  | 'google/nano-banana'
  | 'black-forest-labs/flux-kontext-pro';

export type GenerationType = 'text-to-image' | 'image-to-image';

export interface GenerateImageOptions {
  prompt: string;
  model?: ImageModel;
  generationType?: GenerationType;
  baseImage?: string; // Base64 data URL for image-to-image
}

export interface GenerateImageResult {
  imageUrl: string;
  model: ImageModel;
  generationType: GenerationType;
}

/**
 * Model capabilities configuration
 */
const MODEL_CAPABILITIES: Record<ImageModel, { supportsImg2Img: boolean }> = {
  'ideogram-ai/ideogram-v3-turbo': { supportsImg2Img: false },
  'gemini-2.5-flash-image': { supportsImg2Img: true },
  'google/nano-banana': { supportsImg2Img: true },
  'black-forest-labs/flux-kontext-pro': { supportsImg2Img: true },
};

/**
 * Model API endpoints
 */
const MODEL_ENDPOINTS: Record<ImageModel, string> = {
  'ideogram-ai/ideogram-v3-turbo': '/api/generate-image',
  'gemini-2.5-flash-image': '/api/generate-image-gemini',
  'google/nano-banana': '/api/generate-image-nano-banana',
  'black-forest-labs/flux-kontext-pro': '/api/generate-image-flux-kontext',
};

/**
 * Image Generation Service
 */
export class ImageGenerationService {
  private defaultModel: ImageModel = 'gemini-2.5-flash-image';

  /**
   * Generate an image using the specified model
   */
  async generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
    const model = options.model || this.defaultModel;
    const generationType = options.generationType || 'text-to-image';

    // Validate model capabilities
    if (options.baseImage && !MODEL_CAPABILITIES[model].supportsImg2Img) {
      throw new Error(`${model} does not support image-to-image generation`);
    }

    const imageUrl = await this.callModelAPI(model, options.prompt, options.baseImage);

    return {
      imageUrl,
      model,
      generationType,
    };
  }

  /**
   * Call the model's API endpoint
   */
  private async callModelAPI(
    model: ImageModel,
    prompt: string,
    baseImage?: string
  ): Promise<string> {
    const endpoint = MODEL_ENDPOINTS[model];

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, baseImage }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to generate image with ${model}`);
      }

      const { imageUrl } = await response.json();
      return imageUrl;
    } catch (error) {
      console.error(`Failed to generate image with ${model}:`, error);
      throw error;
    }
  }

  /**
   * Set the default model
   */
  setDefaultModel(model: ImageModel): void {
    this.defaultModel = model;
  }

  /**
   * Get the default model
   */
  getDefaultModel(): ImageModel {
    return this.defaultModel;
  }

  /**
   * Check if a model supports image-to-image
   */
  supportsImageToImage(model: ImageModel): boolean {
    return MODEL_CAPABILITIES[model].supportsImg2Img;
  }

  /**
   * Get all available models
   */
  getAvailableModels(): ImageModel[] {
    return Object.keys(MODEL_ENDPOINTS) as ImageModel[];
  }
}
