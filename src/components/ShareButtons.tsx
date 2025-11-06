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
  const [showMobileMessage, setShowMobileMessage] = useState(false);

  const fullUrl = url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_SUPABASE_SITE_URL || "https://certifiedsliders.vercel.app"}${url}`;
  const hashtagString = hashtags.length > 0 ? hashtags.map((h) => `#${h}`).join(" ") : "";
  const shareText = `${title}${description ? ` - ${description}` : ""} ${hashtagString}`.trim();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullUrl)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;
    window.open(facebookUrl, "_blank", "width=550,height=420");
  };

  const handleInstagramShare = async () => {
    // Instagram doesn't have a web share API, so we copy and show instructions
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${fullUrl}`);
      setShowMobileMessage(true);
      setTimeout(() => setShowMobileMessage(false), 5000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleTikTokShare = async () => {
    // TikTok doesn't have a web share API, so we copy and show instructions
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${fullUrl}`);
      setShowMobileMessage(true);
      setTimeout(() => setShowMobileMessage(false), 5000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleTwitterShare}
          className="flex items-center gap-1.5 rounded-lg bg-[#1DA1F2] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1a8cd8]"
          title="Share on Twitter"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span>Twitter</span>
        </button>

        <button
          onClick={handleFacebookShare}
          className="flex items-center gap-1.5 rounded-lg bg-[#1877F2] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#166fe5]"
          title="Share on Facebook"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span>Facebook</span>
        </button>

        <button
          onClick={handleInstagramShare}
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
          title="Copy for Instagram"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
          <span>Instagram</span>
        </button>

        <button
          onClick={handleTikTokShare}
          className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-800"
          title="Copy for TikTok"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
          </svg>
          <span>TikTok</span>
        </button>
      </div>

      <div className="relative">
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 rounded-lg border border-app bg-card px-3 py-2 text-xs font-semibold text-app transition hover:bg-muted"
          title="Copy link"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>{copied ? "Copied!" : "Copy Link"}</span>
        </button>

        {showMobileMessage && (
          <div className="absolute left-0 right-0 bottom-full z-10 mb-2 max-w-xs rounded-lg border border-blue-300 bg-blue-50 p-3 text-xs text-blue-900 shadow-lg">
            <p className="font-semibold">Link copied!</p>
            <p className="mt-1">Open Instagram or TikTok and paste the text into your post or story.</p>
          </div>
        )}
      </div>
    </div>
  );
}
