import type {
  CreateUploadURLParams,
  CreateUploadURLResult,
  WebhookEvent,
  PlaybackInfo,
  VideoProvider
} from '@/types/video';

/**
 * Video provider adapter interface
 * Allows swapping between Cloudflare Stream, Bunny.net, or other providers
 */
export interface VideoProviderAdapter {
  name: VideoProvider;

  /**
   * Create a direct upload URL for client-side video upload
   */
  createUploadURL(params: CreateUploadURLParams): Promise<CreateUploadURLResult>;

  /**
   * Parse and normalize provider-specific webhook payloads
   */
  parseWebhook(body: any, headers: Headers): Promise<WebhookEvent>;

  /**
   * Get playback information for a provider asset
   */
  getPlaybackInfo(providerAssetId: string): Promise<PlaybackInfo>;

  /**
   * Optional: Delete/remove a video asset from provider
   */
  deleteAsset?(providerAssetId: string): Promise<void>;
}
