// src/components/athletes/AthleteShareActions.tsx
"use client";

import { useMemo, useState } from "react";
import type { StarTierAccent } from "@/lib/star-theme";

type Props = {
  profileUrl: string;
  cardUrl: string;
  shareText: string;
  accent?: StarTierAccent | null;
};

export default function AthleteShareActions({ profileUrl, cardUrl, shareText, accent }: Props) {
  const [copied, setCopied] = useState(false);
  const borderClass = accent?.borderClass ?? "border-white/15";
  const buttonBorderClass = accent?.borderClass ?? "border-white/30";
  const accentHeadlineClass = accent?.badgeTextClass ?? "text-white/60";
  const accentDetailClass = accent?.textAccentClass ?? "text-white/70";

  const xShareHref = useMemo(() => {
    const url = new URL("https://twitter.com/intent/tweet");
    url.searchParams.set("text", shareText);
    url.searchParams.set("url", profileUrl);
    return url.toString();
  }, [profileUrl, shareText]);

  const threadsShareHref = useMemo(() => {
    const url = new URL("https://www.threads.net/intent/post");
    url.searchParams.set("text", `${shareText} ${profileUrl}`);
    return url.toString();
  }, [profileUrl, shareText]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // no-op
    }
  }

  return (
    <div
      className={`rounded-2xl border ${borderClass} bg-white/10 px-5 py-5 text-xs text-white/80 shadow-lg backdrop-blur`}
    >
      <p className={`text-[0.7rem] font-semibold uppercase tracking-[0.4em] ${accentHeadlineClass}`}>
        Share your certified card
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/80">
        Spark up the timeline with your verified status. Download the social card or link directly to your profile.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={xShareHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex h-9 items-center justify-center rounded-full border ${buttonBorderClass} px-4 text-xs font-semibold uppercase tracking-[0.24em] text-white transition hover:-translate-y-0.5 hover:border-white hover:bg-white/10`}
        >
          Share on X
        </a>
        <a
          href={threadsShareHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex h-9 items-center justify-center rounded-full border ${buttonBorderClass} px-4 text-xs font-semibold uppercase tracking-[0.24em] text-white transition hover:-translate-y-0.5 hover:border-white hover:bg-white/10`}
        >
          Post to Threads
        </a>
        <a
          href={cardUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          className={`inline-flex h-9 items-center justify-center rounded-full border ${buttonBorderClass} px-4 text-xs font-semibold uppercase tracking-[0.24em] text-white transition hover:-translate-y-0.5 hover:border-white hover:bg-white/10`}
        >
          Download card
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex h-9 items-center justify-center rounded-full border ${buttonBorderClass} px-4 text-xs font-semibold uppercase tracking-[0.24em] text-white transition hover:-translate-y-0.5 hover:border-white hover:bg-white/10`}
        >
          {copied ? "Link copied!" : "Copy profile link"}
        </button>
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[11px] text-white/70">
        <span className={`font-semibold ${accentDetailClass}`}>Pro tip:</span> Tap the card preview to save out a PNG, then tag{" "}
        <span className="font-semibold text-white">@CertifiedSliders</span> so we can boost your post.
      </div>
    </div>
  );
}
