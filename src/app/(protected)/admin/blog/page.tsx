import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";

type Row = {
  slug: string;
  title: string;
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default async function AdminBlogIndex() {
  const supabase = createSupabaseServer();
  const me = await getSessionUser();
  if (!me) redirect("/signin");
  if (!(await isAdmin(me.id))) redirect("/");

  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("slug, title, status, published_at, updated_at")
    .order("status", { ascending: true })
    .order("published_at", { ascending: false, nullsLast: false })
    .order("updated_at", { ascending: false });

  return (
    <div className="container py-12 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog posts</h1>
          <p className="text-sm text-muted">
            Draft and publish long-form articles for the Certified Sliders blog.
          </p>
        </div>
        <Link href="/admin/blog/new" className="btn">
          New post
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load posts: {error.message}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-app">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-app">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-app">Published</th>
              <th className="px-4 py-3 text-left font-semibold text-app">Last updated</th>
            </tr>
          </thead>
          <tbody>
            {!posts?.length ? (
              <tr>
                <td className="px-4 py-6 text-center text-muted" colSpan={4}>
                  No posts yet. Start by creating your first article.
                </td>
              </tr>
            ) : (
              posts.map((post: Row) => (
                <tr key={post.slug} className="border-t">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <Link href={`/admin/blog/${post.slug}`} className="font-medium hover:underline">
                        {post.title}
                      </Link>
                      <Link
                        href={`/blog/${post.slug}${post.status === "draft" ? "?preview=1" : ""}`}
                        className="text-xs text-muted hover:underline"
                      >
                        {post.status === "draft" ? "Preview draft" : "View live"}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        post.status === "published"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {post.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatDate(post.published_at)}</td>
                  <td className="px-4 py-3">{formatDate(post.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
