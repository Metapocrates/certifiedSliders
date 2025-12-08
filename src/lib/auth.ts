// src/lib/auth.ts
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function getSessionUser() {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user ?? null;
}

export async function isAdmin(userId: string) {
    const supabase = await createSupabaseServer();
    const { data } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
    return !!data;
}
