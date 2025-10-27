// src/lib/star-theme.ts

export type StarTierAccent = {
  tier: 3 | 4 | 5;
  borderClass: string;
  glowClass: string;
  badgeContainerClass: string;
  badgeTextClass: string;
  ribbonBgClass: string;
  ribbonTextClass: string;
  cardShadowClass: string;
  textAccentClass: string;
};

const GOLD = {
  borderClass: "border-[#F5C518]/80",
  glowClass: "shadow-[0_30px_80px_rgba(245,197,24,0.35)]",
  badgeContainerClass: "bg-[#F5C518]/15 border-[#F5C518]/40",
  badgeTextClass: "text-[#F5C518]",
  ribbonBgClass: "bg-[#F5C518]",
  ribbonTextClass: "text-[#111827]",
  cardShadowClass: "shadow-[0_18px_45px_rgba(245,197,24,0.25)]",
  textAccentClass: "text-[#F5C518]",
} satisfies Omit<StarTierAccent, "tier">;

const SILVER = {
  borderClass: "border-[#D1D5DB]/80",
  glowClass: "shadow-[0_28px_70px_rgba(209,213,219,0.3)]",
  badgeContainerClass: "bg-[#D1D5DB]/15 border-[#D1D5DB]/40",
  badgeTextClass: "text-[#E5E7EB]",
  ribbonBgClass: "bg-[#E5E7EB]",
  ribbonTextClass: "text-[#111827]",
  cardShadowClass: "shadow-[0_16px_40px_rgba(209,213,219,0.22)]",
  textAccentClass: "text-[#E5E7EB]",
} satisfies Omit<StarTierAccent, "tier">;

const BRONZE = {
  borderClass: "border-[#C08457]/80",
  glowClass: "shadow-[0_24px_60px_rgba(192,132,87,0.3)]",
  badgeContainerClass: "bg-[#C08457]/12 border-[#C08457]/35",
  badgeTextClass: "text-[#F2CEA4]",
  ribbonBgClass: "bg-[#C08457]",
  ribbonTextClass: "text-[#1F1308]",
  cardShadowClass: "shadow-[0_14px_36px_rgba(192,132,87,0.25)]",
  textAccentClass: "text-[#F2CEA4]",
} satisfies Omit<StarTierAccent, "tier">;

export function getStarTierAccent(starRating: number | null | undefined): StarTierAccent | null {
  if (starRating == null) return null;
  const rounded = Math.floor(starRating);
  if (rounded >= 5) {
    return { tier: 5, ...GOLD };
  }
  if (rounded === 4) {
    return { tier: 4, ...SILVER };
  }
  if (rounded === 3) {
    return { tier: 3, ...BRONZE };
  }
  return null;
}

