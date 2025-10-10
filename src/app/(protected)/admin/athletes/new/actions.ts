"use server";

import { cookies, headers } from "next/headers";
import crypto from "node:crypto";
import { createServerClient } from "@supabase/ssr";

function supabaseServer() {
    const cookieStore = cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options?: any) {
                    cookieStore.set({ name, value, ...options });
                },
                remove(name: string, options?: any) {
                    cookieStore.delete({ name, ...options });
                },
            },
        }
    );
}

export async function createProfileAction(formData: FormData) {
    const supabase = supabaseServer();

    const username = (formData.get("username") as string)?.trim();
    const full_name = (formData.get("full_name") as string)?.trim();
    const class_year = Number(formData.get("class_year"));
    const school_name = ((formData.get("school_name") as string) || "").trim() || null;

    if (!username || !full_name || !class_year) {
        return { ok: false, error: "Missing required fields." };
    }

    const claim_token = crypto.randomUUID();

    const { data, error } = await supabase
        .from("profiles")
        .insert([{ username, full_name, class_year, school_name, claim_token }])
        .select("id, username, claim_token")
        .single();

    if (error) {
        return { ok: false, error: error.message };
    }

    const hdrs = headers();
    const origin =
        (hdrs.get("x-forwarded-proto") && hdrs.get("x-forwarded-host"))
            ? `${hdrs.get("x-forwarded-proto")}://${hdrs.get("x-forwarded-host")}`
            : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const claimUrl = `${origin}/claim?token=${encodeURIComponent(data.claim_token!)}`;

    return { ok: true, id: data.id, username: data.username, claimUrl };
}