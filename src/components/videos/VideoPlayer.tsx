'use client';

import { useState } from 'react';

interface VideoPlayerProps {
  playbackUrl: string;
  posterUrl?: string | null;
  title?: string;
  className?: string;
}

/**
 * Video player component for displaying Cloudflare Stream videos
 * Supports HLS playback with fallback to native video element
 */
export default function VideoPlayer({
  playbackUrl,
  posterUrl,
  title,
  className = '',
}: VideoPlayerProps) {
  const [error, setError] = useState(false);

  const handleError = () => {
    setError(true);
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center rounded-lg bg-gray-100 ${className}`}>
        <div className="text-center p-6">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">Unable to load video</p>
        </div>
      </div>
    );
  }

  return (
    <video
      controls
      preload="metadata"
      src={playbackUrl}
      poster={posterUrl || undefined}
      className={`rounded-lg bg-black ${className}`}
      onError={handleError}
      aria-label={title || 'Video player'}
    >
      <p className="p-4 text-white">
        Your browser does not support the video tag. Please try a different browser.
      </p>
    </video>
  );
}
