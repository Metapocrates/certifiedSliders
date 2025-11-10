'use client';

import { useState, useRef, useEffect } from 'react';
import { UPLOAD_SIZE_THRESHOLD, shouldUseTus, buildTusMetadata } from '@/lib/videos/tus-helpers';

interface VideoUploaderProps {
  onUploadComplete?: (videoId: string) => void;
}

type UploadState = 'idle' | 'selecting' | 'uploading' | 'processing' | 'complete' | 'error';

// Uppy types (loaded dynamically)
type Uppy = any;
type UppyFile = any;

export default function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'basic' | 'tus'>('basic');
  const uppyRef = useRef<Uppy | null>(null);
  const videoIdRef = useRef<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }

    // Validate file size (500MB max)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Video must be less than 500MB');
      return;
    }

    // Determine upload method based on file size
    const useTus = shouldUseTus(file.size);
    setUploadMethod(useTus ? 'tus' : 'basic');

    setSelectedFile(file);
    setState('selecting');
    setError(null);
  };

  const handleBasicUpload = async (file: File) => {
    // Step 1: Get upload URL from our API
    const response = await fetch('/api/videos/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to get upload URL');
    }

    const { uploadUrl, videoId } = await response.json();
    videoIdRef.current = videoId;

    // Step 2: Upload video to Cloudflare Stream
    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload video');
    }
  };

  const handleTusUpload = async (file: File) => {
    // Dynamically import Uppy for tus resumable uploads
    const [UppyCore, Tus] = await Promise.all([
      import('@uppy/core').then(m => m.default),
      import('@uppy/tus').then(m => m.default),
    ]);

    // Create Uppy instance
    const uppy = new UppyCore({
      autoProceed: false,
      restrictions: {
        maxNumberOfFiles: 1,
        allowedFileTypes: ['video/*'],
      },
    });

    // Configure tus plugin
    uppy.use(Tus, {
      endpoint: '/api/videos/tus-upload',
      chunkSize: 150 * 1024 * 1024, // 150 MB chunks
      retryDelays: [0, 1000, 3000, 5000],
      onBeforeRequest: (req: any) => {
        // Add metadata on initial request
        if (req.getURL().endsWith('/api/videos/tus-upload')) {
          const metadata = buildTusMetadata(600, 120, false);

          // Add custom title and description to metadata
          const titleB64 = btoa(title.trim());
          const descB64 = description.trim() ? btoa(description.trim()) : '';

          const customMetadata = descB64
            ? `${metadata},title ${titleB64},description ${descB64}`
            : `${metadata},title ${titleB64}`;

          req.setHeader('Upload-Metadata', customMetadata);
        }
      },
    });

    // Track upload progress
    uppy.on('upload-progress', (file: UppyFile, progress: any) => {
      const percent = Math.round((progress.bytesUploaded / progress.bytesTotal) * 100);
      setUploadProgress(percent);
    });

    // Handle upload success
    uppy.on('upload-success', (file: UppyFile, response: any) => {
      console.log('Upload successful:', response);
      // Extract video ID from custom header if available
      const videoId = response.uploadURL ? new URL(response.uploadURL).searchParams.get('video_id') : null;
      if (videoId) {
        videoIdRef.current = videoId;
      }
    });

    // Handle upload error
    uppy.on('upload-error', (file: UppyFile, error: any) => {
      console.error('Upload error:', error);
      throw new Error(error.message || 'Upload failed');
    });

    // Add file and start upload
    const uppyFile = uppy.addFile({
      name: file.name,
      type: file.type,
      data: file,
    });

    uppyRef.current = uppy;

    // Start upload
    await uppy.upload();
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      setError('Please provide a title and select a video');
      return;
    }

    try {
      setState('uploading');
      setError(null);
      setUploadProgress(0);

      if (uploadMethod === 'tus') {
        await handleTusUpload(selectedFile);
      } else {
        await handleBasicUpload(selectedFile);
      }

      setState('processing');

      // Video is now processing - user will be notified when ready
      setTimeout(() => {
        setState('complete');
        if (onUploadComplete && videoIdRef.current) {
          onUploadComplete(videoIdRef.current);
        }
      }, 1000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setState('error');
    }
  };

  const handleReset = () => {
    // Clean up Uppy instance
    if (uppyRef.current) {
      uppyRef.current.close();
      uppyRef.current = null;
    }

    setState('idle');
    setTitle('');
    setDescription('');
    setSelectedFile(null);
    setUploadProgress(0);
    setError(null);
    videoIdRef.current = null;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (uppyRef.current) {
        uppyRef.current.close();
      }
    };
  }, []);

  if (state === 'complete') {
    return (
      <div className="rounded-xl border border-green-300 bg-green-50 p-6 text-center">
        <svg
          className="mx-auto h-12 w-12 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <h3 className="mt-3 text-lg font-semibold text-green-900">Upload Complete!</h3>
        <p className="mt-1 text-sm text-green-700">
          Your video is processing and will be reviewed by admins before appearing on your profile.
        </p>
        <button
          onClick={handleReset}
          className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          Upload Another Video
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-app bg-card p-6">
      <div>
        <h3 className="text-lg font-semibold text-app">Upload Highlight Video</h3>
        <p className="mt-1 text-sm text-muted">
          Share your best performances. All videos are reviewed and will be published at the sole discretion of Certified Sliders, subject to quality and content standards.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-app">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., 100m Dash - State Finals"
          className="w-full rounded-lg border border-app px-3 py-2 text-sm"
          disabled={state === 'uploading' || state === 'processing'}
          maxLength={200}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-app">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional: Add context about this performance"
          rows={3}
          className="w-full rounded-lg border border-app px-3 py-2 text-sm"
          disabled={state === 'uploading' || state === 'processing'}
          maxLength={2000}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-app">Video File *</label>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="w-full text-sm"
          disabled={state === 'uploading' || state === 'processing'}
        />
        {selectedFile && (
          <div className="mt-1 space-y-1">
            <p className="text-xs text-muted">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
            <p className="text-xs text-muted">
              Upload method: <span className="font-semibold">
                {uploadMethod === 'tus' ? 'Resumable (tus)' : 'Basic'}
              </span>
              {uploadMethod === 'tus' && ' - Large file support with automatic resume on connection failure'}
            </p>
          </div>
        )}
        <p className="mt-1 text-xs text-muted">
          Max size: 500MB. Files over {(UPLOAD_SIZE_THRESHOLD / 1024 / 1024).toFixed(0)}MB use resumable upload.
        </p>
      </div>

      {state === 'uploading' && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Upload progress</span>
            <span className="font-semibold text-app">{uploadProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-scarlet transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleUpload}
          disabled={!selectedFile || !title.trim() || state === 'uploading' || state === 'processing'}
          className="rounded-lg bg-scarlet px-6 py-2 text-sm font-semibold text-white transition hover:bg-scarlet/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === 'uploading' ? 'Uploading...' : state === 'processing' ? 'Processing...' : 'Upload Video'}
        </button>

        {(state === 'selecting' || state === 'error') && (
          <button
            onClick={handleReset}
            className="text-sm font-semibold text-muted hover:text-app"
          >
            Cancel
          </button>
        )}
      </div>

      {state === 'processing' && (
        <div className="rounded-lg border border-blue-300 bg-blue-50 p-3">
          <div className="flex items-start gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <div>
              <p className="text-sm font-medium text-blue-900">Processing your video...</p>
              <p className="mt-1 text-xs text-blue-700">
                This may take a few minutes depending on video length.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
