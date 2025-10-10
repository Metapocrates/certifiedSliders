// src/app/(protected)/settings/actions.ts
"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/compat";

const ProfileSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, "Username must be at least 3 characters")
        .max(32, "Username too long")
        .regex(/^[a-z0-9-_]+$/i, "Letters, numbers, dashes and underscores only"),
    full_name: z.string().trim().min(1, "Full name is required").max(100),
    class_year: z.string().trim().regex(/^\d{4}$/, "Enter a 4-digit year like 2028"),
    school_name: z.string().trim().max(120).optional().or(z.literal("")),
    school_state: z
        .string()
        .trim()
        .max(2, "Use 2-letter state (e.g., CA)")
        .optional()
        .or(z.literal("")),
});

type ActionResult =
    | { ok: true }
    | { ok: false; fieldErrors?: Record<string, string>; formError?: string };

export async function updateProfileAction(
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    const supabase = createSupabaseServer();

    // ✅ Get the user from THIS supabase instance (so the DB call has auth)
    const {
        data: { user },
        error: authErr,
    } = await supabase.auth.getUser();
    if (!user || authErr) {
        return { ok: false, formError: "You must be signed in." };
    }

    const raw = {
        username: (formData.get("username") as string | null) ?? "",
        full_name: (formData.get("full_name") as string | null) ?? "",
        class_year: (formData.get("class_year") as string | null) ?? "",
        school_name: (formData.get("school_name") as string | null) ?? "",
        school_state: (formData.get("school_state") as string | null) ?? "",
    };

    const parsed = ProfileSchema.safeParse(raw);
    if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, issues] of Object.entries(parsed.error.flatten().fieldErrors)) {
            const first = issues?.[0];
            if (first) fieldErrors[key] = first;
        }
        return { ok: false, fieldErrors };
    }

    const values = parsed.data;

    // Enforce unique username (ignore current user)
    const { data: taken, error: checkErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", values.username)
        .neq("id", user.id)
        .limit(1);
    if (checkErr) {
        return { ok: false, formError: checkErr.message };
    }
    if (taken && taken.length > 0) {
        return {
            ok: false,
            fieldErrors: { username: "That username is taken. Try another." },
        };
    }

    // ✅ RLS-safe UPSERT (includes id and scopes update to own row)
    const { error } = await supabase
        .from("profiles")
        .upsert(
            {
                id: user.id, // satisfies with_check(id = auth.uid())
                username: values.username,
                full_name: values.full_name,
                class_year: Number(values.class_year),
                school_name: values.school_name || null,
                school_state: values.school_state || null,
            },
            { onConflict: "id" }
        )
        .eq("id", user.id)
        .select("id")
        .single();

    if (error) {
        return { ok: false, formError: error.message };
    }

    return { ok: true };
}