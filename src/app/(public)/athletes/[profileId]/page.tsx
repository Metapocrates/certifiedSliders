// src/app/(public)/athletes/[profileId]/page.tsx
import { headers } from "next/headers";
import Image from "next/image";
import type { Metadata } from "next";
import SafeLink from "@/components/SafeLink";
import EventCard from "@/components/athletes/EventCard";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getStarTierAccent } from "@/lib/star-theme";
import { getCurrentGrade, formatGrade } from "@/lib/grade";
import { formatAthleteMetaTitle, formatAthleteMetaDescription } from "@/lib/seo/utils";
import AthleteJsonLd from "@/components/seo/AthleteJsonLd";
import FlagButton from "@/components/FlagButton";
import AcademicInfoEditor from "@/components/profile/AcademicInfoEditor";
import VideoClipManager from "@/components/profile/VideoClipManager";
import BioVisibilitySelector from "@/components/profile/BioVisibilitySelector";
import ContactInfoManager from "@/components/profile/ContactInfoManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { profileId: string } }): Promise<Metadata> {
  const supabase = createSupabaseServer();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, username, class_year, school_name, school_state, star_rating, gender, profile_pic_url, updated_at")
    .eq("profile_id", params.profileId)
    .maybeSingle();

  if (!profile) {
    return {
      title: "Athlete Not Found | Certified Sliders",
      description: "This athlete profile could not be found.",
      robots: { index: false, follow: true },
    };
  }

  // Get primary event (best mark)
  const { data: bestMarks } = await supabase
    .from("mv_best_event")
    .select("event")
    .eq("athlete_id", profile.id)
    .order("best_seconds_adj", { ascending: true })
    .limit(1);

  const primaryEvent = bestMarks?.[0]?.event || null;
  const name = profile.full_name || profile.username || params.profileId;
  const url = `https://www.certifiedsliders.com/athletes/${params.profileId}`;

  const title = formatAthleteMetaTitle(name, profile.class_year, primaryEvent);
  const description = formatAthleteMetaDescription(
    name,
    profile.class_year,
    profile.school_name,
    profile.school_state,
    primaryEvent,
    profile.star_rating
  );

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: "Certified Sliders",
      type: "profile",
      images: profile.profile_pic_url
        ? [{ url: profile.profile_pic_url, width: 400, height: 400 }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: profile.profile_pic_url ? [profile.profile_pic_url] : undefined,
    },
  };
}

type PageProps = {
  params: { profileId: string };
  searchParams: { claimed?: "ok" | "already" | "not_found" | "fail" };
};

function fmtTime(sec: number | null | undefined, text?: string | null) {
  if (text) return text;
  if (sec == null) return "—";
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return mm > 0 ? `${mm}:${ss.toFixed(2).padStart(5, "0")}` : ss.toFixed(2);
}

function Toast({ kind, msg }: { kind: "success" | "error" | "info"; msg: string }) {
  const palette =
    kind === "success"
      ? { border: "border-green-200", bg: "bg-green-50", text: "text-green-800" }
      : kind === "error"
        ? { border: "border-red-200", bg: "bg-red-50", text: "text-red-800" }
        : { border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-800" };
  return (
    <div className={`rounded-2xl border ${palette.border} ${palette.bg} px-4 py-3 text-sm ${palette.text}`}>
      {msg}
    </div>
  );
}

export default async function AthleteProfilePage({ params, searchParams }: PageProps) {
  const { profileId } = params;
  const supabase = createSupabaseServer();

  // Who's viewing?
  const { data: authData } = await supabase.auth.getUser();
  const viewer = authData?.user ?? null;

  // Profile - lookup by profile_id
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, username, school_name, school_state, class_year, profile_pic_url, bio, bio_visibility, email, phone, share_contact_info, gender, claimed_by, star_rating, profile_id"
    )
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-2">Athlete</h1>
        <p className="text-red-700">Athlete not found.</p>
      </div>
    );
  }

  // Check ownership early for query modifications
  const { data: authData2 } = await supabase.auth.getUser();
  const viewer2 = authData2?.user ?? null;
  const isOwnerEarly = !!viewer2 && (viewer2.id === profile.id || viewer2.id === profile.claimed_by);

  // Best marks (mv or fallback)
  // Skip materialized view for owners to show pending results
  let best: Array<any> | null = null;

  if (!isOwnerEarly) {
    // Use materialized view for non-owners (faster)
    try {
      const { data } = await supabase
        .from("mv_best_event")
        .select(
          "event, best_seconds_adj, best_mark_text, wind_legal, wind, meet_name, meet_date, proof_url, season, grade"
        )
        .eq("athlete_id", profile.id)
        .order("best_seconds_adj", { ascending: true, nullsFirst: false })
        .limit(100);
      best = data ?? null;
    } catch {
      best = null;
    }
  }

  if (!best) {
    // For owners, include pending and manual_review results
    const statusFilter = isOwnerEarly
      ? ['verified', 'approved', 'pending', 'manual_review']
      : ['verified', 'approved'];

    const { data: results } = await supabase
      .from("results")
      .select("id, event, mark, mark_seconds_adj, wind, meet_name, meet_date, proof_url, season, status, grade")
      .eq("athlete_id", profile.id)
      .in("status", statusFilter)
      .eq("visible_on_profile", true)
      .limit(1000);

    const map = new Map<string, any>();
    for (const r of results ?? []) {
      const k = r.event;
      const curr = map.get(k);
      const currSec = curr?.mark_seconds_adj ?? Number.POSITIVE_INFINITY;
      const sec = r.mark_seconds_adj ?? Number.POSITIVE_INFINITY;
      if (!curr || sec < currSec) map.set(k, r);
    }
    best = Array.from(map.values()).sort((a, b) => {
      const aa = a.mark_seconds_adj ?? Number.POSITIVE_INFINITY;
      const bb = b.mark_seconds_adj ?? Number.POSITIVE_INFINITY;
      return aa - bb;
    });
  }

  const historyHref = profile.profile_id ? `/athletes/${profile.profile_id}/history` : undefined;
  const teamLabel = profile.school_name
    ? `${profile.school_name}${profile.school_state ? `, ${profile.school_state}` : ""}`
    : "Unlisted program";

  // Calculate current grade and format class label
  const currentGrade = profile.class_year ? getCurrentGrade(profile.class_year) : null;
  const gradeText = currentGrade ? formatGrade(currentGrade) : null;
  const classLabel = profile.class_year
    ? (gradeText ? `${gradeText} • Class of ${profile.class_year}` : `Class of ${profile.class_year}`)
    : "Class year TBD";

  const genderLabel = profile.gender === "M" ? "Boys" : profile.gender === "F" ? "Girls" : "—";
  const starRating = profile.star_rating ?? 0;
  const starLabel = starRating >= 3 && starRating <= 5
    ? "★".repeat(starRating)
    : starRating > 0
      ? `${starRating}★`
      : null;
  const accent = getStarTierAccent(profile.star_rating ?? null);
  const accentBadgeLabel = accent ? `${accent.tier}★ Certified` : null;

  const { data: interestsData } = await supabase
    .from("athlete_college_interests")
    .select("college_name, created_at")
    .eq("athlete_id", profile.id)
    .order("created_at", { ascending: true });

  const collegeInterests = (interestsData ?? []).map((row) => ({
    name: row.college_name,
    createdAt: row.created_at,
  }));

  const { data: linkedIdentitiesData } = await supabase
    .from("external_identities")
    .select("profile_url, external_id, external_numeric_id, is_primary, verified")
    .eq("user_id", profile.id)
    .eq("provider", "athleticnet")
    .eq("verified", true)
    .order("is_primary", { ascending: false })
    .order("verified_at", { ascending: false });

  const verifiedIdentities = (linkedIdentitiesData ?? []).map((row) => ({
    profileUrl: row.profile_url as string,
    externalId: row.external_id as string,
    numericId: row.external_numeric_id as string | null,
    isPrimary: row.is_primary as boolean,
  }));

  const primaryIdentity = verifiedIdentities.find((row) => row.isPrimary) ?? verifiedIdentities[0];
  const secondaryIdentities = verifiedIdentities.filter((row) => row !== primaryIdentity);

  // Fetch event preferences for organizing featured vs other events
  const { data: eventPreferences } = await supabase
    .from("athlete_event_preferences")
    .select("event, is_featured, display_order")
    .eq("athlete_id", profile.id);

  const prefsMap = new Map(
    (eventPreferences ?? []).map((p) => [p.event, { is_featured: p.is_featured, display_order: p.display_order }])
  );

  // Organize events into featured and other
  const featuredEvents: Array<any> = [];
  const otherEvents: Array<any> = [];

  for (const event of best ?? []) {
    const pref = prefsMap.get(event.event);
    if (pref?.is_featured) {
      featuredEvents.push({ ...event, display_order: pref.display_order });
    } else {
      otherEvents.push(event);
    }
  }

  // Sort featured events by display_order
  featuredEvents.sort((a, b) => a.display_order - b.display_order);

  // Ownership + CTAs
  const isOwner = !!viewer && (viewer.id === profile.id || viewer.id === profile.claimed_by);
  const showClaim = !!viewer && !isOwner && profile.claimed_by == null;

  // Check if viewer is admin
  let isAdmin = false;
  if (viewer) {
    const { data: adminRow } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", viewer.id)
      .maybeSingle();
    isAdmin = !!adminRow;
  }

  // Get academic info (only show if owner or if athlete has shared with coaches and viewer is a coach)
  const { data: academicInfo } = await supabase
    .from("athlete_academic_info")
    .select("gpa, sat_score, act_score, share_with_coaches")
    .eq("athlete_id", profile.id)
    .maybeSingle();

  // Check if viewer is a coach with access to this athlete
  let isCoachWithAccess = false;
  if (viewer && !isOwner) {
    const { data: coachAccess } = await supabase
      .from("program_memberships")
      .select("program_id")
      .eq("user_id", viewer.id);

    if (coachAccess && coachAccess.length > 0) {
      const programIds = coachAccess.map((m) => m.program_id);
      const { data: interest } = await supabase
        .from("athlete_college_interests")
        .select("program_id")
        .eq("athlete_id", profile.id)
        .in("program_id", programIds)
        .maybeSingle();

      isCoachWithAccess = !!interest;
    }
  }

  // Show academic info if: owner, or (coach with access and athlete has shared)
  const showAcademicInfo = isOwner || (isCoachWithAccess && academicInfo?.share_with_coaches);

  // Get video clips (non-archived, non-flagged)
  const { data: videoClips } = await supabase
    .from("athlete_video_clips")
    .select("*")
    .eq("athlete_id", profile.id)
    .eq("is_archived", false)
    .is("flagged_at", null)
    .order("display_order", { ascending: true });

  const clips = videoClips || [];

  const claimHref = `/api/profile/claim?profileId=${encodeURIComponent(
    profile.profile_id || ""
  )}&back=${encodeURIComponent(`/athletes/${profile.profile_id}`)}`;

  const hostHeaders = headers();
  const proto = hostHeaders.get("x-forwarded-proto") ?? "https";
  const host =
    hostHeaders.get("x-forwarded-host") ??
    hostHeaders.get("host") ??
    "certifiedsliders.com";
  const origin = (process.env.NEXT_PUBLIC_SUPABASE_SITE_URL ?? `${proto}://${host}`).replace(/\/+$/, "");
  const profileSlug = profile.profile_id || profileId;
  const profileUrl = `${origin}/athletes/${profileSlug}`;
  const topHighlight = best && best.length > 0 ? best[0] : null;
  const topHighlightMark = topHighlight
    ? fmtTime(
        topHighlight.best_seconds_adj ?? topHighlight.mark_seconds_adj,
        topHighlight.best_mark_text ?? topHighlight.mark
      )
    : null;

  const showInlineStar = !accent && starLabel;

  // Toasts from claim flow (?claimed=ok|already|not_found|fail)
  let toast: { kind: "success" | "error" | "info"; msg: string } | null = null;
  switch (searchParams.claimed) {
    case "ok":
      toast = { kind: "success", msg: "Profile claimed! You can edit in Settings." };
      break;
    case "already":
      toast = { kind: "info", msg: "This profile is already claimed." };
      break;
    case "not_found":
      toast = { kind: "error", msg: "Could not find that profile to claim." };
      break;
    case "fail":
      toast = { kind: "error", msg: "Couldn’t claim profile. Please try again." };
      break;
  }

  return (
    <div className="space-y-12 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <AthleteJsonLd
        name={profile.full_name || profile.username || profileId}
        profileId={profileId}
        classYear={profile.class_year}
        school={profile.school_name}
        schoolState={profile.school_state}
        gender={profile.gender}
        bio={profile.bio}
        profilePicUrl={profile.profile_pic_url}
        starRating={profile.star_rating}
        primaryEvent={topHighlight?.event}
        primaryEventMark={topHighlightMark}
      />
      {toast ? <Toast kind={toast.kind} msg={toast.msg} /> : null}

      <section
        className={`relative overflow-hidden rounded-3xl border ${accent?.borderClass ?? "border-app"} bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#C8102E] px-6 py-10 text-white shadow-2xl sm:px-10 ${accent?.glowClass ?? ""}`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,197,24,0.18),_transparent_55%)]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="relative h-24 w-24 overflow-hidden rounded-3xl border border-white/30 bg-white/10 p-1 shadow-lg">
              {profile.profile_pic_url ? (
                <Image
                  src={profile.profile_pic_url}
                  alt={`${profile.full_name ?? profile.username} avatar`}
                  fill
                  sizes="96px"
                  className="rounded-2xl object-cover"
                />
              ) : (
                <Image src="/favicon-64x64.png" alt="Default avatar" fill sizes="96px" className="rounded-2xl object-contain p-3" />
              )}
            </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
                    Athlete profile
                  </p>
                  <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                    {profile.full_name ?? profile.username}
                  </h1>
                  {accentBadgeLabel ? (
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] ${accent?.badgeContainerClass ?? "bg-white/20 border-white/40"} ${accent?.badgeTextClass ?? "text-white"}`}
                    >
                      {accentBadgeLabel}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.28em] text-white/80">
                  <span>{teamLabel}</span>
                  <span>•</span>
                  <span>{classLabel}</span>
                  <span>•</span>
                  <span>{genderLabel}</span>
                  {showInlineStar ? (
                    <>
                      <span>•</span>
                      <span className="text-base font-bold tracking-wider text-yellow-300">{starLabel}</span>
                    </>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-white/70">
                  <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">
                  {best?.length ?? 0} verified events
                </span>
                {historyHref ? (
                  <SafeLink
                    href={historyHref}
                    className="rounded-full border border-white/30 px-3 py-1 font-semibold text-white hover:border-white hover:bg-white/10"
                  >
                    View detailed history
                  </SafeLink>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-4 lg:max-w-xs">
            <div className="flex flex-wrap gap-2">
              {isOwner ? (
                <a
                  href="/settings"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/30 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white hover:bg-white/10"
                >
                  Edit profile
                </a>
              ) : showClaim ? (
                <a
                  href={claimHref}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[#111827] transition hover:-translate-y-0.5 hover:bg-[#F5C518] hover:text-[#111827]"
                >
                  Claim this profile
                </a>
              ) : null}
            </div>
            {primaryIdentity ? (
              <div className="space-y-2 rounded-2xl border border-white/20 bg-white/10 p-4 text-xs text-white/80 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.35em] text-white/60">Athletic.net</span>
                  <span className="rounded-full bg-[#F5C518]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.4em] text-[#F5C518]">
                    Verified
                  </span>
                </div>
                <SafeLink
                  href={
                    primaryIdentity.numericId
                      ? `https://www.athletic.net/athlete/${primaryIdentity.numericId}/track-and-field/`
                      : primaryIdentity.profileUrl
                  }
                  target="_blank"
                  className="inline-flex h-9 items-center justify-center rounded-full border border-white/40 bg-white/10 px-4 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:border-white hover:bg-white/20"
                >
                  View on Athletic.net
                </SafeLink>
                {secondaryIdentities.length ? (
                  <details className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                    <summary className="cursor-pointer list-none font-semibold text-white/80">
                      Other linked profiles ({secondaryIdentities.length})
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {secondaryIdentities.map((identity) => (
                        <li key={identity.profileUrl}>
                          <a
                            href={identity.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-white"
                          >
                            {identity.profileUrl}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {profile.bio ? (
        <section className="mx-auto max-w-4xl rounded-3xl border border-app bg-card px-6 py-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-app">Bio</h2>
            {isOwner && profile.bio_visibility && (
              <BioVisibilitySelector
                athleteId={profile.id}
                currentVisibility={profile.bio_visibility as "private" | "coaches" | "public"}
              />
            )}
          </div>
          <p className="whitespace-pre-wrap text-sm text-muted leading-relaxed">{profile.bio}</p>
        </section>
      ) : null}

      {/* Academic Info */}
      {(showAcademicInfo && academicInfo && (academicInfo.gpa || academicInfo.sat_score || academicInfo.act_score)) || isOwner ? (
        <section className="mx-auto max-w-4xl rounded-3xl border border-app bg-card px-6 py-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-app">Academic Information</h2>
            {isOwner && (
              <AcademicInfoEditor
                athleteId={profile.id}
                initialData={academicInfo || undefined}
              />
            )}
          </div>
          {academicInfo && (academicInfo.gpa || academicInfo.sat_score || academicInfo.act_score) ? (
            <>
              {isOwner && (
                <div className="text-xs text-muted-foreground">
                  {academicInfo.share_with_coaches ? "Visible to coaches" : "Private"}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {academicInfo.gpa && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">GPA</div>
                    <div className="text-2xl font-bold text-app">{academicInfo.gpa.toFixed(2)}</div>
                  </div>
                )}
                {academicInfo.sat_score && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">SAT</div>
                    <div className="text-2xl font-bold text-app">{academicInfo.sat_score}</div>
                  </div>
                )}
                {academicInfo.act_score && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">ACT</div>
                    <div className="text-2xl font-bold text-app">{academicInfo.act_score}</div>
                  </div>
                )}
              </div>
            </>
          ) : isOwner ? (
            <div className="text-sm text-muted-foreground">No academic info added yet</div>
          ) : null}
        </section>
      ) : null}

      {/* Video Clips */}
      {(clips.length > 0 || isOwner) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">Video Highlights</p>
              <h2 className="text-2xl font-semibold text-app">Competition Videos</h2>
            </div>
            {isOwner && (
              <VideoClipManager
                athleteId={profile.id}
                initialClips={clips}
                maxClips={5}
              />
            )}
          </div>
          {clips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clips.map((clip: any) => (
                <div key={clip.id} className="rounded-3xl border border-app bg-card shadow-sm overflow-hidden">
                  {clip.youtube_id && (
                    <div className="aspect-video bg-muted relative">
                      <img
                        src={`https://img.youtube.com/vi/${clip.youtube_id}/mqdefault.jpg`}
                        alt={clip.title || "Video thumbnail"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    {clip.title && (
                      <h3 className="font-semibold text-app">{clip.title}</h3>
                    )}
                    {clip.event_code && (
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {clip.event_code}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <a
                        href={clip.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-scarlet hover:underline"
                      >
                        Watch on YouTube →
                      </a>
                      {viewer && <FlagButton contentType="video" contentId={clip.id} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isOwner ? (
            <div className="text-sm text-muted-foreground">No video clips added yet</div>
          ) : null}
        </section>
      )}

      {(!best || best.length === 0) ? (
        <section className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">Verified marks</p>
              <h2 className="text-2xl font-semibold text-app">No events yet</h2>
            </div>
          </div>
          <div className="rounded-3xl border border-app bg-muted px-6 py-10 text-sm text-muted shadow-inner">
            No verified marks yet. Once results are approved they&apos;ll appear here.
          </div>
        </section>
      ) : (
        <>
          {/* Featured Events */}
          {featuredEvents.length > 0 && (
            <section className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">Featured Events</p>
                  <h2 className="text-2xl font-semibold text-app">
                    Top {featuredEvents.length} {featuredEvents.length === 1 ? "event" : "events"}
                  </h2>
                </div>
                {historyHref ? (
                  <SafeLink
                    href={historyHref}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-app px-4 text-sm font-semibold text-app transition hover:border-scarlet hover:text-scarlet"
                  >
                    See all results
                  </SafeLink>
                ) : null}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {featuredEvents.map((r: any, i: number) => {
              const mark = fmtTime(
                r.best_seconds_adj ?? r.mark_seconds_adj,
                r.best_mark_text ?? r.mark
              );
              const meetDate = r.meet_date ? new Date(r.meet_date).toLocaleDateString() : "—";
              const wind =
                r.wind != null
                  ? `${Number(r.wind).toFixed(1)} m/s`
                  : r.wind_legal === false
                    ? "NWI / IL"
                    : "—";
              return (
                <EventCard
                  key={`${r.event}-${i}`}
                  event={r.event}
                  mark={mark}
                  season={r.season ?? "Season TBD"}
                  meetDate={meetDate}
                  meetName={r.meet_name ?? "—"}
                  wind={wind}
                  proofUrl={r.proof_url}
                  profileId={profile.profile_id}
                  athleteName={profile.full_name || profile.username || "Athlete"}
                  status={r.status}
                  isOwner={isOwner}
                  resultId={r.id}
                  isAuthenticated={!!viewer}
                  grade={r.grade}
                  classYear={profile.class_year}
                  starRating={profile.star_rating}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Other Events */}
      {otherEvents.length > 0 && (
        <section className="space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">
                {featuredEvents.length > 0 ? "Other Events" : "All Events"}
              </p>
              <h2 className="text-2xl font-semibold text-app">
                {otherEvents.length} {otherEvents.length === 1 ? "event" : "events"}
              </h2>
            </div>
          </div>

          <details className="rounded-3xl border border-app bg-card shadow-sm" open={featuredEvents.length === 0}>
            <summary className="cursor-pointer list-none px-6 py-4 font-semibold text-app hover:bg-muted/30 transition">
              <div className="flex items-center justify-between">
                <span>View {featuredEvents.length > 0 ? "other" : "all"} events</span>
                <span className="text-muted">▼</span>
              </div>
            </summary>
            <div className="border-t border-app p-6">
              <div className="grid gap-5 md:grid-cols-2">
                {otherEvents.map((r: any, i: number) => {
                  const mark = fmtTime(
                    r.best_seconds_adj ?? r.mark_seconds_adj,
                    r.best_mark_text ?? r.mark
                  );
                  const meetDate = r.meet_date ? new Date(r.meet_date).toLocaleDateString() : "—";
                  const wind =
                    r.wind != null
                      ? `${Number(r.wind).toFixed(1)} m/s`
                      : r.wind_legal === false
                        ? "NWI / IL"
                        : "—";
                  return (
                    <EventCard
                      key={`${r.event}-${i}`}
                      event={r.event}
                      mark={mark}
                      season={r.season ?? "Season TBD"}
                      meetDate={meetDate}
                      meetName={r.meet_name ?? "—"}
                      wind={wind}
                      proofUrl={r.proof_url}
                      profileId={profile.profile_id}
                      athleteName={profile.full_name || profile.username || "Athlete"}
                      status={r.status}
                      isOwner={isOwner}
                      resultId={r.id}
                      isAuthenticated={!!viewer}
                      grade={r.grade}
                      classYear={profile.class_year}
                      starRating={profile.star_rating}
                    />
                  );
                })}
              </div>
            </div>
          </details>
        </section>
      )}
    </>
  )}

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">Colleges of interest</p>
            <h2 className="text-2xl font-semibold text-app">
              Where {profile.full_name ?? profile.username} is looking next
            </h2>
            <p className="text-sm text-muted">
              Updated directly by the athlete to help college coaches connect.
            </p>
          </div>
        </div>

        {collegeInterests.length ? (
          <ul className="flex flex-wrap gap-3">
            {collegeInterests.map((item) => (
              <li
                key={`${item.name}-${item.createdAt}`}
                className="rounded-full border border-app bg-card px-4 py-2 text-sm font-semibold text-app shadow-sm"
              >
                {item.name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-3xl border border-dashed border-app/60 bg-muted/40 px-4 py-4 text-sm text-muted">
            This athlete hasn&apos;t shared any colleges yet.
          </p>
        )}
      </section>

      {/* Contact Info Management - Owner Only */}
      {isOwner && (
        <section className="mx-auto max-w-4xl space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">Contact Information</p>
            <h2 className="text-2xl font-semibold text-app">Manage Contact Sharing</h2>
            <p className="text-sm text-muted">
              Control what contact information you share with coaches from programs you&apos;re interested in.
            </p>
          </div>
          <div className="rounded-3xl border border-app bg-card px-6 py-6 shadow-sm">
            <ContactInfoManager
              athleteId={profile.id}
              initialData={{
                email: profile.email,
                phone: profile.phone,
                share_contact_info: profile.share_contact_info ?? false,
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
