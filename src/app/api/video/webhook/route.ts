import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { streamAdapter } from '@/lib/video/streamAdapter';

export const runtime = 'edge';

/**
 * POST /api/video/webhook
 * Webhook handler for Cloudflare Stream and other video providers
 *
 * Configure this URL in your Cloudflare Stream webhook settings:
 * https://dash.cloudflare.com -> Stream -> Settings -> Webhooks
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const headers = req.headers;

    // Optional: Verify webhook signature if using a WEBHOOK_SECRET
    // const signature = headers.get('x-webhook-signature');
    // if (!verifyWebhookSignature(body, signature, process.env.WEBHOOK_SECRET)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    console.log('Webhook received:', JSON.stringify(body, null, 2));

    // Parse the webhook event from the provider
    const parsed = await streamAdapter.parseWebhook(body, headers);

    if (!parsed.ok) {
      console.error('Failed to parse webhook:', body);
      return NextResponse.json({ ok: false, error: 'Invalid webhook' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Handle 'ready' event - video encoding complete
    if (parsed.event === 'ready') {
      const providerAssetId = parsed.providerAssetId;
      console.log('Video ready:', providerAssetId);

      // Get playback info from provider
      const info = await streamAdapter.getPlaybackInfo(providerAssetId);

      // Find the submission by provider_asset_id or by meta.submissionId
      // For now, we'll find the most recent pending submission for this provider
      const { data: existingSubmissions } = await supabase
        .from('video_submissions')
        .select('id')
        .eq('provider', 'stream')
        .eq('provider_asset_id', providerAssetId)
        .limit(1);

      let targetId: string | null = null;

      if (existingSubmissions && existingSubmissions.length > 0) {
        targetId = existingSubmissions[0].id;
      } else {
        // If no exact match, try to find by pending status and update the first one
        // This assumes the webhook arrives shortly after upload
        const { data: pendingSubmissions } = await supabase
          .from('video_submissions')
          .select('id')
          .eq('provider', 'stream')
          .is('provider_asset_id', null)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        if (pendingSubmissions && pendingSubmissions.length > 0) {
          targetId = pendingSubmissions[0].id;
        }
      }

      if (!targetId) {
        console.error('No matching submission found for asset:', providerAssetId);
        return NextResponse.json({ ok: true, warning: 'No matching submission' });
      }

      // Update the submission with playback info
      const { error } = await supabase
        .from('video_submissions')
        .update({
          provider_asset_id: providerAssetId,
          playback_url: info.playbackUrl,
          poster_url: info.posterUrl ?? null,
          duration_seconds: info.durationSeconds ?? null,
          status: 'ready',
        })
        .eq('id', targetId);

      if (error) {
        console.error('Failed to update submission:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      console.log('Updated submission:', targetId);
    }

    // Handle live events if needed
    if (parsed.event === 'live_started') {
      console.log('Live stream started:', parsed.providerAssetId);
      // Update status or create notification
    }

    if (parsed.event === 'live_done') {
      console.log('Live stream ended:', parsed.providerAssetId);
      // Video will be available as VOD, wait for 'ready' event
    }

    return NextResponse.json({ ok: true, event: parsed.event });
  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
