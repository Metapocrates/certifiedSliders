"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPost } from "@/app/(protected)/admin/blog/actions";
import ImageUploader from "@/components/blog/ImageUploader";
import ImageGallery from "@/components/blog/ImageGallery";


export default function NewPostForm() {
  const router = useRouter();
  const [msg, setMsg] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [showGallery, setShowGallery] = useState(false);

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
        <button
          type="button"
          onClick={() => setShowGallery(true)}
          className="text-sm font-semibold text-scarlet hover:underline"
        >
          Or choose from gallery
        </button>
      </div>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Tags (comma separated)</span>
        <input name="tags" className="input" placeholder="rankings, interviews, training" />
        <span className="text-xs text-muted">Use lowercase keywords separated by commas.</span>
      </label>

      <label className="flex items-center gap-3 rounded-xl border border-app/60 bg-card px-4 py-3 text-sm">
        <input type="checkbox" name="featured" />
        <span>Feature this post on the home page</span>
      </label>

      <fieldset className="grid gap-2 rounded-xl border border-dashed border-app/70 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          Author
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="author_mode" value="self" defaultChecked />
          <span>Publish as me (shows my profile)</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="author_mode" value="team" />
          <span>Certified Sliders Team</span>
        </label>
      </fieldset>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Featured video URL (optional)</span>
        <input
          name="video_url"
          className="input"
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <span className="text-xs text-muted">
          YouTube links embed automatically. Direct MP4 links will show a video player.
        </span>
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

      {showGallery && (
        <ImageGallery
          onSelectImage={(url) => {
            setCoverImageUrl(url);
            setShowGallery(false);
          }}
          onClose={() => setShowGallery(false)}
        />
      )}
    </form>
  );
}
