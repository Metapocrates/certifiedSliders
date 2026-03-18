/**
 * ExternalRankBadge — Displays third-party ranking references on athlete profiles
 *
 * COMPLIANCE:
 * - Third-party rank is visually SECONDARY to our star rating
 * - Always shows source attribution (name + link)
 * - Shows "as of" date for freshness context
 * - Never displays editorial text or descriptions
 */

import type { ExternalRankReference } from "@/lib/ingestion/publication";

export default function ExternalRankBadge({
  ranks,
}: {
  ranks: ExternalRankReference[];
}) {
  if (!ranks || ranks.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {ranks.map((rank) => (
        <a
          key={`${rank.source_name}-${rank.rank}`}
          href={rank.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-app/20 bg-muted/30 px-3 py-1 text-xs text-muted transition hover:border-app/40 hover:text-app"
        >
          <span className="font-medium">{rank.source_name} Rank:</span>
          <span className="font-semibold">#{rank.rank}</span>
          <span className="text-muted/70">
            (as of{" "}
            {new Date(rank.fetched_at).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
            )
          </span>
        </a>
      ))}
    </div>
  );
}
