export type VideoProvider = 'stream' | 'bunny';

export type VideoStatus = 'pending' | 'ready' | 'approved' | 'featured' | 'rejected' | 'taken_down';

export interface VideoSubmission {
  id: string;
  uploader_id: string;
  provider: VideoProvider;
  provider_asset_id: string | null;
  title: string | null;
  description: string | null;
  status: VideoStatus;
  duration_seconds: number | null;
  master_bytes: number | null;
  master_r2_key: string | null;
  playback_url: string | null;
  mp4_fallback_url: string | null;
  poster_url: string | null;
  flags: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateUploadURLParams {
  uploaderId: string;
  title?: string;
  description?: string;
  maxSizeMB?: number;
  maxDurationSeconds?: number;
}

export interface CreateUploadURLResult {
  uploadUrl: string;
  submissionId: string;
  provider: VideoProvider;
}

export interface WebhookEvent {
  ok: boolean;
  event: 'ready' | 'live_started' | 'live_done' | 'error';
  providerAssetId: string;
  meta?: Record<string, any>;
}

export interface PlaybackInfo {
  playbackUrl: string;
  posterUrl?: string;
  durationSeconds?: number;
  mp4FallbackUrl?: string;
}
