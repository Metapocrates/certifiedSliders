export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "@/utils/supabase-server";

export default async function AthletePage({ params }: { params: { username: string } }) {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("mv_best_event")
    .select("athlete_id, full_name, school_name, school_state, class_year, gender, event, mark, mark_seconds, mark_seconds_adj, timing, wind_legal, meet_name, meet_date, proof_url")
    .eq("athlete_id", params.username)
    .limit(1);

  if (error) return <div className="container p-4">Error: {error.message}</div>;
  const a = data?.[0];
  if (!a) return <div className="container p-4">No athlete found.</div>;

  return (
    <div className="container max-w-3xl mx-auto p-4 space-y-4">
      <div className="card p-4">
        <h1 className="text-2xl font-bold">{a.full_name}</h1>
        <p className="subtle mt-1">
          {a.school_name ?? "—"} {a.school_state ? `(${a.school_state})` : ""}{a.class_year ? ` • Class of ${a.class_year}` : ""}
        </p>
      </div>
    </div>
  );
}
