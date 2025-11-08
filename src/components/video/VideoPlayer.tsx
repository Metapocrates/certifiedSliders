'use client';

import type { VideoProvider } from '@/types/video';

export interface VideoPlayerProps {
  provider: VideoProvider;
  playbackUrl: string;
  posterUrl?: string;
  title?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
}

/**
 * Smart video player component that works with multiple providers
 * Supports Cloudflare Stream (HLS), Bunny.net, and standard MP4
 */
export default function VideoPlayer({
  provider,
  playbackUrl,
  posterUrl,
  title,
  autoPlay = false,
  loop = false,
  muted = false,
  controls = true,
  className = '',
}: VideoPlayerProps) {
  // For Stream and Bunny, modern browsers support HLS natively
  // For better compatibility, you could add hls.js or video.js here

  return (
    <div className={`relative ${className}`}>
      <video
        src={playbackUrl}
        poster={posterUrl}
        title={title}
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        preload="metadata"
        className="h-full w-full rounded-lg bg-black"
      >
        <track kind="captions" />
        Your browser does not support the video tag.
      </video>

      {/* Optional: Add provider branding */}
      {provider === 'stream' && (
        <div className="absolute bottom-2 right-2 rounded bg-black/50 px-2 py-1 text-xs text-white opacity-0 transition hover:opacity-100">
          Powered by Cloudflare Stream
        </div>
      )}
    </div>
  );
}
