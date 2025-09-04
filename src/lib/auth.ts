import { createSupabaseServer } from "@/lib/supabase/compat";

export async function getSessionUser() {
    const supabase = createSupabaseServer();
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user ?? null;
}

export async function isAdmin(userId: string) {
    if (!userId) return false;
    const supabase = createSupabaseServer();
    const { data } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
    return !!data;
}
