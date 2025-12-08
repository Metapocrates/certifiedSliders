// src/app/(protected)/me/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { createSupabaseAdmin } from "@/lib/supabase/admin"; // ← NEW
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

    const supabase = await createSupabaseServer();

    // Check if it exists
    const { data: existing, error: selErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
    if (selErr) throw selErr;
    if (existing) {
        revalidatePath("/me");
        return { ok: true, created: false as const };
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
    return { ok: true, created: true as const, username };
}

/** Update the current user's profile fields from the form. */
// src/app/(protected)/me/actions.ts
import { redirect } from "next/navigation"; // ← add this

function normalizeState(input: string | null): string | null {
    if (!input) return null;
    const trimmed = input.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(trimmed)) {
        throw new Error("School state must be a 2-letter code (e.g., CA).");
    }
    return trimmed;
}

export async function updateProfileAction(formData: FormData) {
    const user = await getSessionUser();
    if (!user) throw new Error("Not signed in");

    const admin = createSupabaseAdmin();

    const toNull = (v: FormDataEntryValue | null) =>
        v === null || v === undefined || String(v).trim() === "" ? null : String(v);

    const username = toNull(formData.get("username"));
    const full_name = toNull(formData.get("full_name"));
    const school_name = toNull(formData.get("school_name"));
    const rawState = toNull(formData.get("school_state"));
    const bio = toNull(formData.get("bio"));
    const genderRaw = toNull(formData.get("gender")); // "M" | "F" | null
    const classYearRaw = toNull(formData.get("class_year"));

    const class_year =
        classYearRaw && !Number.isNaN(Number(classYearRaw)) ? Number(classYearRaw) : null;
    const gender = genderRaw === "M" || genderRaw === "F" ? (genderRaw as "M" | "F") : null;

    const school_state = rawState ? normalizeState(rawState) : null;
    if (school_name && !school_state) {
        throw new Error("Select a state to pair with the school.");
    }

    // Fetch profile_id for revalidation
    const { data: profileData } = await admin
        .from("profiles")
        .select("profile_id")
        .eq("id", user.id)
        .maybeSingle();

    const { error } = await admin
        .from("profiles")
        .update({ username, full_name, school_name, school_state, bio, gender, class_year })
        .eq("id", user.id);

    if (error) throw error;

    revalidatePath("/me");
    if (profileData?.profile_id) {
        revalidatePath(`/athletes/${profileData.profile_id}`);
    }

    // ← show confirmation by reloading with a flag
    redirect("/me?updated=1");
}


/** Remove one of the current user's *pending* submissions. */
export async function deletePendingResultAction(formData: FormData) {
    const user = await getSessionUser();
    if (!user) throw new Error("Not signed in");

    const resultId = Number(formData.get("resultId"));
    if (!Number.isFinite(resultId)) throw new Error("Bad result id");

    const admin = createSupabaseAdmin();

    // Fetch to verify ownership + status
    const { data: row, error: selErr } = await admin
        .from("results")
        .select("athlete_id, status")
        .eq("id", resultId)
        .maybeSingle();

    if (selErr) throw selErr;
    if (!row) throw new Error("Result not found");
    if (row.athlete_id !== user.id) throw new Error("Not allowed");
    if (row.status !== "pending" && row.status !== "blocked_until_verified") {
        throw new Error("Only pending items can be removed");
    }

    // Delete and refresh
    const { error: delErr } = await admin.from("results").delete().eq("id", resultId);
    if (delErr) throw delErr;

    try {
        await admin.rpc("refresh_mv_best_event");
    } catch {
        // ignore
    }

    revalidatePath("/me");
    revalidatePath("/admin");
}

/** Banner data: does the signed-in user meet any 3★/4★/5★ cutoff? */
type RankableRow = {
    event: string;
    eligible_star: number | null;
    mark_seconds_adj: number | null;
    mark_metric: number | null;
    meet_name: string | null;
    meet_date: string | null;
    proof_url: string | null;
};

export async function getMyRankableAction() {
    const supabase = await createSupabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return { ok: false as const, error: "Not signed in." };

    const { data, error } = await supabase.rpc("current_user_rankable");
    if (error) return { ok: false as const, error: error.message };

    const rows = (data ?? []) as RankableRow[];
    const maxStar = rows.reduce((m, r) => Math.max(m, r.eligible_star ?? 0), 0);
    return { ok: true as const, maxStar, rows };
}
