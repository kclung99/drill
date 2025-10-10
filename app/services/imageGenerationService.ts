export type ImageModel = 'ideogram-ai/ideogram-v3-turbo' | 'gemini-2.5-flash-image' | 'google/nano-banana' | 'black-forest-labs/flux-kontext-pro';
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
      imageUrl = await this.generateWithIdeogram(options.prompt);
    } else if (model === 'gemini-2.5-flash-image') {
      imageUrl = await this.generateWithGemini(options.prompt, options.baseImage);
    } else if (model === 'google/nano-banana') {
      imageUrl = await this.generateWithNanoBanana(options.prompt, options.baseImage);
    } else if (model === 'black-forest-labs/flux-kontext-pro') {
      imageUrl = await this.generateWithFluxKontextPro(options.prompt, options.baseImage);
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }

    return {
      imageUrl,
      model,
      generationType,
    };
  }

  private async generateWithIdeogram(prompt: string): Promise<string> {
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
        throw new Error(error.error || 'Failed to generate image with Ideogram');
      }

      const { imageUrl } = await response.json();
      return imageUrl;
    } catch (error) {
      console.error('Failed to generate image with Ideogram:', error);
      throw error;
    }
  }

  private async generateWithNanoBanana(prompt: string, baseImage?: string): Promise<string> {
    const response = await fetch('/api/generate-image-nano-banana', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, baseImage }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate image with Nano Banana');
    }

    const { imageUrl } = await response.json();
    return imageUrl;
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

  private async generateWithFluxKontextPro(prompt: string, baseImage?: string): Promise<string> {
    console.log('🚀 Calling FLUX Kontext Pro API endpoint...');
    const response = await fetch('/api/generate-image-flux-kontext', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, baseImage }),
    });

    console.log('📡 FLUX API response status:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ FLUX API error:', error);
      throw new Error(error.error || 'Failed to generate image with FLUX Kontext Pro');
    }

    const { imageUrl } = await response.json();
    console.log('✅ FLUX API returned image URL');
    return imageUrl;
  }

  setDefaultModel(model: ImageModel) {
    this.defaultModel = model;
  }

  getDefaultModel(): ImageModel {
    return this.defaultModel;
  }
}
