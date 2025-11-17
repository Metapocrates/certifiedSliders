/**
 * ProfileBorder component
 *
 * Wraps profile content with a tier-based border (gold/silver/bronze)
 */

import { getProfileBorderStyle, getStarDisplay } from "@/lib/profileBorder";

interface ProfileBorderProps {
  starRating: number | null | undefined;
  children: React.ReactNode;
  showBadge?: boolean;
  className?: string;
}

export default function ProfileBorder({
  starRating,
  children,
  showBadge = false,
  className = "",
}: ProfileBorderProps) {
  const borderStyle = getProfileBorderStyle(starRating);
  const starDisplay = getStarDisplay(starRating);

  return (
    <div className={`relative ${className}`}>
      {/* Border container */}
      <div
        className={`rounded-xl ${borderStyle.borderClass} bg-card p-5 transition-all`}
      >
        {/* Star badge (optional) */}
        {showBadge && borderStyle.tier !== "none" && (
          <div className="absolute -top-3 left-4">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-md ${borderStyle.badgeClass}`}
            >
              {starDisplay.emoji} {borderStyle.label}
            </span>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
