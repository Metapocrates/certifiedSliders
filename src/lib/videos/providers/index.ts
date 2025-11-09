import { type IVideoProvider, type VideoProvider as VideoProviderType } from '../types';
import { CloudflareStreamProvider } from './cloudflare-stream';

// Provider registry
const providers = new Map<VideoProviderType, IVideoProvider>();

// Register Cloudflare Stream as primary provider
providers.set('stream', new CloudflareStreamProvider());

/**
 * Get video provider instance
 * Defaults to 'stream' (Cloudflare Stream) for now
 */
export function getVideoProvider(provider: VideoProviderType = 'stream'): IVideoProvider {
  const instance = providers.get(provider);
  if (!instance) {
    throw new Error(`Video provider "${provider}" not registered`);
  }
  return instance;
}

/**
 * Get default video provider (Cloudflare Stream)
 */
export function getDefaultProvider(): IVideoProvider {
  return getVideoProvider('stream');
}
