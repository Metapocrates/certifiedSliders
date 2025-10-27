// Server component
import Image from "next/image";
import SafeLink from "@/components/SafeLink";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getStarTierAccent } from "@/lib/star-theme";


export default async function FeaturedProfileCard() {
  const supabase = createSupabaseServer();

  // Try admin-curated featured profile
  const { data: feat } = await supabase
    .from("featured_profiles")
    .select("profile_id")
    .maybeSingle();

  type Profile = {
    id: string;
    username: string | null;
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
      .select("id, username, display_name, school_name, school_state, star_rating, profile_pic_url")
      .eq("id", feat.profile_id)
      .maybeSingle();
    profile = data ?? null;
  }

  // Fallback: highest star rating, then most recently updated
  if (!profile) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, school_name, school_state, star_rating, profile_pic_url")
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
  const starText = accent
    ? `${accent.tier}★ Certified`
    : typeof profile.star_rating === "number"
      ? `${profile.star_rating}★`
      : "Unrated";
  const href = profile.username ? `/athletes/${profile.username}` : undefined;
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
      <div className="relative h-40 w-40 shrink-0 overflow-hidden bg-gray-200">
        {profile.profile_pic_url ? (
          <Image
            src={profile.profile_pic_url}
            alt={profile.display_name ?? profile.username ?? "Athlete"}
            fill
            sizes="160px"
            className="object-cover transition duration-500 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-4xl">🙂</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-black/10 to-transparent opacity-90 transition group-hover:opacity-100" />
      </div>
      <div className="flex flex-1 flex-col justify-between gap-3 px-6 py-5">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.35em] text-muted">Featured slider</p>
          <h3 className="text-lg font-semibold text-app">
            {profile.display_name ?? profile.username}
          </h3>
          <p className="text-sm text-muted">
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
        <div className="flex items-center justify-between text-sm font-semibold uppercase tracking-[0.35em]">
          <span className={starTextClass}>
            {starText}
          </span>
          <span className="text-scarlet/80 transition group-hover:text-scarlet">
            View profile →
          </span>
        </div>
      </div>
    </>
  );

  return (
    <SafeLink
      href={href}
      className={`group relative flex overflow-hidden rounded-3xl border ${borderClass} bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${cardShadowClass}`}
      fallback={
        <div className="group relative flex overflow-hidden rounded-3xl border border-app bg-card shadow-sm">
          <CardInner />
        </div>
      }
    >
      <CardInner />
    </SafeLink>
  );
}
