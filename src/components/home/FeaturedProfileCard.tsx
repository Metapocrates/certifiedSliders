// Server component
import Image from "next/image";
import SafeLink from "@/components/SafeLink";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getStarTierAccent } from "@/lib/star-theme";


export default async function FeaturedProfileCard() {
  const supabase = await createSupabaseServer();

  // Try admin-curated featured profile
  const { data: feat } = await supabase
    .from("featured_profiles")
    .select("profile_id")
    .maybeSingle();

  type Profile = {
    id: string;
    username: string | null;
    profile_id: string;
    display_name: string | null;
    school_name: string | null;
    school_state: string | null;
    star_rating: number | null;
    profile_pic_url: string | null;
  };

  let profile: Profile | null = null;

  if (feat?.profile_id) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, profile_id, display_name, school_name, school_state, star_rating, profile_pic_url")
      .eq("id", feat.profile_id)
      .maybeSingle();
    profile = data ?? null;
  }

  // Fallback: highest star rating, then most recently updated
  if (!profile) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, profile_id, display_name, school_name, school_state, star_rating, profile_pic_url")
      .order("star_rating", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    profile = data ?? null;
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-app bg-card p-5 text-sm text-muted shadow-sm">
        <h3 className="text-base font-semibold text-app">Featured profile</h3>
        <p className="mt-2 text-sm leading-relaxed">
          No spotlight athlete selected yet. Check the rankings to see who&apos;s trending.
        </p>
      </div>
    );
  }

  const accent = getStarTierAccent(profile.star_rating ?? null);
  const hasAccent = Boolean(accent);
  const starRating = profile.star_rating ?? 0;
  const starText = starRating >= 3 && starRating <= 5
    ? "★".repeat(starRating)
    : starRating > 0
      ? `${starRating}★`
      : "Unrated";
  const href = profile.profile_id ? `/athletes/${profile.profile_id}` : undefined;
  const borderClass = accent?.borderClass ?? "border-app";
  const cardShadowClass = accent?.cardShadowClass ?? "";
  const ribbonBgClass = accent?.ribbonBgClass ?? "bg-[#F5C518]";
  const ribbonTextClass = accent?.ribbonTextClass ?? "text-[#111827]";
  const starTextClass = accent?.textAccentClass ?? "text-scarlet";

  const CardInner = () => (
    <>
      {hasAccent ? (
        <div
          className={`pointer-events-none absolute -left-24 top-6 z-10 w-64 -rotate-45 py-1 text-center text-[10px] font-semibold uppercase tracking-[0.6em] shadow-lg ${ribbonBgClass} ${ribbonTextClass}`}
        >
          Certified
        </div>
      ) : null}
      {/* Full background image */}
      <div className="absolute inset-0">
        {profile.profile_pic_url ? (
          <Image
            src={profile.profile_pic_url}
            alt={profile.display_name ?? profile.username ?? "Athlete"}
            fill
            sizes="400px"
            className="object-cover transition duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <Image src="/runner-default.png" alt="" width={120} height={120} className="opacity-20" unoptimized />
          </div>
        )}
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      </div>
      {/* Text content overlay */}
      <div className="relative flex h-full flex-col justify-end p-6 text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.8)' }}>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-white/90">
            Featured Slider
          </p>
          <h3 className="text-xl font-bold">
            {profile.display_name ?? profile.username}
          </h3>
          <p className="text-sm text-white/90">
            {profile.school_name ? (
              <>
                {profile.school_name}
                {profile.school_state ? `, ${profile.school_state}` : ""}
              </>
            ) : (
              "Unlisted program"
            )}
          </p>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className={`text-lg font-bold tracking-wider ${starTextClass === 'text-scarlet' ? 'text-scarlet-300' : 'text-yellow-300'}`}>
            {starText}
          </span>
          <span className="text-sm font-semibold text-white transition group-hover:text-white">
            View profile →
          </span>
        </div>
      </div>
    </>
  );

  return (
    <SafeLink
      href={href}
      className={`group relative block h-64 overflow-hidden rounded-3xl border ${borderClass} shadow-lg transition hover:-translate-y-1 hover:shadow-xl ${cardShadowClass}`}
      fallback={
        <div className="group relative block h-64 overflow-hidden rounded-3xl border border-app shadow-lg">
          <CardInner />
        </div>
      }
    >
      <CardInner />
    </SafeLink>
  );
}
