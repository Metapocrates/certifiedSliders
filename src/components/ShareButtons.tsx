"use client";

import { useState } from "react";

type ShareButtonsProps = {
  url: string;
  title: string;
  description?: string;
  hashtags?: string[];
};

export default function ShareButtons({ url, title, description, hashtags = [] }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(false);

  const fullUrl = url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_SUPABASE_SITE_URL || "https://certifiedsliders.vercel.app"}${url}`;
  const hashtagString = hashtags.length > 0 ? hashtags.map((h) => `#${h}`).join(" ") : "";
  const shareText = `${title}${description ? ` - ${description}` : ""} ${hashtagString}`.trim();

  const handleShare = async () => {
    // Try native Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: fullUrl,
        });
        // Share was successful, no need for visual feedback since the share sheet provides it
        return;
      } catch (err) {
        // User cancelled or error occurred
        if ((err as Error).name === 'AbortError') {
          // User cancelled, do nothing
          return;
        }
        // Fall through to copy link
        console.error("Share failed:", err);
        setShareError(true);
        setTimeout(() => setShareError(false), 3000);
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setShareError(true);
      setTimeout(() => setShareError(false), 3000);
    }
  };

  // Check if Web Share API is available
  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="space-y-3">
      <button
        onClick={handleShare}
        className="flex items-center gap-2 rounded-lg border border-app bg-card px-4 py-2.5 text-sm font-semibold text-app transition hover:bg-muted hover:border-scarlet"
        title={hasNativeShare ? "Share profile" : "Copy link to profile"}
      >
        {hasNativeShare ? (
          <>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share Profile</span>
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{copied ? "Copied!" : "Copy Link to Share"}</span>
          </>
        )}
      </button>

      {/* Success/Error Toast */}
      {copied && !hasNativeShare && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-xs text-green-900">
          <p className="font-semibold">✓ Link copied to clipboard!</p>
          <p className="mt-1 text-green-700">Share it on social media, in messages, or anywhere you&apos;d like.</p>
        </div>
      )}

      {shareError && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-900">
          <p className="font-semibold">Unable to share</p>
          <p className="mt-1 text-red-700">Please try again or copy the URL from your browser.</p>
        </div>
      )}

      {/* Optional: Show helpful text for mobile users */}
      {hasNativeShare && (
        <p className="text-xs text-muted">
          Tap to share on social media, send via text, or copy the link
        </p>
      )}
    </div>
  );
}
