"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPost } from "@/app/admin/blog/actions";

export default function NewPostForm() {
  const router = useRouter();
  const [msg, setMsg] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        setMsg("");
        startTransition(async () => {
          const res = await createPost(fd);
          if (!res?.ok) {
            setMsg(res?.message ?? "Something went wrong.");
            return;
          }
          setMsg("Saved!");
          // If draft -> preview, if published -> live page
          if ((fd.get("status") as string) === "published") {
            router.push(`/blog/${res.slug}`);
          } else {
            router.push(`/blog/${res.slug}?preview=1`);
          }
        });
      }}
      className="grid gap-4 max-w-2xl"
    >
      <label className="grid gap-1">
        <span className="text-sm font-medium">Title</span>
        <input name="title" className="input" placeholder="Post title" required />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Slug (optional)</span>
        <input name="slug" className="input" placeholder="auto-generated from title" />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Excerpt (optional)</span>
        <textarea name="excerpt" className="input min-h-[80px]" maxLength={300} />
        <span className="text-xs text-gray-500">Shown on lists. Max 300 chars.</span>
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Cover image URL (optional)</span>
        <input name="cover_url" className="input" type="url" placeholder="https://..." />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Content</span>
        <textarea name="content" className="input min-h-[240px]" placeholder="Write your post..." required />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Status</span>
        <select name="status" className="input" defaultValue="draft">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </label>

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="btn">
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>

      {msg && <div className="text-sm mt-1">{msg}</div>}
    </form>
  );
}
