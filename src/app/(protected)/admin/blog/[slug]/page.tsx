import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { setPostStatus, setPostFeatured } from "../actions";
import EditPostForm from "./EditPostForm";

export default async function EditBlogPostPage({ params }: { params: { slug: string } }) {
  const supabase = createSupabaseServer();
  const me = await getSessionUser();
  if (!me) redirect("/signin");
  if (!(await isAdmin(me.id))) redirect("/");

  const { data: post } = await supabase
    .from("blog_posts")
    .select("slug, title, excerpt, content, cover_image_url, tags, status, video_url, author_override, featured, published_at")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!post) {
    return (
      <div className="container py-12">
        <h1 className="text-2xl font-bold mb-4">Edit Blog Post</h1>
        <p>Post not found.</p>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Blog Post</h1>
          <p className="text-sm text-muted">
            Status:{" "}
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted uppercase tracking-[0.25em]">
              {post.status}
            </span>
          </p>
          {post.published_at ? (
            <p className="text-xs text-muted">
              Published {new Date(post.published_at).toLocaleString()}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href={`/blog/${post.slug}?preview=1`} className="btn">Preview</a>
          <form action={setPostStatus}>
            <input type="hidden" name="slug" value={post.slug} />
            <input type="hidden" name="redirectTo" value={`/admin/blog/${post.slug}`} />
            {post.status !== "published" ? (
              <button
                name="status"
                value="published"
                className="rounded-full bg-scarlet px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-scarlet/90"
              >
                Publish
              </button>
            ) : (
              <button
                name="status"
                value="draft"
                className="rounded-full border border-app px-3 py-1.5 text-xs font-semibold text-app transition hover:border-scarlet hover:text-scarlet"
              >
                Unpublish
              </button>
            )}
          </form>
          <form action={setPostStatus}>
            <input type="hidden" name="slug" value={post.slug} />
            <input type="hidden" name="redirectTo" value={`/admin/blog/${post.slug}`} />
            {post.status === "archived" ? (
              <button
                name="status"
                value="draft"
                className="rounded-full border border-app px-3 py-1.5 text-xs font-semibold text-app transition hover:border-scarlet hover:text-scarlet"
              >
                Restore
              </button>
            ) : (
              <button
                name="status"
                value="archived"
                className="rounded-full border border-app px-3 py-1.5 text-xs font-semibold text-app transition hover:border-scarlet hover:text-scarlet"
              >
                Archive
              </button>
            )}
          </form>
          <form action={setPostFeatured}>
            <input type="hidden" name="slug" value={post.slug} />
            <button
              name="featured"
              value={post.featured ? "off" : "on"}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                post.featured
                  ? "border border-app text-app hover:border-scarlet hover:text-scarlet"
                  : "bg-scarlet text-white hover:bg-scarlet/90"
              }`}
            >
              {post.featured ? "Unfeature" : "Feature on home"}
            </button>
          </form>
        </div>
      </div>
      <EditPostForm initial={post as any} />
    </div>
  );
}
