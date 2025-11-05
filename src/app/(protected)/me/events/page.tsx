// src/app/(protected)/me/events/page.tsx
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase/compat";
import EventsDisplayManager from "./_components/EventsDisplayManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Events To Display",
};

function fmtTime(sec: number | null | undefined, text?: string | null) {
  if (text) return text;
  if (sec == null) return "—";
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return mm > 0 ? `${mm}:${ss.toFixed(2).padStart(5, "0")}` : ss.toFixed(2);
}

export default async function EventsPage() {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me/events");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-2xl font-semibold text-app">Events To Display</h1>
        <p className="mt-4 text-sm text-muted">Profile not found.</p>
      </div>
    );
  }

  // Fetch verified results
  const { data: results } = await supabase
    .from("results")
    .select(
      "id, event, mark, mark_seconds, wind, meet_name, meet_date, proof_url, season, visible_on_profile"
    )
    .eq("athlete_id", user.id)
    .eq("status", "verified")
    .order("event")
    .order("mark_seconds", { ascending: true, nullsFirst: false });

  const eventsList =
    results?.map((e) => ({
      id: e.id,
      event: e.event ?? "Unknown",
      mark: fmtTime(e.mark_seconds, e.mark),
      windLegal: e.wind != null && e.wind <= 2.0,
      wind: e.wind,
      meetName: e.meet_name,
      meetDate: e.meet_date,
      proofUrl: e.proof_url,
      season: e.season,
      visibleOnProfile: e.visible_on_profile ?? true,
    })) ?? [];

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-app">Events To Display</h1>
        <p className="mt-2 text-sm text-muted">
          Control which results appear on your public profile. Uncheck any event to hide it from your public page.
        </p>
      </div>

      {eventsList.length === 0 ? (
        <div className="rounded-xl border border-app bg-card p-8 text-center">
          <p className="text-sm text-muted">No verified events yet. Submit results to see them here.</p>
        </div>
      ) : (
        <EventsDisplayManager events={eventsList} />
      )}
    </div>
  );
}
