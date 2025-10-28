// src/app/(protected)/me/page.tsx
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabase/compat";
import CollegeInterestsSection from "./college-interests/CollegeInterestsSection";
import type { CollegeInterest } from "./college-interests/CollegeInterestsSection";
import LinkedProfilesSection from "./linked-profiles/LinkedProfilesSection";
import type { LinkedIdentity } from "./linked-profiles/LinkedProfilesSection";

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
  status: "pending" | "verified" | "rejected";
  proof_url: string | null;
  reject_reason?: string | null;
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
      "id, username, full_name, profile_pic_url, school_name, school_state, class_year"
    )
    .eq("id", user.id)
    .maybeSingle();

  const { data: collegeInterestsData } = await supabase
    .from("athlete_college_interests")
    .select("id, college_name, created_at")
    .eq("athlete_id", user.id)
    .order("created_at", { ascending: true });

  // my results
  const { data: resultsData } = await supabase
    .from("results")
    .select(
      "id, event, mark, mark_seconds, season, meet_name, meet_date, status, proof_url, reject_reason"
    )
    .eq("athlete_id", user.id)
    .order("meet_date", { ascending: false, nullsFirst: true })
    .order("id", { ascending: false });

  const rows: Row[] = resultsData ?? [];
  const pending = rows.filter(r => r.status === "pending");
  const verified = rows.filter(r => r.status === "verified");
  const rejected = rows.filter(r => r.status === "rejected");

  const collegeInterests: CollegeInterest[] =
    (collegeInterestsData ?? []).map((row) => ({
      id: row.id,
      collegeName: row.college_name,
      createdAt: row.created_at,
    })) ?? [];

  const linkedIdentities: LinkedIdentity[] = (identitiesData ?? []).map((row) => ({
    id: row.id,
    provider: row.provider,
    externalId: row.external_id,
    profileUrl: row.profile_url,
    status: row.status,
    verified: row.verified,
    verifiedAt: row.verified_at,
    isPrimary: row.is_primary,
    nonce: row.nonce,
    attempts: row.attempts,
    lastCheckedAt: row.last_checked_at,
    errorText: row.error_text,
  }));

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-full bg-gray-100">
            {profile?.profile_pic_url ? (
              <Image src={profile.profile_pic_url} alt="" fill sizes="48px" className="object-cover" />
            ) : (
              <div className="grid h-12 w-12 place-items-center">🙂</div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold">
              {profile?.full_name || user.email || "Me"}
            </h1>
            <p className="text-xs text-gray-500">
              {profile?.school_name
                ? `${profile.school_name}${profile.school_state ? `, ${profile.school_state}` : ""}`
                : "—"}
              {" • "}
              {profile?.class_year ?? "—"}
              {profile?.username ? (
                <>
                  {" • "}
                  <Link className="underline" href={`/athletes/${profile.username}`}>
                    Public profile
                  </Link>
                </>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/submit-result"
            className="rounded-md border px-3 py-2 text-sm bg-black text-white hover:opacity-90"
          >
            Submit a result
          </a>
          <a
            href="/settings"
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Edit profile
          </a>
        </div>
      </div>

      <LinkedProfilesSection identities={linkedIdentities} />

      <CollegeInterestsSection interests={collegeInterests} />

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
                  {r.reject_reason ? (
                    <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-800">
                      {r.reject_reason}
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
  const { data: identitiesData } = await supabase
    .from("external_identities")
    .select(
      "id, provider, external_id, profile_url, status, verified, verified_at, is_primary, nonce, attempts, last_checked_at, error_text"
    )
    .eq("user_id", user.id)
    .eq("provider", "athleticnet")
    .order("is_primary", { ascending: false })
    .order("verified", { ascending: false })
    .order("verified_at", { ascending: false, nullsLast: true });
