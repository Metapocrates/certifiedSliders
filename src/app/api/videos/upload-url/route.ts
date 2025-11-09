import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/compat';
import { getDefaultProvider } from '@/lib/videos/providers';
import { z } from 'zod';

const UploadUrlSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = UploadUrlSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, description } = parsed.data;

    // Get provider (defaults to Cloudflare Stream)
    const provider = getDefaultProvider();

    // Get Direct Creator Upload URL from provider
    const { uploadUrl, assetId } = await provider.getUploadUrl();

    // Create database record
    const { data: video, error: dbError } = await supabase
      .from('video_submissions')
      .insert({
        uploader_id: user.id,
        provider: provider.name,
        provider_asset_id: assetId,
        status: 'pending',
        title,
        description: description || null,
      })
      .select('id')
      .single();

    if (dbError || !video) {
      console.error('Failed to create video record:', dbError);
      return NextResponse.json(
        { error: 'Failed to create video record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadUrl,
      videoId: video.id,
      assetId,
    });
  } catch (error) {
    console.error('Upload URL error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
