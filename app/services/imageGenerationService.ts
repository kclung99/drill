export type ImageModel = 'ideogram-ai/ideogram-v3-turbo' | 'gemini-2.5-flash-image';
export type GenerationType = 'text-to-image' | 'image-to-image';

export interface GenerateImageOptions {
  prompt: string;
  model?: ImageModel;
  generationType?: GenerationType;
  baseImage?: string; // For image-to-image
}

export interface GenerateImageResult {
  imageUrl: string;
  model: ImageModel;
  generationType: GenerationType;
}

export class ImageGenerationService {
  private defaultModel: ImageModel = 'gemini-2.5-flash-image';

  async generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
    const model = options.model || this.defaultModel;
    const generationType = options.generationType || 'text-to-image';

    let imageUrl: string;

    if (model === 'ideogram-ai/ideogram-v3-turbo') {
      if (options.baseImage) {
        throw new Error('Ideogram does not support image-to-image generation');
      }
      imageUrl = await this.generateWithReplicate(options.prompt);
    } else if (model === 'gemini-2.5-flash-image') {
      imageUrl = await this.generateWithGemini(options.prompt, options.baseImage);
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }

    return {
      imageUrl,
      model,
      generationType,
    };
  }

  private async generateWithReplicate(prompt: string): Promise<string> {
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate image with Replicate');
      }

      const { imageUrl } = await response.json();
      return imageUrl;
    } catch (error) {
      console.error('Failed to generate image with Replicate:', error);
      throw error;
    }
  }

  private async generateWithGemini(prompt: string, baseImage?: string): Promise<string> {
    const response = await fetch('/api/generate-image-gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, baseImage }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate image with Gemini');
    }

    const { imageUrl } = await response.json();
    return imageUrl;
  }

  setDefaultModel(model: ImageModel) {
    this.defaultModel = model;
  }

  getDefaultModel(): ImageModel {
    return this.defaultModel;
  }
}
