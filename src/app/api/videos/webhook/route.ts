import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/compat';
import { getVideoProvider } from '@/lib/videos/providers';
import { getR2Storage } from '@/lib/videos/r2-storage';

/**
 * Webhook endpoint for video processing notifications
 * Handles webhooks from Cloudflare Stream (and eventually Bunny.net)
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // Determine provider from headers or payload
    // Cloudflare Stream sends a signature header, Bunny uses different auth
    const signature = req.headers.get('webhook-signature');

    // For now, we'll default to Stream
    // TODO: Add signature verification for production
    const provider = getVideoProvider('stream');

    // Normalize webhook data
    const normalized = provider.normalizeWebhook(payload);

    if (!normalized) {
      console.error('Failed to normalize webhook:', payload);
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const {
      assetId,
      status,
      playbackUrl,
      mp4FallbackUrl,
      posterUrl,
      durationSeconds,
      masterBytes,
      error,
    } = normalized;

    // Update database record
    const supabase = await createSupabaseServer();

    const updateData: Record<string, unknown> = {
      status,
      playback_url: playbackUrl,
      mp4_fallback_url: mp4FallbackUrl,
      poster_url: posterUrl,
      duration_seconds: durationSeconds,
    };

    if (error) {
      updateData.flags = { error };
    }

    const { data: video, error: dbError } = await supabase
      .from('video_submissions')
      .update(updateData)
      .eq('provider_asset_id', assetId)
      .eq('provider', provider.name)
      .select('id, uploader_id, master_r2_key')
      .single();

    if (dbError) {
      console.error('Failed to update video:', dbError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    // If video is ready and master not yet archived, archive to R2
    if (status === 'ready' && video && !video.master_r2_key) {
      try {
        const r2 = getR2Storage();
        const { r2Key, bytes } = await r2.archiveFromStream(assetId);

        // Update with R2 info
        await supabase
          .from('video_submissions')
          .update({
            master_r2_key: r2Key,
            master_bytes: bytes,
          })
          .eq('id', video.id);

        console.log(`Archived video ${assetId} to R2: ${r2Key} (${bytes} bytes)`);
      } catch (archiveError) {
        console.error('Failed to archive to R2:', archiveError);
        // Don't fail the webhook - we can retry archival later
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
