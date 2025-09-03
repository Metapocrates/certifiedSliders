import { createSupabaseServer } from "@/lib/supabase/compat";

export async function getSessionUser() {
    const supabase = createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    return user ?? null;
}

export async function isAdmin(userId?: string | null) {
    if (!userId) return false;
    const supabase = createSupabaseServer();
    const { data, error } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
    return !error && !!data?.user_id;
}
