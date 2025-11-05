// src/app/(protected)/me/events/page.tsx
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase/compat";
import EventsDisplayManager from "./_components/EventsDisplayManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Event Display Settings",
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

  // Fetch event preferences
  const { data: preferences } = await supabase
    .from("athlete_event_preferences")
    .select("event, is_featured, display_order")
    .eq("athlete_id", user.id);

  const prefsMap = new Map(
    (preferences ?? []).map((p) => [
      p.event,
      { is_featured: p.is_featured, display_order: p.display_order },
    ])
  );

  // Aggregate events by type (get best result per event)
  const eventsByType = new Map<string, any>();
  for (const result of results ?? []) {
    const eventName = result.event ?? "Unknown";
    if (!eventsByType.has(eventName)) {
      eventsByType.set(eventName, {
        event: eventName,
        bestMark: fmtTime(result.mark_seconds, result.mark),
        bestMarkSeconds: result.mark_seconds,
        resultId: result.id,
        wind: result.wind,
        windLegal: result.wind != null && result.wind <= 2.0,
        meetName: result.meet_name,
        meetDate: result.meet_date,
        proofUrl: result.proof_url,
        season: result.season,
        visibleOnProfile: result.visible_on_profile ?? true,
        isFeatured: prefsMap.get(eventName)?.is_featured ?? false,
        displayOrder: prefsMap.get(eventName)?.display_order ?? 0,
      });
    }
  }

  const eventsList = Array.from(eventsByType.values());

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-app">Event Display Settings</h1>
        <p className="mt-2 text-sm text-muted">
          Control which events show on your profile and which appear as featured. Featured events appear first in a custom order, while other visible events appear in a collapsible section. Uncheck &quot;Visible&quot; to completely hide an event from your public profile.
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
