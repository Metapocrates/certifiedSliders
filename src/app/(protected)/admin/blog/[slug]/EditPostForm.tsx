"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { updatePost, deletePost } from "./actions";
import ImageUploader from "@/components/blog/ImageUploader";
import { uploadBlogImage } from "@/app/(protected)/admin/blog/actions";

type Post = {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  tags: string[] | null;
  video_url: string | null;
  featured: boolean;
  author_override: string | null;
  status: "draft" | "published" | "archived";
};

export default function EditPostForm({ initial }: { initial: Post }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [coverImageUrl, setCoverImageUrl] = useState(initial.cover_image_url ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultAuthorMode = initial.author_override ? "team" : "self";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      setMsg('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMsg('Image must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setMsg('');

    try {
      const formData = new FormData();
      formData.append('image', file);
      const result = await uploadBlogImage(formData);

      if (!result.ok) {
        throw new Error(result.message);
      }
      if (result.url) {
        setCoverImageUrl(result.url);
        setMsg('Image uploaded!');
      }
    } catch (err: any) {
      setMsg(err?.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  async function doDelete() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    startDelete(async () => {
      const fd = new FormData();
      fd.set("slug", initial.slug);
      const res = await deletePost(fd);
      if (!res?.ok) {
        setMsg(res?.message ?? "Failed to delete.");
        return;
      }
      router.push("/blog");
    });
  }

  return (
    <form
      action={(fd) => {
        setMsg("");
        startTransition(async () => {
          fd.set("original_slug", initial.slug);
          const res = await updatePost(fd);
          if (!res?.ok) {
            setMsg(res?.message ?? "Something went wrong.");
            return;
          }
          setMsg("Saved!");
          const dest =
            res.status === "published"
              ? `/blog/${res.slug}`
              : `/blog/${res.slug}?preview=1`;
          router.push(dest);
        });
      }}
      className="grid gap-4 max-w-2xl"
    >
      <label className="grid gap-1">
        <span className="text-sm font-medium">Title</span>
        <input name="title" defaultValue={initial.title} className="input" required />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Slug</span>
        <input
          name="slug"
          defaultValue={initial.slug}
          className="input font-mono"
          placeholder="post-slug"
          required
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Excerpt</span>
        <textarea
          name="excerpt"
          defaultValue={initial.excerpt ?? ""}
          className="input min-h-[80px]"
          maxLength={300}
        />
        <span className="text-xs text-muted">Shown on lists. Max 300 chars.</span>
      </label>

      <div className="space-y-2">
        <ImageUploader
          label="Cover Image (optional)"
          currentImageUrl={coverImageUrl}
          onImageUploaded={setCoverImageUrl}
          helperText="Recommended: 1200x630px for social sharing"
        />
        <input type="hidden" name="cover_image_url" value={coverImageUrl} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-sm font-semibold text-scarlet hover:underline disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Or select from device'}
        </button>
      </div>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Tags (comma separated)</span>
        <input
          name="tags"
          defaultValue={(initial.tags ?? []).join(", ")}
          className="input"
          placeholder="rankings, interviews, training"
        />
        <span className="text-xs text-muted">Use lowercase keywords separated by commas.</span>
      </label>

      <label className="flex items-center gap-3 rounded-xl border border-app/60 bg-card px-4 py-3 text-sm">
        <input type="checkbox" name="featured" defaultChecked={initial.featured} />
        <span>Feature this post on the home page</span>
      </label>

      <fieldset className="grid gap-2 rounded-xl border border-dashed border-app/70 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          Author
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="author_mode" value="self" defaultChecked={defaultAuthorMode === "self"} />
          <span>Publish as me (shows my profile)</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="author_mode" value="team" defaultChecked={defaultAuthorMode === "team"} />
          <span>Certified Sliders Team</span>
        </label>
      </fieldset>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Featured video URL (optional)</span>
        <input
          name="video_url"
          defaultValue={initial.video_url ?? ""}
          className="input"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <span className="text-xs text-muted">
          YouTube links embed automatically. Direct MP4 links will show a video player.
        </span>
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Content (Markdown)</span>
        <textarea
          name="content"
          defaultValue={initial.content ?? ""}
          className="input min-h-[320px]"
          placeholder="Write your post…"
          required
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Status</span>
        <select name="status" className="input" defaultValue={initial.status}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </label>

      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="btn">
          {isPending ? "Saving..." : "Save"}
        </button>
        <button type="button" disabled={isDeleting} className="btn" onClick={doDelete}>
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {msg && <div className="text-sm mt-1">{msg}</div>}
    </form>
  );
}
