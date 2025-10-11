// src/app/(public)/athletes/[username]/page.tsx
import { createSupabaseServer } from "@/lib/supabase/compat";
import SafeLink from "@/components/SafeLink";
import Image from "next/image";

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
  const cls =
    kind === "success"
      ? "border-green-300 bg-green-50 text-green-800"
      : kind === "error"
        ? "border-red-300 bg-red-50 text-red-800"
        : "border-blue-300 bg-blue-50 text-blue-800";
  return <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${cls}`}>{msg}</div>;
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
      "id, full_name, username, school_name, school_state, class_year, profile_pic_url, bio, gender, claimed_by"
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

  // Ownership + CTAs
  const isOwner = !!viewer && (viewer.id === profile.id || viewer.id === profile.claimed_by);
  const showClaim = !!viewer && !isOwner && profile.claimed_by == null;
  const claimHref = `/api/profile/claim?username=${encodeURIComponent(
    profile.username || ""
  )}&back=${encodeURIComponent(`/athletes/${profile.username}`)}`;

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
    <div className="container py-8">
      {toast ? <Toast kind={toast.kind} msg={toast.msg} /> : null}

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 overflow-hidden rounded-full bg-gray-100">
            {profile.profile_pic_url ? (
              <div className="relative h-14 w-14 overflow-hidden rounded-full bg-gray-100">
                <Image
                  src={profile.profile_pic_url}
                  alt="Avatar"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-full bg-gray-100">🙂</div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{profile.full_name ?? profile.username}</h1>
            <p className="text-sm text-gray-500">
              {profile.school_name
                ? `${profile.school_name}${profile.school_state ? `, ${profile.school_state}` : ""}`
                : "—"}
              {" • "}
              {profile.class_year ?? "—"}
              {" • "}
              {profile.gender === "M" ? "Boys" : profile.gender === "F" ? "Girls" : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SafeLink
            href={historyHref}
            className="rounded-md border px-3 py-2 text-sm hover:opacity-90"
            fallback={<span />}
          >
            View History
          </SafeLink>

          {isOwner ? (
            <a
              href="/settings"
              className="rounded-md border px-3 py-2 text-sm hover:opacity-90 bg-black text-white"
              title="Edit your profile"
            >
              Edit Profile
            </a>
          ) : showClaim ? (
            <a
              href={claimHref}
              className="rounded-md border px-3 py-2 text-sm hover:opacity-90 bg-black text-white"
              title="Claim this profile"
            >
              Claim this profile
            </a>
          ) : null}
        </div>
      </div>

      {profile.bio ? (
        <div className="mb-6 rounded-xl border p-4 text-sm text-gray-800 whitespace-pre-wrap">
          {profile.bio}
        </div>
      ) : null}

      <div className="rounded-xl border overflow-x-auto">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-medium">Best Marks</h2>
          <span className="text-sm text-gray-500">{best?.length ?? 0} events</span>
        </div>
        {(!best || best.length === 0) ? (
          <div className="p-4 text-sm text-gray-600">No verified marks yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Mark</th>
                <th className="px-3 py-2">Wind</th>
                <th className="px-3 py-2">Season</th>
                <th className="px-3 py-2">Meet</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Proof</th>
              </tr>
            </thead>
            <tbody>
              {best!.map((r: any, i: number) => {
                const mark = fmtTime(
                  r.best_seconds_adj ?? r.mark_seconds_adj,
                  r.best_mark_text ?? r.mark
                );
                const meetDate = r.meet_date
                  ? new Date(r.meet_date).toISOString().slice(0, 10)
                  : "—";
                const wind = r.wind ?? (r.wind_legal === false ? "NWI/IL" : "—");
                return (
                  <tr key={`${r.event}-${i}`} className="border-t">
                    <td className="px-3 py-2">{r.event}</td>
                    <td className="px-3 py-2 font-medium">{mark}</td>
                    <td className="px-3 py-2">{wind}</td>
                    <td className="px-3 py-2">{r.season ?? "—"}</td>
                    <td className="px-3 py-2">{r.meet_name ?? "—"}</td>
                    <td className="px-3 py-2">{meetDate}</td>
                    <td className="px-3 py-2">
                      <SafeLink href={r.proof_url} className="text-blue-600 underline" target="_blank">
                        View
                      </SafeLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}