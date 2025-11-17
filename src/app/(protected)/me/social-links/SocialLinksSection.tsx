"use client";

import { useState, useTransition } from "react";
import { updateSocialLinks, type SocialLinks } from "./actions";

const SOCIAL_PLATFORMS = [
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "@username",
    icon: "📷",
    prefix: "https://instagram.com/",
  },
  {
    key: "tiktok",
    label: "TikTok",
    placeholder: "@username",
    icon: "🎵",
    prefix: "https://tiktok.com/@",
  },
  {
    key: "twitter",
    label: "Twitter/X",
    placeholder: "@handle",
    icon: "🐦",
    prefix: "https://twitter.com/",
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "channel or @handle",
    icon: "▶️",
    prefix: "https://youtube.com/",
  },
] as const;

export default function SocialLinksSection({
  initialLinks,
}: {
  initialLinks: SocialLinks;
}) {
  const [links, setLinks] = useState<SocialLinks>(initialLinks || {});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleChange(platform: string, value: string) {
    setLinks((prev) => ({
      ...prev,
      [platform]: value.trim(),
    }));
    setError(null);
    setSuccess(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Filter out empty values
    const cleanedLinks = Object.fromEntries(
      Object.entries(links).filter(([_, v]) => v && v.trim().length > 0)
    );

    startTransition(async () => {
      const res = await updateSocialLinks(cleanedLinks);
      if (!res?.ok) {
        setError(res?.message ?? "Could not update social links.");
        return;
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    });
  }

  const hasChanges = JSON.stringify(links) !== JSON.stringify(initialLinks);

  return (
    <section className="mt-10 space-y-4 rounded-3xl border border-app bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">
            Connect
          </p>
          <h2 className="text-2xl font-semibold text-app">Social Media Links</h2>
          <p className="text-sm text-muted">
            Share your social profiles with coaches and recruiters.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SOCIAL_PLATFORMS.map((platform) => (
            <div key={platform.key}>
              <label className="block text-sm font-medium text-app mb-1.5">
                <span className="mr-1">{platform.icon}</span>
                {platform.label}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={links[platform.key] || ""}
                  onChange={(e) => handleChange(platform.key, e.target.value)}
                  placeholder={platform.placeholder}
                  className="w-full rounded-lg border border-app px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-scarlet/50"
                  disabled={pending}
                />
              </div>
              {links[platform.key] && (
                <a
                  href={`${platform.prefix}${links[platform.key]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-xs text-scarlet hover:underline"
                >
                  Preview: {platform.prefix}
                  {links[platform.key]}
                </a>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || !hasChanges}
            className="rounded-full bg-scarlet px-6 py-2 text-sm font-semibold text-white transition hover:bg-scarlet/90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pending ? "Saving..." : "Save Changes"}
          </button>
          {success && (
            <span className="text-sm text-green-600 font-medium">✓ Saved successfully</span>
          )}
        </div>

        {error && <p className="text-sm text-scarlet">{error}</p>}
      </form>
    </section>
  );
}
