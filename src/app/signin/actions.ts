"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerActionClient } from "@supabase/auth-helpers-nextjs";

export async function signIn(formData: FormData) {
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) return { ok: false, message: "Email and password are required." };

    const supabase = createServerActionClient({ cookies });
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return { ok: false, message: error.message };

    // Success: set cookies and go to /me
    redirect("/me");
}

export async function signUp(formData: FormData) {
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) return { ok: false, message: "Email and password are required." };

    const supabase = createServerActionClient({ cookies });
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) return { ok: false, message: error.message };

    // If your project requires email confirmation, there's no session yet.
    if (!data.session) {
        return { ok: true, message: "Check your email to confirm your account." };
    }

    // If confirmation not required, you'll be signed in immediately.
    redirect("/me");
}
