// Video provider types
export type VideoProvider = 'stream' | 'bunny';

export type VideoStatus =
  | 'pending'    // Uploaded but not processed
  | 'processing' // Being transcoded
  | 'ready'      // Processed and playable, awaiting moderation
  | 'approved'   // Admin-approved for public display
  | 'featured'   // Highlighted content
  | 'rejected'   // Admin-rejected
  | 'error';     // Processing failed

export interface VideoSubmission {
  id: string;
  uploader_id: string;
  provider: VideoProvider;
  provider_asset_id: string;
  status: VideoStatus;
  title: string;
  description: string | null;
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

// Provider abstraction interface
export interface IVideoProvider {
  name: VideoProvider;

  /**
   * Get a Direct Creator Upload URL for the user to upload to
   * @returns Upload URL and any metadata needed for webhook correlation
   */
  getUploadUrl(): Promise<{
    uploadUrl: string;
    assetId: string;
    metadata?: Record<string, unknown>;
  }>;

  /**
   * Normalize webhook payload from provider into standard format
   */
  normalizeWebhook(payload: unknown): {
    assetId: string;
    status: VideoStatus;
    playbackUrl?: string;
    mp4FallbackUrl?: string;
    posterUrl?: string;
    durationSeconds?: number;
    masterBytes?: number;
    error?: string;
  } | null;

  /**
   * Delete video from provider
   */
  deleteVideo(assetId: string): Promise<void>;
}

// Upload flow types
export interface UploadUrlRequest {
  title: string;
  description?: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  videoId: string; // Our DB record ID
  assetId: string;  // Provider's asset ID
}

// Webhook types
export interface WebhookPayload {
  provider: VideoProvider;
  payload: unknown;
}

// R2 master storage
export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export interface MasterVideoUpload {
  assetId: string;
  videoBuffer: Buffer;
}
