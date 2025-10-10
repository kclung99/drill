import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(request: NextRequest) {
  console.log('=== GENERATE IMAGE API (FLUX KONTEXT PRO) CALLED ===');

  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      console.log('❌ Missing REPLICATE_API_TOKEN');
      return NextResponse.json(
        { error: 'REPLICATE_API_TOKEN environment variable is required' },
        { status: 500 }
      );
    }

    const { prompt, baseImage } = await request.json();
    console.log('📝 Received prompt:', prompt);
    console.log('🖼️  Base image provided:', !!baseImage);

    if (!prompt) {
      console.log('❌ No prompt provided');
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('🔧 Creating Replicate client...');
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    console.log('🚀 Calling FLUX Kontext Pro API...');

    // Build input - always use 3:4 for unified output
    const input: any = {
      prompt,
      aspect_ratio: '3:4',
      output_format: 'jpg',
      safety_tolerance: 6, // Max tolerance to avoid blocking
      prompt_upsampling: false,
    };

    if (baseImage) {
      // FLUX Kontext Pro requires base image for image-to-image
      console.log('📤 Preparing base image for upload...');

      // Remove data URL prefix if present
      const base64Data = baseImage.includes('base64,')
        ? baseImage.split('base64,')[1]
        : baseImage;

      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Pass Buffer directly - Replicate SDK handles the upload
      input.input_image = imageBuffer;
      console.log('✅ Input image prepared, buffer size:', imageBuffer.length);
    } else {
      console.log('❌ No base image provided - FLUX Kontext Pro requires input_image for img2img');
      return NextResponse.json(
        { error: 'FLUX Kontext Pro requires an input image for image-to-image generation' },
        { status: 400 }
      );
    }

    console.log('📋 Input config:', { ...input, input_image: '[Buffer]' });
    const output = await replicate.run('black-forest-labs/flux-kontext-pro', { input }) as any;

    console.log('✅ FLUX Kontext Pro call completed');

    // Output is a FileOutput object with .url() method
    if (output && typeof output.url === 'function') {
      const imageUrl = output.url();
      return NextResponse.json({ imageUrl });
    }

    console.error('❌ No output received or invalid format');
    return NextResponse.json(
      { error: 'No image URL returned from FLUX Kontext Pro' },
      { status: 500 }
    );
  } catch (error) {
    console.error('💥 Failed to generate image with FLUX Kontext Pro:', error);
    return NextResponse.json(
      { error: 'Failed to generate image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
