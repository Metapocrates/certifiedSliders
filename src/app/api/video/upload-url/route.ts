import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { streamAdapter } from '@/lib/video/streamAdapter';

export const runtime = 'edge';

/**
 * POST /api/video/upload-url
 * Generate a direct upload URL for video submission
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description } = body;

    // Create database record first
    const submissionId = crypto.randomUUID();
    const { error: dbError } = await supabase
      .from('video_submissions')
      .insert({
        id: submissionId,
        uploader_id: user.id,
        provider: 'stream',
        status: 'pending',
        title: title || null,
        description: description || null,
      });

    if (dbError) {
      console.error('Failed to create video submission:', dbError);
      return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 });
    }

    // Get upload URL from Cloudflare Stream
    const result = await streamAdapter.createUploadURL({
      uploaderId: user.id,
      title,
      description,
    });

    return NextResponse.json({
      submissionId,
      provider: result.provider,
      uploadUrl: result.uploadUrl,
    });
  } catch (error) {
    console.error('Upload URL creation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
