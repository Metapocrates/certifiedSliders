"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";

function makeDefaultUsername(email?: string, userId?: string) {
    const base =
        (email?.split("@")[0] || "user")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 20) || "user";
    const suffix = (userId || "").replace(/-/g, "").slice(0, 6) || "000000";
    return `${base}-${suffix}`;
}

/** Create a profiles row for the signed-in user if missing. */
export async function ensureProfileAction() {
    const user = await getSessionUser();
    if (!user) throw new Error("Not signed in");

    const supabase = createSupabaseServer();

    // Check if it exists
    const { data: existing, error: selErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
    if (selErr) throw selErr;
    if (existing) {
        revalidatePath("/me");
        return { ok: true, created: false };
    }

    // Create it
    const username = makeDefaultUsername(user.email ?? undefined, user.id);
    const { error: insErr } = await supabase.from("profiles").insert({
        id: user.id,
        username,
        full_name: null,
        class_year: null,
        gender: null,
        school_name: null,
        school_state: null,
        bio: null,
        profile_pic_url: null,
    });
    if (insErr) throw insErr;

    revalidatePath("/me");
    return { ok: true, created: true, username };
}

/** Update the current user's profile fields from the form. */
export async function updateProfileAction(formData: FormData) {
    const user = await getSessionUser();
    if (!user) throw new Error("Not signed in");

    const supabase = createSupabaseServer();

    const toNull = (v: FormDataEntryValue | null) =>
        v === null || v === undefined || String(v).trim() === "" ? null : String(v);

    const username = toNull(formData.get("username"));
    const full_name = toNull(formData.get("full_name"));
    const school_name = toNull(formData.get("school_name"));
    const school_state = toNull(formData.get("school_state"));
    const bio = toNull(formData.get("bio"));
    const genderRaw = toNull(formData.get("gender")); // expect "M" | "F" | null
    const classYearRaw = toNull(formData.get("class_year"));

    const class_year =
        classYearRaw && !Number.isNaN(Number(classYearRaw))
            ? Number(classYearRaw)
            : null;
    const gender =
        genderRaw === "M" || genderRaw === "F" ? genderRaw : null;

    const { error } = await supabase
        .from("profiles")
        .update({
            username,
            full_name,
            school_name,
            school_state,
            bio,
            gender,
            class_year,
        })
        .eq("id", user.id);

    if (error) throw error;

    revalidatePath("/me");
    // You may also revalidate athlete page:
    // revalidatePath(`/athlete/${user.id}`);
    return { ok: true };
}
