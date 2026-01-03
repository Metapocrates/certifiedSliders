"use server";

import { createSupabaseServer } from "@/lib/supabase/compat";
import { redirect } from "next/navigation";

export async function signOut() {
    const supabase = await createSupabaseServer();
    // Use 'local' scope to only sign out this browser (keeps other devices signed in)
    // This fully clears the local session including all cookies
    await supabase.auth.signOut({ scope: 'local' });
    redirect("/");
}
