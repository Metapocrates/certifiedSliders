/**
 * Profile border utilities based on star rating
 *
 * Border colors:
 * - Gold: star_rating >= 5
 * - Silver: star_rating >= 4
 * - Bronze: star_rating >= 3
 * - None: star_rating < 3
 */

export type BorderTier = "gold" | "silver" | "bronze" | "none";

export interface ProfileBorderStyle {
  tier: BorderTier;
  borderClass: string;
  ringClass: string;
  badgeClass: string;
  label: string;
}

/**
 * Determine border tier from star rating
 */
export function getBorderTier(starRating: number | null | undefined): BorderTier {
  if (starRating == null) return "none";
  if (starRating >= 5) return "gold";
  if (starRating >= 4) return "silver";
  if (starRating >= 3) return "bronze";
  return "none";
}

/**
 * Get Tailwind classes for profile border styling
 */
export function getProfileBorderStyle(starRating: number | null | undefined): ProfileBorderStyle {
  const tier = getBorderTier(starRating);

  const styles: Record<BorderTier, Omit<ProfileBorderStyle, "tier">> = {
    gold: {
      borderClass: "border-2 border-yellow-400 shadow-lg shadow-yellow-400/30",
      ringClass: "ring-2 ring-yellow-400 ring-offset-2",
      badgeClass: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white",
      label: "Gold Athlete",
    },
    silver: {
      borderClass: "border-2 border-gray-400 shadow-lg shadow-gray-400/30",
      ringClass: "ring-2 ring-gray-400 ring-offset-2",
      badgeClass: "bg-gradient-to-r from-gray-300 to-gray-500 text-white",
      label: "Silver Athlete",
    },
    bronze: {
      borderClass: "border-2 border-orange-600 shadow-lg shadow-orange-600/30",
      ringClass: "ring-2 ring-orange-600 ring-offset-2",
      badgeClass: "bg-gradient-to-r from-orange-500 to-orange-700 text-white",
      label: "Bronze Athlete",
    },
    none: {
      borderClass: "border border-gray-200",
      ringClass: "",
      badgeClass: "",
      label: "",
    },
  };

  return {
    tier,
    ...styles[tier],
  };
}

/**
 * Get star display component (for showing rating visually)
 */
export function getStarDisplay(starRating: number | null | undefined): {
  stars: number;
  emoji: string;
} {
  const stars = starRating ?? 0;
  let emoji = "";

  if (stars >= 5) emoji = "⭐⭐⭐⭐⭐";
  else if (stars >= 4) emoji = "⭐⭐⭐⭐";
  else if (stars >= 3) emoji = "⭐⭐⭐";
  else if (stars >= 2) emoji = "⭐⭐";
  else if (stars >= 1) emoji = "⭐";

  return { stars, emoji };
}
