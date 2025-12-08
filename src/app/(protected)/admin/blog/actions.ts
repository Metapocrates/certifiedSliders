"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { TEAM_AUTHOR_NAME } from "./constants";

const PostSchema = z.object({
    title: z.string().min(3, "Title is required"),
    slug: z
        .string()
        .min(3)
        .regex(/^[a-z0-9-]+$/i, "Use letters, numbers, and dashes")
        .optional(),
    excerpt: z.string().max(300).optional(),
    content: z.string().min(1, "Content is required"),
    cover_image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    tags: z.string().optional(),
    video_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    author_mode: z.enum(["self", "team"]).default("self"),
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

export async function createPost(formData: FormData) {
    const supabase = await createSupabaseServer();
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "Not signed in." };
    if (!(await isAdmin(user.id))) return { ok: false, message: "Admins only." };

    const rawFeatured = formData.get("featured");
    const parsed = PostSchema.safeParse({
        title: formData.get("title") ?? "",
        slug: (formData.get("slug") as string | null) || undefined,
        excerpt: (formData.get("excerpt") as string | null) ?? undefined,
        content: formData.get("content") ?? "",
        cover_image_url: (formData.get("cover_image_url") as string | null) ?? undefined,
        tags: (formData.get("tags") as string | null) ?? undefined,
        video_url: (formData.get("video_url") as string | null) ?? undefined,
        author_mode: (formData.get("author_mode") as string | null) ?? "self",
        status: (formData.get("status") as string | null) ?? "draft",
    });
    if (!parsed.success) {
        return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const data = parsed.data;
    const slug = (data.slug && data.slug.length > 0 ? slugify(data.slug) : slugify(data.title)) || `post-${Date.now()}`;
    const tagList =
        data.tags
            ?.split(",")
            .map((t) => t.trim())
            .filter(Boolean) ?? [];
    const mode = data.author_mode ?? "self";
    const featured = rawFeatured === "on";

    const row = {
        slug,
        title: data.title,
        excerpt: data.excerpt ?? null,
        content: data.content,
        cover_image_url: data.cover_image_url ? data.cover_image_url : null,
        author_id: mode === "team" ? null : user.id,
        author_override: mode === "team" ? TEAM_AUTHOR_NAME : null,
        tags: tagList,
        video_url: data.video_url ? data.video_url : null,
        status: data.status,
        featured,
        published_at: data.status === "published" ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from("blog_posts").insert(row);
    if (error) {
        if ((error as any).code === "23505" || /duplicate key/i.test(error.message)) {
            return { ok: false, message: "Slug already exists. Try a different one." };
        }
        return { ok: false, message: error.message };
    }

    revalidatePath("/blog");
    revalidatePath("/admin/blog");
    revalidatePath("/");
    return { ok: true, slug };
}

const StatusSchema = z.object({
    slug: z.string().min(3),
    status: z.enum(["draft", "published", "archived"]),
});

const FeaturedSchema = z.object({
    slug: z.string().min(3),
    featured: z.enum(["on", "off"]),
});

export async function setPostStatus(formData: FormData) {
    const supabase = await createSupabaseServer();
    const user = await getSessionUser();
    if (!user) throw new Error("Not signed in.");
    if (!(await isAdmin(user.id))) throw new Error("Admins only.");

    const parsed = StatusSchema.safeParse({
        slug: formData.get("slug"),
        status: formData.get("status"),
    });

    if (!parsed.success) {
        throw new Error("Invalid status change.");
    }

    const { slug, status } = parsed.data;
    const redirectTo = (formData.get("redirectTo") as string | null) || null;

    const { data: existing, error: fetchErr } = await supabase
        .from("blog_posts")
        .select("published_at, status")
        .eq("slug", slug)
        .maybeSingle();

    if (fetchErr || !existing) {
        throw new Error("Post not found.");
    }

    const updates: Record<string, any> = { status };
    if (status === "published") {
        updates.published_at = existing.published_at ?? new Date().toISOString();
    } else {
        updates.published_at = null;
    }

    const { error } = await supabase.from("blog_posts").update(updates).eq("slug", slug);
    if (error) throw new Error(error.message);

    revalidatePath("/blog");
    revalidatePath("/admin/blog");
    revalidatePath(`/blog/${slug}`);
    revalidatePath("/");

    if (redirectTo) {
        redirect(redirectTo);
    }
    // No return needed when used as form action
}

export async function setPostFeatured(formData: FormData) {
    const supabase = await createSupabaseServer();
    const user = await getSessionUser();
    if (!user) throw new Error("Not signed in.");
    if (!(await isAdmin(user.id))) throw new Error("Admins only.");

    const parsed = FeaturedSchema.safeParse({
        slug: formData.get("slug"),
        featured: formData.get("featured") ?? "off",
    });

    if (!parsed.success) {
        throw new Error("Invalid featured toggle.");
    }

    const { slug, featured } = parsed.data;
    const flag = featured === "on";

    const { error } = await supabase
        .from("blog_posts")
        .update({ featured: flag })
        .eq("slug", slug);

    if (error) throw new Error(error.message);

    revalidatePath("/blog");
    revalidatePath("/admin/blog");
    revalidatePath("/");

    // No return needed when used as form action
}

export async function uploadBlogImage(formData: FormData) {
    const supabase = await createSupabaseServer();
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "Not signed in." };
    if (!(await isAdmin(user.id))) return { ok: false, message: "Admins only." };

    const file = formData.get("image") as File | null;
    if (!file) return { ok: false, message: "No file provided." };

    // Validate file type
    if (!file.type.startsWith("image/")) {
        return { ok: false, message: "Please upload an image file" };
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        return { ok: false, message: "Image must be less than 5MB" };
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = fileName;

    const { error: upErr } = await supabase.storage
        .from("blog-images")
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
        });

    if (upErr) return { ok: false, message: upErr.message };

    const { data: pub } = supabase.storage.from("blog-images").getPublicUrl(filePath);

    return { ok: true, message: "Image uploaded.", url: pub.publicUrl };
}
