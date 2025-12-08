import { supabaseServer } from "@/lib/supabase/server";


export type EventRow = {
    id: string;
    code: string;
    name: string;
    discipline: "track" | "field" | "relay";
    unit: "seconds" | "meters" | "points";
    hurdles: boolean;
    indoor: boolean;
    outdoor: boolean;
    sort_order: number;
};

export async function getEvents(): Promise<EventRow[]> {
    const supabase = await supabaseServer();
    const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("sort_order", { ascending: true });
    if (error) throw error;
    return data as EventRow[];
}
