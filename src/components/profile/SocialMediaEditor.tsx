'use client';

import { useState } from 'react';

interface SocialMediaEditorProps {
  initialData?: {
    instagram_url?: string | null;
    twitter_url?: string | null;
    tiktok_url?: string | null;
    youtube_url?: string | null;
  };
  onSave?: () => void;
}

export default function SocialMediaEditor({ initialData, onSave }: SocialMediaEditorProps) {
  const [instagramUrl, setInstagramUrl] = useState(initialData?.instagram_url || '');
  const [twitterUrl, setTwitterUrl] = useState(initialData?.twitter_url || '');
  const [tiktokUrl, setTiktokUrl] = useState(initialData?.tiktok_url || '');
  const [youtubeUrl, setYoutubeUrl] = useState(initialData?.youtube_url || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      const response = await fetch('/api/profile/social-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instagram_url: instagramUrl || null,
          twitter_url: twitterUrl || null,
          tiktok_url: tiktokUrl || null,
          youtube_url: youtubeUrl || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update social media links');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSave?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-app">Social Media Links</h3>
        <p className="mt-1 text-sm text-muted">
          Add your social media profiles to showcase highlights, training, and personality
        </p>
      </div>

      {/* Instagram */}
      <div>
        <label htmlFor="instagram" className="block text-sm font-medium text-app">
          Instagram
        </label>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-muted">instagram.com/</span>
          <input
            id="instagram"
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/yourhandle"
            className="flex-1 rounded-lg border border-app bg-card px-4 py-2 text-app placeholder:text-muted focus:border-scarlet focus:outline-none focus:ring-2 focus:ring-scarlet/20"
          />
        </div>
        <p className="mt-1 text-xs text-muted">Full URL, e.g., https://instagram.com/yourhandle</p>
      </div>

      {/* Twitter/X */}
      <div>
        <label htmlFor="twitter" className="block text-sm font-medium text-app">
          Twitter / X
        </label>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-muted">twitter.com/ or x.com/</span>
          <input
            id="twitter"
            type="url"
            value={twitterUrl}
            onChange={(e) => setTwitterUrl(e.target.value)}
            placeholder="https://twitter.com/yourhandle"
            className="flex-1 rounded-lg border border-app bg-card px-4 py-2 text-app placeholder:text-muted focus:border-scarlet focus:outline-none focus:ring-2 focus:ring-scarlet/20"
          />
        </div>
        <p className="mt-1 text-xs text-muted">Full URL, e.g., https://twitter.com/yourhandle</p>
      </div>

      {/* TikTok */}
      <div>
        <label htmlFor="tiktok" className="block text-sm font-medium text-app">
          TikTok
        </label>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-muted">tiktok.com/@</span>
          <input
            id="tiktok"
            type="url"
            value={tiktokUrl}
            onChange={(e) => setTiktokUrl(e.target.value)}
            placeholder="https://tiktok.com/@yourhandle"
            className="flex-1 rounded-lg border border-app bg-card px-4 py-2 text-app placeholder:text-muted focus:border-scarlet focus:outline-none focus:ring-2 focus:ring-scarlet/20"
          />
        </div>
        <p className="mt-1 text-xs text-muted">Full URL, e.g., https://tiktok.com/@yourhandle</p>
      </div>

      {/* YouTube */}
      <div>
        <label htmlFor="youtube" className="block text-sm font-medium text-app">
          YouTube
        </label>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm text-muted">youtube.com/</span>
          <input
            id="youtube"
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/@yourchannel"
            className="flex-1 rounded-lg border border-app bg-card px-4 py-2 text-app placeholder:text-muted focus:border-scarlet focus:outline-none focus:ring-2 focus:ring-scarlet/20"
          />
        </div>
        <p className="mt-1 text-xs text-muted">Full URL, e.g., https://youtube.com/@yourchannel</p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          <p className="font-semibold">Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          <p className="font-semibold">Success!</p>
          <p className="mt-1">Your social media links have been updated.</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-scarlet px-6 py-2 font-semibold text-white transition hover:bg-scarlet/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Social Media Links'}
      </button>
    </form>
  );
}
