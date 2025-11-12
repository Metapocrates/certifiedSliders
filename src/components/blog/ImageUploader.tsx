'use client';

import { useState, useRef, type DragEvent } from 'react';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';

interface ImageUploaderProps {
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string;
  label?: string;
  helperText?: string;
}

export default function ImageUploader({
  onImageUploaded,
  currentImageUrl,
  label = 'Upload Image',
  helperText,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const supabase = createClient();

      // First, verify the bucket exists
      console.log('Checking if blog-images bucket exists...');
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      console.log('Available buckets:', buckets?.map(b => b.name));

      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError);
      }

      const bucketExists = buckets?.some(b => b.name === 'blog-images');
      if (!bucketExists) {
        throw new Error('Storage bucket "blog-images" does not exist. Please run database migrations.');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      console.log('Uploading file to blog-images bucket:', filePath);

      // Upload to Supabase Storage with timeout
      const uploadPromise = supabase.storage
        .from('blog-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Upload timeout after 30 seconds - check storage policies and network')), 30000)
      );

      const { data, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]) as any;

      if (uploadError) {
        console.error('Upload error details:', uploadError);

        // Check for specific error types
        if (uploadError.statusCode === '403' || uploadError.message?.includes('permission') || uploadError.message?.includes('policy')) {
          throw new Error('Permission denied - ensure you are an admin with proper storage policies configured');
        }

        throw new Error(uploadError.message || 'Upload failed - storage bucket may not be configured');
      }

      if (!data) {
        throw new Error('Upload failed - no data returned');
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(filePath);

      console.log('Public URL:', publicUrl);

      setPreview(publicUrl);
      onImageUploaded(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onImageUploaded('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-app">{label}</label>}

      {preview ? (
        <div className="relative">
          <div className="relative h-48 w-full overflow-hidden rounded-lg border border-app bg-muted">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="mt-2 text-sm font-semibold text-scarlet hover:underline"
          >
            Remove image
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-lg border-2 border-dashed p-8 text-center transition ${
            isDragging
              ? 'border-scarlet bg-scarlet/5'
              : 'border-app/40 hover:border-app hover:bg-muted/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          {uploading ? (
            <div className="space-y-2">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-app/20 border-t-scarlet" />
              <p className="text-sm text-muted">Uploading...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <svg
                className="mx-auto h-12 w-12 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-semibold text-scarlet hover:underline"
                >
                  Click to upload
                </button>
                <span className="text-sm text-muted"> or drag and drop</span>
              </div>
              <p className="text-xs text-muted">PNG, JPG, GIF up to 5MB</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {helperText && !error && (
        <p className="text-xs text-muted">{helperText}</p>
      )}
    </div>
  );
}
