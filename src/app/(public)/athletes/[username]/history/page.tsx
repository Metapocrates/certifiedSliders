// src/app/(public)/athletes/[username]/history/page.tsx
import { createSupabaseServer } from "@/lib/supabase/compat";
import SafeLink from "@/components/SafeLink";
import Image from "next/image";


export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: { username: string } };

export default async function AthleteHistoryPage({ params }: Params) {
  const { username } = params;
  const supabase = createSupabaseServer();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, username, school_name, school_state, class_year, profile_pic_url, gender")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-2">Athlete History</h1>
        <p className="text-red-700">Athlete not found.</p>
      </div>
    );
  }

  const { data: results } = await supabase
    .from("results")
    .select("id, event, mark, mark_seconds_adj, timing, wind, season, meet_name, meet_date, proof_url, created_at")
    .eq("athlete_id", profile.id)
    .eq("status", "verified")
    .order("meet_date", { ascending: true })
    .limit(500);

  const byEvent = new Map<string, any[]>();
  for (const r of results ?? []) {
    const arr = byEvent.get(r.event) ?? [];
    arr.push(r);
    byEvent.set(r.event, arr);
  }
  const eventNames = Array.from(byEvent.keys()).sort();

  function dateStr(d?: string | null) {
    return d ? new Date(d).toISOString().slice(0,10) : "—";
  }
  function markStr(r: any) {
    if (r.mark) return r.mark;
    if (r.mark_seconds_adj != null) {
      const sec = r.mark_seconds_adj as number;
      const mm = Math.floor(sec / 60);
      const ss = sec % 60;
      return mm > 0 ? `${mm}:${ss.toFixed(2).padStart(5,"0")}` : ss.toFixed(2);
    }
    return "—";
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {profile.profile_pic_url ? (
  <div className="relative h-12 w-12 overflow-hidden rounded-full bg-gray-100">
    <Image
      src={profile.profile_pic_url}
      alt="Avatar"
      fill
      sizes="48px"
      className="object-cover"
    />
  </div>
) : (
  <div className="h-12 w-12 rounded-full bg-gray-100 grid place-items-center">🙂</div>
)}

          </div>
          <div>
            <h1 className="text-xl font-semibold">
              {profile.full_name ?? profile.username}
            </h1>
            <p className="text-sm text-gray-500">
              {profile.school_name ? `${profile.school_name}${profile.school_state ? `, ${profile.school_state}` : ""}` : "—"} •{" "}
              {profile.class_year ?? "—"} • {profile.gender === "M" ? "Boys" : profile.gender === "F" ? "Girls" : "—"}
            </p>
          </div>
        </div>
        <SafeLink
          href={profile.username ? `/athletes/${profile.username}` : undefined}
          className="rounded-md border px-3 py-2 text-sm"
        >
          View Profile
        </SafeLink>
      </div>

      {(results?.length ?? 0) === 0 ? (
        <div className="rounded-lg border p-6 text-sm text-gray-600">
          No verified results yet.
        </div>
      ) : (
        <div className="space-y-8">
          {eventNames.map((ev) => {
            const rows = byEvent.get(ev)!;
            return (
              <section key={ev} className="rounded-xl border">
                <header className="flex items-center justify-between border-b px-4 py-3">
                  <h2 className="text-lg font-medium">{ev}</h2>
                  <span className="text-xs text-gray-500">{rows.length} marks</span>
                </header>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left">
                        <th className="px-3 py-2">Mark</th>
                        <th className="px-3 py-2">Timing</th>
                        <th className="px-3 py-2">Wind</th>
                        <th className="px-3 py-2">Season</th>
                        <th className="px-3 py-2">Meet</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Proof</th>
                        <th className="px-3 py-2">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.id ?? i} className="border-t">
                          <td className="px-3 py-2 font-medium">{markStr(r)}</td>
                          <td className="px-3 py-2">{r.timing ?? "—"}</td>
                          <td className="px-3 py-2">{r.wind ?? "—"}</td>
                          <td className="px-3 py-2">{r.season ?? "—"}</td>
                          <td className="px-3 py-2">{r.meet_name ?? "—"}</td>
                          <td className="px-3 py-2">{dateStr(r.meet_date)}</td>
                          <td className="px-3 py-2">
                            <SafeLink href={r.proof_url} className="text-blue-600 underline" target="_blank">
                              View
                            </SafeLink>
                          </td>
                          <td className="px-3 py-2">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
