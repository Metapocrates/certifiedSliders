"use server";

import { createSupabaseServer } from "@/lib/supabase/compat";

type Gender = "M" | "F" | "U";

function adminClient() {
    const supabase = createSupabaseServer();
    return supabase;
}

async function assertAdmin(supabase: ReturnType<typeof createSupabaseServer>) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) throw new Error("Not signed in.");
    const { data: adminRow } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
    if (!adminRow) throw new Error("Admins only.");
    return auth.user.id;
}

export async function listStandardsAction() {
    const supabase = adminClient();
    await assertAdmin(supabase);
    const { data, error } = await supabase
        .from("rating_standards")
        .select("event, class_year, gender, is_time, star3, star4, star5, source, notes, updated_at")
        .order("event", { ascending: true })
        .order("class_year", { ascending: true })
        .order("gender", { ascending: true });

    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, rows: data ?? [] };
}

export async function upsertStandardAction(input: {
    event: string;
    classYear: number;
    gender: Gender;
    isTime: boolean;
    star3: number | null;
    star4: number | null;
    star5: number | null;
    source?: string | null;
    notes?: string | null;
}) {
    const supabase = adminClient();
    await assertAdmin(supabase);

    const payload = {
        event: input.event.trim(),
        class_year: Number(input.classYear),
        gender: input.gender,
        is_time: !!input.isTime,
        star3: input.star3,
        star4: input.star4,
        star5: input.star5,
        source: input.source ?? null,
        notes: input.notes ?? null,
    };

    const { error } = await supabase
        .from("rating_standards")
        .upsert(payload, { onConflict: "event,class_year,gender" });

    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
}

export async function deleteStandardAction(key: {
    event: string;
    classYear: number;
    gender: Gender;
}) {
    const supabase = adminClient();
    await assertAdmin(supabase);

    const { error } = await supabase
        .from("rating_standards")
        .delete()
        .eq("event", key.event)
        .eq("class_year", key.classYear)
        .eq("gender", key.gender);

    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
}
