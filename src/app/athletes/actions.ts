"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";

/* ---------- Edit profile ---------- */
const EditProfileSchema = z.object({
    username: z.string().min(2).max(32),
    display_name: z.string().min(2).max(80),
    class_year: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
    gender: z.enum(["M", "F", "Other"]).nullable().optional(),
    school_name: z.string().min(1).max(120),
    school_state: z.string().min(2).max(2),
    bio: z.string().max(2000).nullable().optional()
});

export async function updateProfile(formData: FormData) {
    const supabase = createSupabaseServer();
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "Not signed in." };

    let parsed;
    try {
        parsed = EditProfileSchema.parse({
            username: formData.get("username") || "",
            display_name: formData.get("display_name") || "",
            class_year: formData.get("class_year"),
            gender: formData.get("gender") || null,
            school_name: formData.get("school_name") || "",
            school_state: (formData.get("school_state") || "").toString().toUpperCase(),
            bio: formData.get("bio") || null,
        });
    } catch (e: any) {
        return { ok: false, message: e?.errors?.[0]?.message ?? "Invalid input." };
    }

    const { data: current, error: curErr } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", user.id)
        .maybeSingle();

    if (curErr || !current) return { ok: false, message: "Profile not found." };
    const oldUsername = current.username;

    const { error } = await supabase
        .from("profiles")
        .update({
            username: parsed.username,
            display_name: parsed.display_name,
            class_year: parsed.class_year ?? null,
            gender: parsed.gender ?? null,
            school_name: parsed.school_name,
            school_state: parsed.school_state,
            bio: parsed.bio ?? null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", current.id);

    if (error) return { ok: false, message: error.message };

    if (oldUsername) revalidatePath(`/athletes/${oldUsername}`);
    revalidatePath(`/athletes/${parsed.username}`);
    revalidatePath(`/me`);
    return { ok: true, message: "Profile updated." };
}

/* ---------- Upload avatar ---------- */
export async function uploadAvatar(formData: FormData) {
    const supabase = createSupabaseServer();
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "Not signed in." };

    const file = formData.get("avatar") as File | null;
    if (!file) return { ok: false, message: "No file provided." };

    const path = `${user.id}/avatar`; // avatars/{uid}/avatar
    await supabase.storage.from("avatars").remove([path]).catch(() => { });

    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
    });
    if (upErr) return { ok: false, message: upErr.message };

    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);

    const { error: profErr } = await supabase
        .from("profiles")
        .update({ profile_pic_url: pub.publicUrl, updated_at: new Date().toISOString() })
        .eq("id", user.id);

    if (profErr) return { ok: false, message: profErr.message };

    const { data: p } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
    if (p?.username) revalidatePath(`/athletes/${p.username}`);
    revalidatePath(`/me`);
    return { ok: true, message: "Avatar updated.", url: pub.publicUrl };
}

/* ---------- Submit result (pending) ---------- */
const SubmitResultSchema = z.object({
    event: z.string().min(2).max(10),
    mark: z.string().min(1).max(16),
    timing: z.enum(["FAT", "HAND"]).nullable().optional(),
    wind: z.coerce.number().nullable().optional(),
    season: z.enum(["OUTDOOR", "INDOOR"]).default("OUTDOOR"),
    meet_name: z.string().min(2).max(160),
    meet_date: z.string().min(4).max(10),      // YYYY-MM-DD
    proof_url: z.string().url().max(500),
});

export async function submitResult(formData: FormData) {
    const supabase = createSupabaseServer();
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "Not signed in." };

    let parsed;
    try {
        parsed = SubmitResultSchema.parse({
            event: formData.get("event") || "",
            mark: formData.get("mark") || "",
            timing: formData.get("timing") || null,
            wind: formData.get("wind"),
            season: formData.get("season") || "OUTDOOR",
            meet_name: formData.get("meet_name") || "",
            meet_date: formData.get("meet_date") || "",
            proof_url: formData.get("proof_url") || "",
        });
    } catch (e: any) {
        return { ok: false, message: e?.errors?.[0]?.message ?? "Invalid input." };
    }

    const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", user.id)
        .maybeSingle();

    if (profErr || !prof) return { ok: false, message: "Profile not found." };

    const { error } = await supabase.from("results").insert({
        athlete_id: prof.id,
        event: parsed.event,
        mark: parsed.mark,
        timing: parsed.timing ?? null,
        wind: parsed.wind ?? null,
        season: parsed.season,
        meet_name: parsed.meet_name,
        meet_date: parsed.meet_date,
        proof_url: parsed.proof_url,
        status: "pending",
        source: "user_submit",
    });

    if (error) return { ok: false, message: error.message };

    if (prof.username) revalidatePath(`/athletes/${prof.username}`);
    revalidatePath(`/me`);
    return { ok: true, message: "Result submitted for review." };
}
