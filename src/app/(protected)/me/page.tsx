// src/app/(protected)/me/page.tsx
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Badge({ status }: { status: string | null }) {
  const cls =
    status === "verified"
      ? "bg-green-100 text-green-800"
      : status === "pending"
      ? "bg-yellow-100 text-yellow-800"
      : status === "rejected"
      ? "bg-red-100 text-red-800"
      : "bg-gray-100 text-gray-800";
  const text = status ? status[0]?.toUpperCase() + status.slice(1) : "Unknown";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${cls}`}>{text}</span>;
}

export default async function MePage() {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-2">My Page</h1>
        <p className="mb-4">You need to sign in.</p>
        <Link href="/login" className="btn">Sign in</Link>
      </div>
    );
  }

  const supabase = createSupabaseServer();

  // Profile header
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, school_name, school_state, class_year, profile_pic_url")
    .eq("id", user.id)
    .maybeSingle();

  // Recent submissions (latest first)
  const { data: results } = await supabase
    .from("results")
    .select("id, event, mark, mark_seconds_adj, timing, wind, season, status, proof_url, meet_name, meet_date, created_at")
    .eq("athlete_id", user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {profile?.profile_pic_url ? (
              <img src={profile.profile_pic_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center">🙂</div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold">
              {profile?.full_name || profile?.username || "My Page"}
            </h1>
            <p className="text-sm text-gray-500">
              {profile?.school_name ? `${profile.school_name}${profile?.school_state ? `, ${profile.school_state}` : ""}` : "—"} •{" "}
              {profile?.class_year ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/submit-result" className="btn">Submit Result</Link>
          <Link href="/athletes/me" className="rounded-md border px-3 py-2 text-sm">View Public Profile</Link>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="rounded-xl border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-medium">Recent Submissions</h2>
          <span className="text-sm text-gray-500">{results?.length ?? 0} shown</span>
        </div>

        {(!results || results.length === 0) ? (
          <div className="p-4 text-sm text-gray-600">
            No submissions yet. Paste a meet/result link to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Mark</th>
                  <th className="px-3 py-2">Timing</th>
                  <th className="px-3 py-2">Wind</th>
                  <th className="px-3 py-2">Season</th>
                  <th className="px-3 py-2">Meet / Date</th>
                  <th className="px-3 py-2">Proof</th>
                  <th className="px-3 py-2">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {results!.map((r) => {
                  const meetDate = r.meet_date ? new Date(r.meet_date).toISOString().slice(0,10) : "—";
                  const created = r.created_at ? new Date(r.created_at).toLocaleString() : "—";
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2"><Badge status={r.status} /></td>
                      <td className="px-3 py-2">{r.event}</td>
                      <td className="px-3 py-2">{r.mark}</td>
                      <td className="px-3 py-2">{r.timing ?? "—"}</td>
                      <td className="px-3 py-2">{r.wind ?? "—"}</td>
                      <td className="px-3 py-2">{r.season ?? "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span>{r.meet_name ?? "—"}</span>
                          <span className="text-xs text-gray-500">{meetDate}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {r.proof_url ? (
                          <Link href={r.proof_url} target="_blank" className="text-blue-600 underline">View</Link>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2">{created}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
