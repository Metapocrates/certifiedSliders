import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/compat';
import { getVideoProvider } from '@/lib/videos/providers';

/**
 * DELETE /api/videos/[id]
 * Delete a video submission (only allowed for own pending/rejected videos)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServer();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const videoId = params.id;

    // Get video to verify ownership and get provider info
    const { data: video, error: fetchError } = await supabase
      .from('video_submissions')
      .select('id, uploader_id, status, provider, provider_asset_id')
      .eq('id', videoId)
      .maybeSingle();

    if (fetchError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Check ownership
    if (video.uploader_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only allow deletion of pending or rejected videos
    if (!['pending', 'rejected', 'error'].includes(video.status)) {
      return NextResponse.json(
        { error: 'Cannot delete approved videos' },
        { status: 400 }
      );
    }

    // Delete from provider (Cloudflare Stream)
    try {
      const provider = getVideoProvider(video.provider as 'stream' | 'bunny');
      await provider.deleteVideo(video.provider_asset_id);
    } catch (providerError) {
      console.error('Failed to delete from provider:', providerError);
      // Continue with DB deletion even if provider deletion fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('video_submissions')
      .delete()
      .eq('id', videoId)
      .eq('uploader_id', user.id); // Extra safety check

    if (deleteError) {
      console.error('Failed to delete video:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Video deletion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
