import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(request: NextRequest) {
  console.log('=== GENERATE IMAGE API (NANO BANANA) CALLED ===');

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

    console.log('🚀 Calling Nano Banana API...');

    // Build input based on whether we have a base image
    const input: any = {
      prompt,
      aspect_ratio: '3:4',
      output_format: 'jpg',
    };

    if (baseImage) {
      // Convert base64 to Buffer - Replicate SDK will handle the upload automatically
      console.log('📤 Preparing base image for upload...');

      // Remove data URL prefix if present
      const base64Data = baseImage.includes('base64,')
        ? baseImage.split('base64,')[1]
        : baseImage;

      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Pass Buffer directly - Replicate SDK handles the upload
      input.image_input = [imageBuffer];
      input.aspect_ratio = 'match_input_image';
    }

    const output = await replicate.run('google/nano-banana', { input }) as any;

    console.log('✅ Nano Banana call completed');

    // Output is a FileOutput object with .url() method
    if (output && typeof output.url === 'function') {
      const imageUrl = output.url();
      return NextResponse.json({ imageUrl });
    }

    console.error('❌ No output received or invalid format');
    return NextResponse.json(
      { error: 'No image URL returned from Nano Banana' },
      { status: 500 }
    );
  } catch (error) {
    console.error('💥 Failed to generate image with Nano Banana:', error);
    return NextResponse.json(
      { error: 'Failed to generate image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
