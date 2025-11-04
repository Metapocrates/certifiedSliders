// src/app/(public)/athletes/[username]/page.tsx
import { headers } from "next/headers";
import Image from "next/image";
import SafeLink from "@/components/SafeLink";
import AthleteShareActions from "@/components/athletes/AthleteShareActions";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getStarTierAccent } from "@/lib/star-theme";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: { username: string };
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
  const { username } = params;
  const supabase = createSupabaseServer();

  // Who's viewing?
  const { data: authData } = await supabase.auth.getUser();
  const viewer = authData?.user ?? null;

  // Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, username, school_name, school_state, class_year, profile_pic_url, bio, gender, claimed_by, star_rating"
    )
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-2">Athlete</h1>
        <p className="text-red-700">Athlete not found.</p>
      </div>
    );
  }

  // Best marks (mv or fallback)
  let best: Array<any> | null = null;
  try {
    const { data } = await supabase
      .from("mv_best_event")
      .select(
        "event, best_seconds_adj, best_mark_text, wind_legal, wind, meet_name, meet_date, proof_url, season"
      )
      .eq("athlete_id", profile.id)
      .order("best_seconds_adj", { ascending: true, nullsFirst: false })
      .limit(100);
    best = data ?? null;
  } catch {
    best = null;
  }

  if (!best) {
    const { data: results } = await supabase
      .from("results")
      .select("event, mark, mark_seconds_adj, wind, meet_name, meet_date, proof_url, season")
      .eq("athlete_id", profile.id)
      .eq("status", "verified")
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

  const historyHref = profile.username ? `/athletes/${profile.username}/history` : undefined;
  const teamLabel = profile.school_name
    ? `${profile.school_name}${profile.school_state ? `, ${profile.school_state}` : ""}`
    : "Unlisted program";
  const classLabel = profile.class_year ? `Class of ${profile.class_year}` : "Class year TBD";
  const genderLabel = profile.gender === "M" ? "Boys" : profile.gender === "F" ? "Girls" : "—";
  const starLabel =
    typeof profile.star_rating === "number" && profile.star_rating >= 3
      ? `${profile.star_rating}★ Certified`
      : typeof profile.star_rating === "number"
        ? `${profile.star_rating}★`
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
    .select("profile_url, external_id, is_primary, verified")
    .eq("user_id", profile.id)
    .eq("provider", "athleticnet")
    .eq("verified", true)
    .order("is_primary", { ascending: false })
    .order("verified_at", { ascending: false });

  const verifiedIdentities = (linkedIdentitiesData ?? []).map((row) => ({
    profileUrl: row.profile_url as string,
    externalId: row.external_id as string,
    isPrimary: row.is_primary as boolean,
  }));

  const primaryIdentity = verifiedIdentities.find((row) => row.isPrimary) ?? verifiedIdentities[0];
  const secondaryIdentities = verifiedIdentities.filter((row) => row !== primaryIdentity);

  // Ownership + CTAs
  const isOwner = !!viewer && (viewer.id === profile.id || viewer.id === profile.claimed_by);
  const showClaim = !!viewer && !isOwner && profile.claimed_by == null;
  const claimHref = `/api/profile/claim?username=${encodeURIComponent(
    profile.username || ""
  )}&back=${encodeURIComponent(`/athletes/${profile.username}`)}`;

  const hostHeaders = headers();
  const proto = hostHeaders.get("x-forwarded-proto") ?? "https";
  const host =
    hostHeaders.get("x-forwarded-host") ??
    hostHeaders.get("host") ??
    "certifiedsliders.com";
  const origin = (process.env.NEXT_PUBLIC_SUPABASE_SITE_URL ?? `${proto}://${host}`).replace(/\/+$/, "");
  const profileSlug = profile.username ?? username;
  const profileUrl = `${origin}/athletes/${profileSlug}`;
  const topHighlight = best && best.length > 0 ? best[0] : null;
  const topHighlightMark = topHighlight
    ? fmtTime(
        topHighlight.best_seconds_adj ?? topHighlight.mark_seconds_adj,
        topHighlight.best_mark_text ?? topHighlight.mark
      )
    : null;

  const cardUrlObj = new URL(`${origin}/athletes/${profileSlug}/opengraph-image`);
  if (profile.full_name) cardUrlObj.searchParams.set("name", profile.full_name);
  else if (profile.username) cardUrlObj.searchParams.set("name", profile.username);
  if (accent?.tier) cardUrlObj.searchParams.set("tier", String(accent.tier));
  if (typeof profile.star_rating === "number") {
    cardUrlObj.searchParams.set("stars", String(profile.star_rating));
  }
  if (profile.school_name) cardUrlObj.searchParams.set("team", profile.school_name);
  if (profile.school_state) cardUrlObj.searchParams.set("state", profile.school_state);
  if (profile.class_year) cardUrlObj.searchParams.set("classYear", String(profile.class_year));
  if (topHighlight?.event) cardUrlObj.searchParams.set("event", topHighlight.event);
  if (topHighlightMark) cardUrlObj.searchParams.set("mark", topHighlightMark);
  const cardUrl = cardUrlObj.toString();
  const shareText = starLabel
    ? `${profile.full_name ?? profile.username ?? "This athlete"} is ${starLabel} on Certified Sliders.`
    : `${profile.full_name ?? profile.username ?? "This athlete"} is verified on Certified Sliders.`;
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
                      <span>{starLabel}</span>
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
            {isOwner ? (
              <AthleteShareActions
                profileUrl={profileUrl}
                cardUrl={cardUrl}
                shareText={shareText}
                accent={accent}
              />
            ) : null}
            {primaryIdentity ? (
              <div className="space-y-2 rounded-2xl border border-white/20 bg-white/10 p-4 text-xs text-white/80 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.35em] text-white/60">Athletic.net</span>
                  <span className="rounded-full bg-[#F5C518]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.4em] text-[#F5C518]">
                    Verified
                  </span>
                </div>
                <SafeLink
                  href={primaryIdentity.profileUrl}
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
        <section className="mx-auto max-w-4xl rounded-3xl border border-app bg-card px-6 py-6 shadow-sm">
          <h2 className="text-lg font-semibold text-app">Bio</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-muted leading-relaxed">{profile.bio}</p>
        </section>
      ) : null}

      <section className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">Verified marks</p>
            <h2 className="text-2xl font-semibold text-app">
              Highlights across {best?.length ?? 0} events
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

        {(!best || best.length === 0) ? (
          <div className="rounded-3xl border border-app bg-muted px-6 py-10 text-sm text-muted shadow-inner">
            No verified marks yet. Once results are approved they’ll appear here.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {best.map((r: any, i: number) => {
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
                <div
                  key={`${r.event}-${i}`}
                  className="group relative overflow-hidden rounded-3xl border border-app bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted">
                    <span>{r.season ?? "Season TBD"}</span>
                    <span>{meetDate}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-app">{r.event}</h3>
                  <p className="mt-1 text-sm text-muted">Best mark</p>
                  <p className="text-2xl font-semibold text-app">{mark}</p>
                  <div className="mt-4 space-y-1 text-sm text-muted">
                    <p>
                      <span className="font-medium text-app">Meet:</span> {r.meet_name ?? "—"}
                    </p>
                    <p>
                      <span className="font-medium text-app">Wind:</span> {wind}
                    </p>
                  </div>
                  {r.proof_url ? (
                    <SafeLink
                      href={r.proof_url}
                      target="_blank"
                      className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-scarlet transition hover:text-scarlet/80"
                    >
                      View proof →
                    </SafeLink>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

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
    </div>
  );
}
