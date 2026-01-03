'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ImageGalleryProps {
  onSelectImage: (url: string) => void;
  onClose: () => void;
}

export default function ImageGallery({ onSelectImage, onClose }: ImageGalleryProps) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      // Direct fetch to Storage API (avoids GoTrueClient conflicts)
      const response = await fetch(
        `${supabaseUrl}/storage/v1/object/list/blog-images`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prefix: '',
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Storage API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Filter out folder placeholders (files starting with .)
      const validFiles = (data || []).filter((file: any) => !file.name.startsWith('.'));

      const urls = validFiles.map((file: any) => {
        return `${supabaseUrl}/storage/v1/object/public/blog-images/${file.name}`;
      });

      setImages(urls);
    } catch (err: any) {
      console.error('Failed to load images:', err);
      setError(err?.message || 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (url: string) => {
    onSelectImage(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-4xl rounded-2xl border border-app bg-card p-6 shadow-2xl max-h-[80vh] overflow-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-app">Select Image</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-app transition"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-app/20 border-t-scarlet" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            {error}
          </div>
        ) : images.length === 0 ? (
          <div className="rounded-lg border border-dashed border-app/40 bg-muted/30 p-12 text-center">
            <p className="text-muted">No images uploaded yet</p>
            <p className="mt-2 text-sm text-muted">Upload your first image to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((url, index) => (
              <button
                key={index}
                onClick={() => handleSelect(url)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-app bg-muted transition hover:border-scarlet hover:shadow-lg"
              >
                <Image
                  src={url}
                  alt={`Image ${index + 1}`}
                  fill
                  className="object-cover transition group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
