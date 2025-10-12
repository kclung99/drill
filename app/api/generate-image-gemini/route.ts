import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: NextRequest) {
  console.log('=== GENERATE IMAGE API (GEMINI 2.5 FLASH) CALLED ===');

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log('❌ Missing GEMINI_API_KEY');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY environment variable is required' },
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

    console.log('🔧 Creating Gemini client...');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    console.log('🚀 Calling Gemini 2.5 Flash API...');

    // Build contents based on whether we have a base image (image-to-image) or not (text-to-image)
    let contents;
    if (baseImage) {
      // Image-to-image: include base image
      contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/png',
            data: baseImage, // Base64 string
          },
        },
      ];
    } else {
      // Text-to-image: just the prompt
      contents = prompt;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents,
      config: {
        imageConfig: {
          aspectRatio: '3:4', // Always use 3:4 for unified output
        },
      },
    });

    console.log('✅ Gemini call completed');

    // Extract image from response
    if (response.candidates && response.candidates[0]) {
      const candidate = response.candidates[0];

      // Check if Gemini blocked the generation
      if ((candidate.finishReason as any) === 'IMAGE_OTHER' || (candidate.finishReason as any) === 'SAFETY') {
        console.error('❌ Gemini blocked generation. Finish reason:', candidate.finishReason);
        return NextResponse.json(
          { error: `Gemini blocked image generation: ${candidate.finishReason}` },
          { status: 400 }
        );
      }

      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const imageData = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${mimeType};base64,${imageData}`;
            console.log('✅ Found base64 image data');
            return NextResponse.json({ imageUrl });
          }
        }
      }
    }

    console.error('❌ Unexpected response format:', JSON.stringify(response, null, 2));
    return NextResponse.json(
      { error: 'No image data returned from Gemini', debug: { response } },
      { status: 500 }
    );
  } catch (error) {
    console.error('💥 Failed to generate image with Gemini:', error);
    return NextResponse.json(
      { error: 'Failed to generate image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
