'use client';

import { useState, useRef } from 'react';

export interface VideoUploadProps {
  onUploadComplete?: (submissionId: string) => void;
  maxSizeMB?: number;
  acceptedFormats?: string[];
}

/**
 * Video upload component using Cloudflare Stream Direct Creator Upload
 */
export default function VideoUpload({
  onUploadComplete,
  maxSizeMB = 500,
  acceptedFormats = ['video/mp4', 'video/quicktime', 'video/webm'],
}: VideoUploadProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Please select a video file');
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      setError(`Please upload a valid video file (${acceptedFormats.join(', ')})`);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Step 1: Get upload URL from our API
      const urlResponse = await fetch('/api/video/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });

      if (!urlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, submissionId } = await urlResponse.json();

      // Step 2: Upload file directly to Cloudflare Stream
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      setProgress(100);
      setSuccess(true);
      setTitle('');
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      onUploadComplete?.(submissionId);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-app">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., My 100m PR at State Finals"
          className="mt-1 w-full rounded-lg border border-app bg-card px-4 py-2 text-app placeholder:text-muted focus:border-scarlet focus:outline-none focus:ring-2 focus:ring-scarlet/20"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-app">
          Description (optional)
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details about this video..."
          rows={3}
          className="mt-1 w-full rounded-lg border border-app bg-card px-4 py-2 text-app placeholder:text-muted focus:border-scarlet focus:outline-none focus:ring-2 focus:ring-scarlet/20"
        />
      </div>

      <div>
        <label htmlFor="video" className="block text-sm font-medium text-app">
          Video File
        </label>
        <input
          id="video"
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          className="mt-1 w-full rounded-lg border border-app bg-card px-4 py-2 text-app file:mr-4 file:rounded file:border-0 file:bg-scarlet file:px-4 file:py-1 file:text-sm file:font-semibold file:text-white hover:file:bg-scarlet/90"
          required
          disabled={uploading}
        />
        <p className="mt-1 text-xs text-muted">
          Max {maxSizeMB}MB. Accepted formats: MP4, MOV, WebM
        </p>
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-scarlet transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-sm text-muted">
            Uploading... {progress}%
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">Upload Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          <p className="font-semibold">Upload Successful!</p>
          <p className="mt-1">
            Your video has been submitted and will be reviewed by our team.
          </p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={uploading}
        className="w-full rounded-lg bg-scarlet px-6 py-3 font-semibold text-white transition hover:bg-scarlet/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload Video'}
      </button>
    </form>
  );
}
