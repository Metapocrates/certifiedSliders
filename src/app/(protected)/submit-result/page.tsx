// Server component (no "use client")
import { getEvents, type EventRow } from "@/lib/events";
import { SubmitResultForm } from "./SubmitResultForm";


export default async function Page() {
  const events: EventRow[] = await getEvents(); // server-side Supabase call
  return <SubmitResultForm events={events} />;
}
