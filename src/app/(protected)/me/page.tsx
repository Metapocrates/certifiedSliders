// src/app/(protected)/me/page.tsx
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getAppBaseUrl } from "@/lib/env";
import { makeClaimToken } from "@/lib/verification/claimToken";
import CollegeInterestsSection from "./college-interests/CollegeInterestsSection";
import type { CollegeInterest } from "./college-interests/CollegeInterestsSection";
import LinkedProfilesSection from "./linked-profiles/LinkedProfilesSection";
import type { LinkedIdentity } from "./linked-profiles/LinkedProfilesSection";
import MyVideos from "@/components/videos/MyVideos";
import ParentInvitations from "@/components/athlete/ParentInvitations";
import ProfileBorder from "@/components/athlete/ProfileBorder";
import { getStarDisplay } from "@/lib/profileBorder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  id: number;
  event: string | null;
  mark: string | null;
  mark_seconds: number | null;
  season: string | null;
  meet_name: string | null;
  meet_date: string | null;
  status: "pending" | "verified" | "rejected" | "manual_review" | "approved" | "invalid";
  proof_url: string | null;
  rejection_reason?: string | null;
};

function fmtTime(sec: number | null | undefined, text?: string | null) {
  if (text) return text;
  if (sec == null) return "—";
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return mm > 0 ? `${mm}:${ss.toFixed(2).padStart(5, "0")}` : ss.toFixed(2);
}

export default async function MePage() {
  const supabase = createSupabaseServer();

  // who am I
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-semibold mb-4">My Results</h1>
        <p className="mb-4 text-sm text-gray-600">You need to sign in to view your results.</p>
        <a
          href="/login?next=/me"
          className="inline-flex items-center rounded-md border px-3 py-2 text-sm bg-black text-white"
        >
          Sign in
        </a>
      </div>
    );
  }

  // my profile (for header)
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, profile_pic_url, school_name, school_state, class_year, profile_id, user_type, star_rating"
    )
    .eq("id", user.id)
    .maybeSingle();

  // Redirect non-athletes to their portals IMMEDIATELY before any other data fetching
  if (profile?.user_type && profile.user_type !== 'athlete') {
    const redirectMap: Record<string, string> = {
      parent: '/parent/dashboard',
      ncaa_coach: '/coach/portal',
      hs_coach: '/hs/portal'
    };
    const redirectTo = redirectMap[profile.user_type];
    if (redirectTo) {
      redirect(redirectTo);
    }
  }

  // From this point on, we know user_type is 'athlete' or null

  // Check if user is admin
  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const isAdmin = !!adminRow?.user_id;

  const { data: collegeInterestsData } = await supabase
    .from("athlete_college_interests")
    .select("id, college_name, created_at")
    .eq("athlete_id", user.id)
    .order("created_at", { ascending: true });

  // my results
  const { data: resultsData } = await supabase
    .from("results")
    .select(
      "id, event, mark, mark_seconds, season, meet_name, meet_date, status, proof_url, rejection_reason"
    )
    .eq("athlete_id", user.id)
    .order("meet_date", { ascending: false, nullsFirst: true })
    .order("id", { ascending: false });

  const rows: Row[] = resultsData ?? [];
  const pending = rows.filter(r => r.status === "pending" || r.status === "manual_review");
  const verified = rows.filter(r => r.status === "verified" || r.status === "approved");
  const rejected = rows.filter(r => r.status === "rejected" || r.status === "invalid");

  const collegeInterests: CollegeInterest[] =
    (collegeInterestsData ?? []).map((row) => ({
      id: row.id,
      collegeName: row.college_name,
      createdAt: row.created_at,
    })) ?? [];

  const { data: identitiesData } = await supabase
    .from("external_identities")
    .select(
      "id, provider, external_id, external_numeric_id, profile_url, status, verified, verified_at, is_primary, nonce, attempts, last_checked_at, error_text"
    )
    .eq("user_id", user.id)
    .eq("provider", "athleticnet")
    .order("is_primary", { ascending: false })
    .order("verified", { ascending: false })
    .order("verified_at", { ascending: false });

  // Fetch pending parent link invitations
  const { data: parentInvitationsData } = await supabase
    .from("parent_links")
    .select(`
      id,
      parent_user_id,
      status,
      note,
      created_at,
      parent:profiles!parent_user_id (
        full_name
      )
    `)
    .eq("athlete_id", profile?.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // Map invitations to serializable format for client component
  const parentInvitations = JSON.parse(JSON.stringify(
    (parentInvitationsData ?? []).map((inv: any) => ({
      id: inv.id,
      parent_user_id: inv.parent_user_id,
      status: inv.status,
      note: inv.note,
      created_at: inv.created_at,
      parent: inv.parent ? {
        full_name: inv.parent.full_name
      } : null
    }))
  ));

type IdentityRow = {
  id: string;
  provider: string;
  external_id: string;
  external_numeric_id: string | null;
  profile_url: string;
  status: LinkedIdentity["status"];
  verified: boolean;
  verified_at: string | null;
  is_primary: boolean;
  nonce: string | null;
  attempts: number | null;
  last_checked_at: string | null;
  error_text: string | null;
};

  const appBaseUrl = getAppBaseUrl();
  const linkedIdentities: LinkedIdentity[] = await Promise.all(
    ((identitiesData ?? []) as IdentityRow[]).map(async (row) => {
      let claimUrl: string | null = null;
      if (row.nonce) {
        try {
          const token = await makeClaimToken({
            row_id: row.id,
            user_id: user.id,
            provider: "athleticnet",
            external_id: row.external_id,
            external_numeric_id: row.external_numeric_id,
            nonce: row.nonce,
          });
          claimUrl = `${appBaseUrl}/claim/${encodeURIComponent(token)}`;
        } catch {
          claimUrl = null;
        }
      }

      return {
        id: row.id,
        provider: row.provider,
        externalId: row.external_id,
        profileUrl: row.profile_url,
        numericId: row.external_numeric_id,
        claimUrl,
        status: row.status as LinkedIdentity["status"],
        verified: Boolean(row.verified),
        verifiedAt: row.verified_at,
        isPrimary: Boolean(row.is_primary),
        nonce: row.nonce,
        attempts: row.attempts ?? 0,
        lastCheckedAt: row.last_checked_at,
        errorText: row.error_text,
      };
    })
  );


  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-app">My Dashboard</h1>
            <p className="mt-1 text-sm text-muted">
              Manage your results, linked profiles, and college interests
            </p>
          </div>
          <a
            href="/submit-result"
            className="rounded-lg border border-app px-4 py-2 text-sm font-semibold bg-scarlet text-white hover:bg-scarlet/90 transition"
          >
            Submit a result
          </a>
        </div>
      </div>

      <ProfileBorder starRating={profile?.star_rating} showBadge className="mb-8">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gray-100">
            {profile?.profile_pic_url ? (
              <Image src={profile.profile_pic_url} alt="" fill sizes="64px" className="object-cover" />
            ) : (
              <Image src="/favicon-64x64.png" alt="" fill sizes="64px" className="object-contain p-2" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-app">
                {profile?.full_name || user.email || "Athlete"}
              </h2>
              {profile?.star_rating != null && profile.star_rating > 0 && (
                <span className="text-base">
                  {getStarDisplay(profile.star_rating).emoji}
                </span>
              )}
              {profile?.profile_id && (
                <span className="rounded-md bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-mono text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
                  {profile.profile_id}
                </span>
              )}
              {profile?.user_type && profile.user_type !== 'athlete' && (
                <span className="rounded-md bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700">
                  {profile.user_type === 'ncaa_coach' && '🎓 College Coach'}
                  {profile.user_type === 'parent' && '👨‍👩‍👧‍👦 Parent'}
                  {profile.user_type === 'hs_coach' && '📋 HS Coach'}
                </span>
              )}
            </div>
            <p className="text-sm text-muted">
              {profile?.school_name
                ? `${profile.school_name}${profile.school_state ? `, ${profile.school_state}` : ""}`
                : "No school set"}
              {" • "}
              {profile?.class_year ? `Class of ${profile.class_year}` : "No class year"}
            </p>
            {profile?.profile_id && (
              <p className="mt-1 text-xs text-muted">
                Public page:{" "}
                <Link
                  className="font-medium text-scarlet hover:underline"
                  href={`/athletes/${profile.profile_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  /athletes/{profile.profile_id} →
                </Link>
              </p>
            )}
          </div>
        </div>
      </ProfileBorder>

      {parentInvitations.length > 0 && (
        <div className="mb-8">
          <ParentInvitations invitations={parentInvitations} />
        </div>
      )}

      <LinkedProfilesSection identities={linkedIdentities} />

      <CollegeInterestsSection interests={collegeInterests} />

      <MyVideos isAdmin={isAdmin} />

      {/* Pending */}
      <Section title={`Pending (${pending.length})`}>
        <ResultsTable rows={pending} emptyText="No pending results." />
      </Section>

      {/* Verified */}
      <Section title={`Verified (${verified.length})`} className="mt-6">
        <ResultsTable rows={verified} emptyText="No verified results yet." />
      </Section>

      {/* Rejected */}
      <Section title={`Rejected (${rejected.length})`} className="mt-6">
        <ResultsTable rows={rejected} emptyText="No rejected results." showRejectReason />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
      </div>
      <div className="overflow-x-auto rounded-xl border">{children}</div>
    </section>
  );
}

function ResultsTable({
  rows,
  emptyText,
  showRejectReason = false,
}: {
  rows: Row[];
  emptyText: string;
  showRejectReason?: boolean;
}) {
  if (rows.length === 0) {
    return <div className="p-4 text-sm text-gray-600">{emptyText}</div>;
  }

  return (
    <table className="min-w-full text-sm">
      <thead className="bg-gray-50">
        <tr className="text-left">
          <th className="px-3 py-2">Event</th>
          <th className="px-3 py-2">Mark</th>
          <th className="px-3 py-2">Season</th>
          <th className="px-3 py-2">Meet</th>
          <th className="px-3 py-2">Date</th>
          <th className="px-3 py-2">Proof</th>
          {showRejectReason ? <th className="px-3 py-2">Reason</th> : null}
          <th className="px-3 py-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const dateStr = r.meet_date ? new Date(r.meet_date).toISOString().slice(0, 10) : "—";
          return (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2">{r.event ?? "—"}</td>
              <td className="px-3 py-2 font-medium">{fmtTime(r.mark_seconds, r.mark)}</td>
              <td className="px-3 py-2">{r.season ?? "—"}</td>
              <td className="px-3 py-2">{r.meet_name ?? "—"}</td>
              <td className="px-3 py-2">{dateStr}</td>
              <td className="px-3 py-2">
                {r.proof_url ? (
                  <a
                    href={r.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    View
                  </a>
                ) : (
                  "—"
                )}
              </td>
              {showRejectReason ? (
                <td className="px-3 py-2">
                  {r.rejection_reason ? (
                    <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-800">
                      {r.rejection_reason}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              ) : null}
              <td className="px-3 py-2">
                {r.status === "verified" ? (
                  <span className="inline-flex items-center rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] text-green-800">
                    Verified
                  </span>
                ) : r.status === "pending" ? (
                  <span className="inline-flex items-center rounded-md border border-yellow-200 bg-yellow-50 px-2 py-0.5 text-[11px] text-yellow-800">
                    Pending
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-800">
                    Rejected
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
