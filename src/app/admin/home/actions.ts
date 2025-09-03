"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";

/* ---------- Featured profile ---------- */
const FeaturedSchema = z.object({
    username: z.string().min(2, "Username required").max(80),
});

export async function setFeaturedByUsername(formData: FormData) {
    const supabase = createSupabaseServer();
    const me = await getSessionUser();
    if (!me) return { ok: false, message: "Not signed in." };
    if (!(await isAdmin(me.id))) return { ok: false, message: "Admins only." };

    const parsed = FeaturedSchema.safeParse({
        username: (formData.get("username") || "").toString(),
    });
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Invalid username." };

    const uname = parsed.data.username.toLowerCase();

    const { data: prof } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", uname)
        .maybeSingle();

    if (!prof?.id) return { ok: false, message: `No profile found for @${uname}.` };

    // Keep a single featured row: clear then set
    await supabase.from("featured_profiles").delete().neq("profile_id", "00000000-0000-0000-0000-000000000000").catch(() => { });
    const { error } = await supabase
        .from("featured_profiles")
        .insert({ profile_id: prof.id });

    if (error) return { ok: false, message: error.message };

    revalidatePath("/"); // home reads featured
    return { ok: true, message: `Featured set to @${prof.username}.` };
}

export async function clearFeatured() {
    const supabase = createSupabaseServer();
    const me = await getSessionUser();
    if (!me) return { ok: false, message: "Not signed in." };
    if (!(await isAdmin(me.id))) return { ok: false, message: "Admins only." };

    const { error } = await supabase.from("featured_profiles").delete().neq("profile_id", "00000000-0000-0000-0000-000000000000");
    if (error) return { ok: false, message: error.message };

    revalidatePath("/");
    return { ok: true, message: "Featured cleared." };
}

/* ---------- News ---------- */
const NewsSchema = z.object({
    title: z.string().min(3, "Title required"),
    url: z.string().url("Invalid URL").optional().or(z.literal("")),
    source: z.string().max(120).optional().or(z.literal("")),
    published_at: z.string().optional().or(z.literal("")),
});

export async function createNewsItem(formData: FormData) {
    const supabase = createSupabaseServer();
    const me = await getSessionUser();
    if (!me) return { ok: false, message: "Not signed in." };
    if (!(await isAdmin(me.id))) return { ok: false, message: "Admins only." };

    const parsed = NewsSchema.safeParse({
        title: formData.get("title"),
        url: (formData.get("url") as string) || "",
        source: (formData.get("source") as string) || "",
        published_at: (formData.get("published_at") as string) || "",
    });
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message || "Invalid input." };

    const d = parsed.data;
    const pubAt = d.published_at ? new Date(d.published_at) : new Date();

    const { error } = await supabase.from("news_items").insert({
        title: d.title,
        url: d.url || null,
        source: d.source || null,
        published_at: pubAt.toISOString(),
    });
    if (error) return { ok: false, message: error.message };

    revalidatePath("/");
    return { ok: true, message: "News item added." };
}

export async function deleteNewsItem(formData: FormData) {
    const supabase = createSupabaseServer();
    const me = await getSessionUser();
    if (!me) return { ok: false, message: "Not signed in." };
    if (!(await isAdmin(me.id))) return { ok: false, message: "Admins only." };

    const id = (formData.get("id") || "").toString();
    if (!id) return { ok: false, message: "Missing id." };

    const { error } = await supabase.from("news_items").delete().eq("id", id);
    if (error) return { ok: false, message: error.message };

    revalidatePath("/");
    return { ok: true };
}
