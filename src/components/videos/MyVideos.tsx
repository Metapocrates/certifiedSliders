'use client';

import { useState, useEffect } from 'react';
import VideoPlayer from './VideoPlayer';
import VideoUploader from './VideoUploader';

type VideoSubmission = {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'processing' | 'ready' | 'approved' | 'featured' | 'rejected' | 'error';
  playback_url: string | null;
  poster_url: string | null;
  duration_seconds: number | null;
  created_at: string;
};

export default function MyVideos() {
  const [videos, setVideos] = useState<VideoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const response = await fetch('/api/videos/my-videos');
      if (!response.ok) throw new Error('Failed to load videos');

      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    setShowUploader(false);
    loadVideos(); // Reload videos
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete video');

      // Reload videos
      loadVideos();
    } catch (error) {
      console.error('Failed to delete video:', error);
      alert('Failed to delete video');
    }
  };

  if (loading) {
    return (
      <section className="mt-8">
        <div className="mb-4">
          <h2 className="text-lg font-medium">Highlight Videos</h2>
          <p className="text-sm text-muted">Loading your videos...</p>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-app bg-card p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-app/20 border-t-scarlet" />
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Highlight Videos ({videos.length})</h2>
          <p className="text-sm text-muted">
            Share your best performances
          </p>
        </div>
        {!showUploader && (
          <button
            onClick={() => setShowUploader(true)}
            className="rounded-lg bg-scarlet px-4 py-2 text-sm font-semibold text-white transition hover:bg-scarlet/90"
          >
            Upload Video
          </button>
        )}
      </div>

      <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
          <svg className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Video Review Policy</p>
            <p className="mt-1">
              All video submissions are reviewed by our team. Videos will be published at the sole discretion of Certified Sliders and only if they meet our quality and content standards.
            </p>
          </div>
        </div>
      </div>

      {showUploader && (
        <div className="mb-6">
          <VideoUploader onUploadComplete={handleUploadComplete} />
          <button
            onClick={() => setShowUploader(false)}
            className="mt-2 text-sm font-semibold text-muted hover:text-app"
          >
            Cancel
          </button>
        </div>
      )}

      {videos.length === 0 && !showUploader && (
        <div className="rounded-xl border border-dashed border-app/40 bg-muted/30 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-3 text-sm font-semibold text-app">No videos yet</h3>
          <p className="mt-1 text-sm text-muted">
            Upload your highlight videos to showcase your performances
          </p>
          <button
            onClick={() => setShowUploader(true)}
            className="mt-4 rounded-lg bg-scarlet px-4 py-2 text-sm font-semibold text-white transition hover:bg-scarlet/90"
          >
            Upload Your First Video
          </button>
        </div>
      )}

      {videos.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <div
              key={video.id}
              className="overflow-hidden rounded-xl border border-app bg-card shadow-sm"
            >
              {video.playback_url ? (
                <VideoPlayer
                  playbackUrl={video.playback_url}
                  posterUrl={video.poster_url}
                  title={video.title}
                  className="aspect-video w-full"
                />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-app/20 border-t-scarlet mx-auto" />
                    <p className="text-sm text-muted">
                      {video.status === 'processing' ? 'Processing...' : 'Pending'}
                    </p>
                  </div>
                </div>
              )}

              <div className="p-4">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="font-semibold text-app line-clamp-2">{video.title}</h3>
                  <span
                    className={`ml-2 shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] ${
                      video.status === 'approved' || video.status === 'featured'
                        ? 'border-green-200 bg-green-50 text-green-800'
                        : video.status === 'rejected'
                        ? 'border-red-200 bg-red-50 text-red-800'
                        : video.status === 'processing'
                        ? 'border-blue-200 bg-blue-50 text-blue-800'
                        : 'border-yellow-200 bg-yellow-50 text-yellow-800'
                    }`}
                  >
                    {video.status === 'approved' && 'Approved'}
                    {video.status === 'featured' && 'Featured'}
                    {video.status === 'rejected' && 'Rejected'}
                    {video.status === 'ready' && 'Under Review'}
                    {video.status === 'processing' && 'Processing'}
                    {video.status === 'pending' && 'Pending'}
                    {video.status === 'error' && 'Error'}
                  </span>
                </div>

                {video.description && (
                  <p className="mb-2 text-sm text-muted line-clamp-2">{video.description}</p>
                )}

                <div className="flex items-center justify-between text-xs text-muted">
                  <span>
                    {video.duration_seconds
                      ? `${Math.floor(video.duration_seconds / 60)}:${String(
                          video.duration_seconds % 60
                        ).padStart(2, '0')}`
                      : '—'}
                  </span>
                  <span>{new Date(video.created_at).toLocaleDateString()}</span>
                </div>

                {(video.status === 'pending' || video.status === 'rejected') && (
                  <button
                    onClick={() => handleDeleteVideo(video.id)}
                    className="mt-3 w-full rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
