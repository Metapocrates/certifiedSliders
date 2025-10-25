"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";

const PostUpdateSchema = z.object({
    original_slug: z.string().min(1),
    title: z.string().min(3, "Title is required"),
    slug: z
        .string()
        .min(3)
        .regex(/^[a-z0-9-]+$/i, "Use letters, numbers, dashes")
        .optional(),
    excerpt: z.string().max(300).optional().or(z.literal("")),
    content: z.string().min(1, "Content is required"),
    cover_image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    tags: z.string().optional(),
    status: z.enum(["draft", "published"]).default("draft"),
});

function slugify(s: string) {
    return s
        .toLowerCase()
        .trim()
        .replace(/['"]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export async function updatePost(formData: FormData) {
    const supabase = createSupabaseServer();
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "Not signed in." };
    if (!(await isAdmin(user.id))) return { ok: false, message: "Admins only." };

    const parsed = PostUpdateSchema.safeParse({
        original_slug: formData.get("original_slug"),
        title: formData.get("title"),
        slug: (formData.get("slug") as string) || undefined,
        excerpt: formData.get("excerpt") ?? "",
        content: formData.get("content"),
        cover_image_url: (formData.get("cover_image_url") as string) || undefined,
        tags: (formData.get("tags") as string) || undefined,
        status: (formData.get("status") as string) || "draft",
    });
    if (!parsed.success) {
        return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const d = parsed.data;
    const newSlug = d.slug ? slugify(d.slug) : slugify(d.title);
    const tagList =
        d.tags
            ?.split(",")
            .map((t) => t.trim())
            .filter(Boolean) ?? [];

    // published_at handling
    // - if publishing now: set when null
    // - if switching to draft: clear
    const publishNow = d.status === "published";

    const { data: existing, error: findErr } = await supabase
        .from("blog_posts")
        .select("published_at, status")
        .eq("slug", d.original_slug)
        .maybeSingle();

    if (findErr || !existing) return { ok: false, message: "Post not found." };

    const updates: any = {
        slug: newSlug,
        title: d.title,
        excerpt: d.excerpt || null,
        content: d.content,
        cover_image_url: d.cover_image_url || null,
        tags: tagList,
        status: d.status,
    };

    if (publishNow && !existing.published_at) {
        updates.published_at = new Date().toISOString();
    }
    if (!publishNow) {
        updates.published_at = null;
    }

    const { error } = await supabase
        .from("blog_posts")
        .update(updates)
        .eq("slug", d.original_slug);

    if (error) {
        if ((error as any).code === "23505" || /duplicate key/i.test(error.message)) {
            return { ok: false, message: "Slug already exists. Try another." };
        }
        return { ok: false, message: error.message };
    }

    // Revalidate list + both slugs (old & new)
    revalidatePath("/blog");
    revalidatePath("/admin/blog");
    revalidatePath(`/blog/${d.original_slug}`);
    revalidatePath(`/blog/${newSlug}`);
    revalidatePath("/"); // in case it’s on the home
    return { ok: true, slug: newSlug, status: d.status };
}

export async function deletePost(formData: FormData) {
    const supabase = createSupabaseServer();
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "Not signed in." };
    if (!(await isAdmin(user.id))) return { ok: false, message: "Admins only." };

    const slug = String(formData.get("slug") || "");
    if (!slug) return { ok: false, message: "Missing slug." };

    const { error } = await supabase.from("blog_posts").delete().eq("slug", slug);
    if (error) return { ok: false, message: error.message };

    revalidatePath("/blog");
    revalidatePath("/admin/blog");
    revalidatePath(`/blog/${slug}`);
    revalidatePath("/");
    return { ok: true };
}
