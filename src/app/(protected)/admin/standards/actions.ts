"use server";

import { createSupabaseServer } from "@/lib/supabase/compat";

type Gender = "M" | "F" | "U";

async function adminClient() {
    return await createSupabaseServer();
}

async function assertAdmin(supabase: Awaited<ReturnType<typeof createSupabaseServer>>) {
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
    const supabase = await adminClient();
    await assertAdmin(supabase);
    const { data, error } = await supabase
        .from("rating_standards_grade")
        .select("event, grade, gender, is_time, star3, star4, star5, source, notes, updated_at")
        .order("event", { ascending: true })
        .order("grade", { ascending: true })
        .order("gender", { ascending: true });

    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, rows: data ?? [] };
}

export async function upsertStandardAction(input: {
    event: string;
    grade: 9 | 10 | 11 | 12;
    gender: Gender;
    isTime: boolean;
    star3: number | null;
    star4: number | null;
    star5: number | null;
    source?: string | null;
    notes?: string | null;
}) {
    const supabase = await adminClient();
    await assertAdmin(supabase);

    const payload = {
        event: input.event.trim(),
        grade: Number(input.grade) as 9 | 10 | 11 | 12,
        gender: input.gender,
        is_time: !!input.isTime,
        star3: input.star3,
        star4: input.star4,
        star5: input.star5,
        source: input.source ?? null,
        notes: input.notes ?? null,
    };

    const { error } = await supabase
        .from("rating_standards_grade")
        .upsert(payload, { onConflict: "event,grade,gender" });

    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
}

export async function deleteStandardAction(key: {
    event: string;
    grade: 9 | 10 | 11 | 12;
    gender: Gender;
}) {
    const supabase = await adminClient();
    await assertAdmin(supabase);

    const { error } = await supabase
        .from("rating_standards_grade")
        .delete()
        .eq("event", key.event)
        .eq("grade", key.grade)
        .eq("gender", key.gender);

    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
}
