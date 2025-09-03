"use server";

import { createSupabaseServer } from "@/lib/supabase/compat";
import { redirect } from "next/navigation";

export async function signOut() {
    const supabase = createSupabaseServer();
    await supabase.auth.signOut();
    redirect("/");
}
