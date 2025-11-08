import type { VideoProviderAdapter } from './providers';
import type {
  CreateUploadURLParams,
  CreateUploadURLResult,
  WebhookEvent,
  PlaybackInfo
} from '@/types/video';

const API_BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}`;

/**
 * Make a Cloudflare API request
 */
async function cfRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cloudflare API ${path} failed: ${res.status} - ${errorText}`);
  }

  const json = await res.json();
  return (json.result ?? json) as T;
}

/**
 * Cloudflare Stream adapter implementation
 */
export const streamAdapter: VideoProviderAdapter = {
  name: 'stream',

  async createUploadURL({ uploaderId, title, description }: CreateUploadURLParams): Promise<CreateUploadURLResult> {
    // Generate submission ID for tracking
    const submissionId = crypto.randomUUID();

    // Request Direct Creator Upload URL from Cloudflare Stream
    const result = await cfRequest<{ uploadURL: string; uid: string }>('/stream/direct_upload', {
      method: 'POST',
      body: JSON.stringify({
        maxDurationSeconds: 600, // 10 minutes max
        creator: uploaderId,
        meta: {
          submissionId,
          title: title || '',
          description: description || '',
        },
      }),
    });

    return {
      uploadUrl: result.uploadURL,
      submissionId,
      provider: 'stream',
    };
  },

  async parseWebhook(body: any, _headers: Headers): Promise<WebhookEvent> {
    // Cloudflare Stream webhook format
    // https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/
    const eventType = body?.status?.state ?? body?.type;
    const uid = body?.uid ?? body?.data?.uid ?? body?.data?.id;

    if (!uid) {
      console.error('Stream webhook missing UID:', body);
      return {
        ok: false,
        event: 'error',
        providerAssetId: '',
      };
    }

    // Map Stream events to our normalized events
    if (eventType === 'ready' || eventType === 'video.ready') {
      return {
        ok: true,
        event: 'ready',
        providerAssetId: uid,
        meta: body?.data ?? body,
      };
    }

    if (eventType === 'live_input.connected') {
      return {
        ok: true,
        event: 'live_started',
        providerAssetId: uid,
      };
    }

    if (eventType === 'live_input.disconnected') {
      return {
        ok: true,
        event: 'live_done',
        providerAssetId: uid,
      };
    }

    // Unknown or error event
    return {
      ok: true,
      event: 'error',
      providerAssetId: uid,
      meta: { eventType, body },
    };
  },

  async getPlaybackInfo(providerAssetId: string): Promise<PlaybackInfo> {
    type StreamVideo = {
      playback?: { hls?: string; dash?: string };
      thumbnail?: string;
      duration?: number;
      preview?: string;
    };

    const data = await cfRequest<StreamVideo>(`/stream/${providerAssetId}`);

    return {
      playbackUrl: data.playback?.hls || data.playback?.dash || '',
      posterUrl: data.thumbnail || data.preview,
      durationSeconds: data.duration ? Math.round(data.duration) : undefined,
    };
  },

  async deleteAsset(providerAssetId: string): Promise<void> {
    await cfRequest(`/stream/${providerAssetId}`, {
      method: 'DELETE',
    });
  },
};
