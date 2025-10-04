import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { verifyToken, getTokenFromHeader } from '@/lib/auth';

export async function POST(request: NextRequest) {
  console.log('=== GENERATE IMAGE API CALLED ===');

  // Check JWT authentication
  const authHeader = request.headers.get('authorization');
  const token = getTokenFromHeader(authHeader);

  if (!token || !verifyToken(token)) {
    console.log('❌ Unauthorized: Invalid or missing token');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      console.log('❌ Missing REPLICATE_API_TOKEN');
      return NextResponse.json(
        { error: 'REPLICATE_API_TOKEN environment variable is required' },
        { status: 500 }
      );
    }

    const { prompt } = await request.json();
    console.log('📝 Received prompt:', prompt);

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

    console.log('🚀 Calling Replicate API...');
    const input = {
      seed: Math.floor(Math.random() * 1000000),
      prompt,
      style_type: "General",
      aspect_ratio: "3:4",
      magic_prompt_option: "Auto"
    };

    console.log('📝 Input:', input);

    const output = await replicate.run("ideogram-ai/ideogram-v3-turbo", { input });

    console.log('✅ Replicate call completed');
    console.log('📦 Replicate output:', output);
    console.log('🔍 Output type:', typeof output);
    console.log('🔑 Output methods:', output ? Object.getOwnPropertyNames(output) : 'no methods');

    // According to docs, use output.url() to get the URL
    if (output && typeof output.url === 'function') {
      const imageUrl = output.url();
      console.log('✅ Found URL via .url():', imageUrl);
      return NextResponse.json({ imageUrl });
    }

    // Fallback: check if it's a direct string
    if (output && typeof output === 'string' && output.startsWith('https://')) {
      console.log('✅ Found direct URL string:', output);
      return NextResponse.json({ imageUrl: output });
    }

    console.error('❌ Unexpected output format:', output);
    return NextResponse.json(
      { error: 'No image URL returned from Replicate', debug: { output, type: typeof output } },
      { status: 500 }
    );
  } catch (error) {
    console.error('💥 Failed to generate image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}