"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";

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
    const supabase = createSupabaseServer();
    const user = await getSessionUser();
    if (!user) return { ok: false, message: "Not signed in." };
    if (!(await isAdmin(user.id))) return { ok: false, message: "Admins only." };

    const parsed = PostSchema.safeParse({
        title: formData.get("title") ?? "",
        slug: (formData.get("slug") as string | null) || undefined,
        excerpt: (formData.get("excerpt") as string | null) ?? undefined,
        content: formData.get("content") ?? "",
        cover_image_url: (formData.get("cover_image_url") as string | null) ?? undefined,
        tags: (formData.get("tags") as string | null) ?? undefined,
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

    const row = {
        slug,
        title: data.title,
        excerpt: data.excerpt ?? null,
        content: data.content,
        cover_image_url: data.cover_image_url ? data.cover_image_url : null,
        author_id: user.id,
        tags: tagList,
        status: data.status,
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
