import { NextRequest, NextResponse } from 'next/server';

interface ProductImageRequest {
  name: string;
  category: string;
  color?: string;
  description?: string;
  style?: string;
  model?: string;
  seed?: number;
  enhance?: boolean;
  width?: number;
  height?: number;
}

function buildPrompt(product: ProductImageRequest): string {
  const parts: string[] = [];

  if (product.name) parts.push(product.name);
  if (product.category) parts.push(product.category);
  if (product.color) parts.push(product.color);
  if (product.description) parts.push(product.description);

  const style =
    product.style ||
    'studio product photography, clean white background, professional lighting';

  parts.push(style);
  parts.push('professional ecommerce product photo');
  parts.push('high resolution, sharp focus, photorealistic, commercial quality, 4k');

  return parts.join(', ');
}

export async function POST(req: NextRequest) {
  try {
    const body: ProductImageRequest = await req.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Product name is required.' },
        { status: 400 }
      );
    }

    const prompt  = buildPrompt(body);
    const width   = body.width  || 1024;
    const height  = body.height || 1024;
    const model   = body.model  || 'flux';
    const seed    = body.seed   ?? Math.floor(Math.random() * 999999);
    const enhance = body.enhance !== false; // default true

    const encoded  = encodeURIComponent(prompt);
    const imageUrl =
      `https://image.pollinations.ai/prompt/${encoded}` +
      `?width=${width}&height=${height}&model=${model}` +
      `&nologo=true&seed=${seed}${enhance ? '&enhance=true' : ''}`;

    return NextResponse.json({ imageUrl, prompt, seed });
  } catch (err) {
    console.error('[generate-image]', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}