// src/app/athletes/[username]/history/page.tsx
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type HistoryRow = {
  id: string;
  athlete_id: string;
  old_rating: number | null;
  new_rating: number;
  updated_by: string;
  updated_at: string;
  note: string | null;
};

type Updater = {
  id: string;
  username: string | null;
  full_name: string | null;
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function AthleteRatingsHistoryPage({
  params,
}: {
  params: { username: string };
}) {
  const supabase = createSupabaseServer();
  const username = params.username;

  // 1) Load athlete by username
  const { data: athlete, error: athleteErr } = await supabase
    .from("profiles")
    .select("id, username, full_name, star_rating")
    .eq("username", username)
    .single();

  if (athleteErr || !athlete) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <h1 className="text-2xl font-semibold mb-4">Ratings History</h1>
        <div className="rounded-lg border bg-red-50 border-red-300 text-red-800 p-4">
          {athleteErr?.message || "Athlete not found."}
        </div>
        <div className="mt-4">
          <Link href="/rankings" className="underline">
            Back to Rankings
          </Link>
        </div>
      </div>
    );
  }

  // 2) Load rating history for this athlete
  const { data: history, error: histErr } = await supabase
    .from("rating_history")
    .select("id, athlete_id, old_rating, new_rating, updated_by, updated_at, note")
    .eq("athlete_id", athlete.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (histErr) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <h1 className="text-2xl font-semibold mb-2">Ratings History</h1>
        <p className="text-gray-600 mb-4">
          {athlete.full_name ?? athlete.username}
        </p>
        <div className="rounded-lg border bg-red-50 border-red-300 text-red-800 p-4">
          {histErr.message}
        </div>
        <div className="mt-4">
          <Link href={`/athletes/${athlete.username}`} className="underline">
            Back to Athlete
          </Link>
        </div>
      </div>
    );
  }

  const rows = (history ?? []) as HistoryRow[];

  // 3) Resolve updater display names
  const updaterIds = Array.from(new Set(rows.map((r) => r.updated_by))).filter(Boolean);
  let updaterMap = new Map<string, Updater>();
  if (updaterIds.length) {
    const { data: updaters } = await supabase
      .from("profiles")
      .select("id, username, full_name")
      .in("id", updaterIds);

    (updaters ?? []).forEach((u: any) => {
      updaterMap.set(u.id as string, {
        id: u.id,
        username: u.username ?? null,
        full_name: u.full_name ?? null,
      });
    });
  }

  return (
    <div className="mx-auto max-w-5xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ratings History</h1>
          <p className="text-sm text-gray-600">
            {athlete.full_name ?? "Unknown"}{" "}
            <span className="text-gray-400">(@{athlete.username})</span>
          </p>
        </div>
        <Link
          href={`/athletes/${athlete.username}`}
          className="rounded-xl border px-3 py-2 hover:opacity-90"
        >
          ← Back to Profile
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Change</th>
              <th className="px-3 py-2">Updated By</th>
              <th className="px-3 py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                  No rating changes yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const updater = updaterMap.get(r.updated_by);
                const updaterLabel =
                  updater?.full_name ||
                  (updater?.username ? `@${updater.username}` : r.updated_by.slice(0, 8));

                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">{formatWhen(r.updated_at)}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium">
                        {r.old_rating == null ? "—" : `${r.old_rating}★`}
                      </span>{" "}
                      → <span className="font-medium">{r.new_rating}★</span>
                    </td>
                    <td className="px-3 py-2">{updaterLabel}</td>
                    <td className="px-3 py-2">{r.note || "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
