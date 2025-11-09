import { type IVideoProvider, type VideoStatus } from '../types';

interface StreamUploadResponse {
  result: {
    uploadURL: string;
    uid: string;
  };
  success: boolean;
  errors: Array<{ message: string }>;
}

interface StreamWebhookPayload {
  uid: string;
  status?: {
    state: string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  meta?: Record<string, string>;
  duration?: number;
  size?: number;
  preview?: string;
  thumbnail?: string;
  playback?: {
    hls?: string;
    dash?: string;
  };
  input?: {
    width?: number;
    height?: number;
  };
  created?: string;
  modified?: string;
  uploaded?: string;
}

export class CloudflareStreamProvider implements IVideoProvider {
  name: 'stream' = 'stream';

  private accountId: string;
  private apiToken: string;

  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';

    if (!this.accountId || !this.apiToken) {
      console.warn('Cloudflare Stream credentials not configured');
    }
  }

  async getUploadUrl(): Promise<{
    uploadUrl: string;
    assetId: string;
    metadata?: Record<string, unknown>;
  }> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/direct_upload`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds: 3600, // 1 hour max
        requireSignedURLs: false,  // Public playback for now
        allowedOrigins: process.env.NEXT_PUBLIC_APP_URL
          ? [process.env.NEXT_PUBLIC_APP_URL]
          : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Stream upload URL: ${error}`);
    }

    const data: StreamUploadResponse = await response.json();

    if (!data.success) {
      throw new Error(`Stream API error: ${data.errors.map(e => e.message).join(', ')}`);
    }

    return {
      uploadUrl: data.result.uploadURL,
      assetId: data.result.uid,
    };
  }

  normalizeWebhook(payload: unknown): {
    assetId: string;
    status: VideoStatus;
    playbackUrl?: string;
    mp4FallbackUrl?: string;
    posterUrl?: string;
    durationSeconds?: number;
    masterBytes?: number;
    error?: string;
  } | null {
    const webhook = payload as StreamWebhookPayload;

    if (!webhook.uid) {
      console.error('Stream webhook missing uid:', payload);
      return null;
    }

    // Map Stream status to our VideoStatus
    let status: VideoStatus = 'processing';
    let error: string | undefined;

    if (webhook.status?.state === 'ready') {
      status = 'ready';
    } else if (webhook.status?.state === 'error') {
      status = 'error';
      error = webhook.status.errorReasonText || 'Processing failed';
    } else if (webhook.status?.state === 'inprogress' || webhook.status?.state === 'queued') {
      status = 'processing';
    } else if (webhook.status?.state === 'pendingupload') {
      status = 'pending';
    }

    // Build playback URL (HLS)
    const playbackUrl = webhook.playback?.hls ||
      `https://customer-${this.accountId}.cloudflarestream.com/${webhook.uid}/manifest/video.m3u8`;

    // Stream provides MP4 downloads via iframe embed or direct download
    const mp4FallbackUrl = `https://customer-${this.accountId}.cloudflarestream.com/${webhook.uid}/downloads/default.mp4`;

    return {
      assetId: webhook.uid,
      status,
      playbackUrl,
      mp4FallbackUrl,
      posterUrl: webhook.thumbnail,
      durationSeconds: webhook.duration ? Math.floor(webhook.duration) : undefined,
      masterBytes: webhook.size,
      error,
    };
  }

  async deleteVideo(assetId: string): Promise<void> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${assetId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete Stream video: ${error}`);
    }
  }
}
