'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VideoSubmission } from '@/types/video';

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<VideoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'ready' | 'approved'>('ready');
  const router = useRouter();

  useEffect(() => {
    fetchVideos();
  }, [filter]);

  async function fetchVideos() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/videos?status=${filter}`);
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function moderateVideo(id: string, status: 'approved' | 'rejected' | 'featured') {
    try {
      const response = await fetch('/api/admin/videos/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (response.ok) {
        await fetchVideos();
      } else {
        alert('Failed to moderate video');
      }
    } catch (error) {
      console.error('Moderation failed:', error);
      alert('Failed to moderate video');
    }
  }

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-app">Video Moderation</h1>
        <p className="mt-2 text-sm text-muted">
          Review and approve video submissions from athletes
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-app">
        {(['all', 'pending', 'ready', 'approved'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium transition ${
              filter === status
                ? 'border-b-2 border-scarlet text-scarlet'
                : 'text-muted hover:text-app'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-app border-t-transparent" />
          <p className="mt-3 text-sm text-muted">Loading videos...</p>
        </div>
      )}

      {/* Videos Grid */}
      {!loading && videos.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted">No videos found for this filter.</p>
        </div>
      )}

      {!loading && videos.length > 0 && (
        <div className="grid gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="rounded-xl border border-app bg-card p-6 shadow-sm"
            >
              <div className="grid gap-4 md:grid-cols-2">
                {/* Video Player */}
                <div>
                  {video.playback_url ? (
                    <video
                      controls
                      preload="metadata"
                      src={video.playback_url}
                      poster={video.poster_url || undefined}
                      className="w-full rounded-lg bg-black"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-gray-100">
                      <p className="text-sm text-gray-500">Processing...</p>
                    </div>
                  )}
                </div>

                {/* Video Info & Actions */}
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-app">
                      {video.title || '(Untitled)'}
                    </h3>
                    {video.description && (
                      <p className="mt-1 text-sm text-muted">{video.description}</p>
                    )}
                  </div>

                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Status:</span>{' '}
                      <span
                        className={
                          video.status === 'approved'
                            ? 'text-green-600'
                            : video.status === 'rejected'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }
                      >
                        {video.status}
                      </span>
                    </p>
                    <p>
                      <span className="font-medium">Provider:</span> {video.provider}
                    </p>
                    {video.duration_seconds && (
                      <p>
                        <span className="font-medium">Duration:</span>{' '}
                        {Math.floor(video.duration_seconds / 60)}:
                        {String(video.duration_seconds % 60).padStart(2, '0')}
                      </p>
                    )}
                    <p className="text-xs text-muted">
                      Uploaded {new Date(video.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-auto flex flex-wrap gap-2">
                    {video.status !== 'approved' && (
                      <button
                        onClick={() => moderateVideo(video.id, 'approved')}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                      >
                        Approve
                      </button>
                    )}
                    {video.status !== 'featured' && (
                      <button
                        onClick={() => moderateVideo(video.id, 'featured')}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Feature
                      </button>
                    )}
                    {video.status !== 'rejected' && (
                      <button
                        onClick={() => moderateVideo(video.id, 'rejected')}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
