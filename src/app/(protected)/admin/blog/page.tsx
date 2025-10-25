import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { setPostStatus, setPostFeatured } from "./actions";

type Row = {
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  featured: boolean;
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
    .select("slug, title, status, published_at, updated_at, featured")
    .order("published_at", { ascending: false, nullsLast: false })
    .order("updated_at", { ascending: false });

  const drafts = (posts ?? []).filter((p) => p.status === "draft");
  const published = (posts ?? []).filter((p) => p.status === "published");
  const archived = (posts ?? []).filter((p) => p.status === "archived");

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

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">Drafts</p>
            <h2 className="text-lg font-semibold text-app">
              {drafts.length} {drafts.length === 1 ? "draft" : "drafts"} awaiting review
            </h2>
          </div>
        </header>
        <DraftTable rows={drafts} />
      </section>

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">Published</p>
            <h2 className="text-lg font-semibold text-app">
              {published.length} {published.length === 1 ? "story" : "stories"} live
            </h2>
          </div>
        </header>
        <PublishedTable rows={published} />
      </section>

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">Archived</p>
            <h2 className="text-lg font-semibold text-app">
              {archived.length} {archived.length === 1 ? "archive" : "archives"} saved
            </h2>
          </div>
        </header>
        <ArchivedTable rows={archived} />
      </section>
    </div>
  );
}

function DraftTable({ rows }: { rows: Row[] }) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-app bg-muted px-4 py-6 text-sm text-muted shadow-inner">
        No drafts right now. Use “New post” to start a story.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-app">Title</th>
            <th className="px-4 py-3 text-left font-semibold text-app">Last updated</th>
            <th className="px-4 py-3 text-left font-semibold text-app">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((post) => (
            <tr key={post.slug} className="border-t">
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <Link href={`/admin/blog/${post.slug}`} className="font-medium hover:underline">
                    {post.title}
                  </Link>
                  <Link href={`/blog/${post.slug}?preview=1`} className="text-xs text-muted hover:underline">
                    Preview draft
                  </Link>
                </div>
              </td>
              <td className="px-4 py-3">{formatDate(post.updated_at)}</td>
              <td className="px-4 py-3">
                <form action={setPostStatus} className="inline-flex items-center gap-3">
                  <input type="hidden" name="slug" value={post.slug} />
                  <input type="hidden" name="status" value="published" />
                  <button
                    type="submit"
                    className="rounded-full bg-scarlet px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-scarlet/90"
                  >
                    Publish
                  </button>
                  <Link
                    href={`/admin/blog/${post.slug}`}
                    className="rounded-full border border-app px-3 py-1.5 text-xs font-semibold text-app transition hover:border-scarlet hover:text-scarlet"
                  >
                    Edit
                  </Link>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PublishedTable({ rows }: { rows: Row[] }) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-app bg-muted px-4 py-6 text-sm text-muted shadow-inner">
        No published posts yet. Publish a draft when it’s ready.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-app">Title</th>
            <th className="px-4 py-3 text-left font-semibold text-app">Published</th>
            <th className="px-4 py-3 text-left font-semibold text-app">Last updated</th>
            <th className="px-4 py-3 text-left font-semibold text-app">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((post) => (
            <tr key={post.slug} className="border-t">
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <Link href={`/admin/blog/${post.slug}`} className="font-medium hover:underline">
                    {post.title}
                  </Link>
                  <Link href={`/blog/${post.slug}`} className="text-xs text-muted hover:underline">
                    View live
                  </Link>
                  {post.featured ? (
                    <span className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-scarlet/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-scarlet">
                      Featured
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3">{formatDate(post.published_at)}</td>
              <td className="px-4 py-3">{formatDate(post.updated_at)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <form action={setPostStatus}>
                    <input type="hidden" name="slug" value={post.slug} />
                    <input type="hidden" name="status" value="draft" />
                    <button
                      type="submit"
                      className="rounded-full border border-app px-3 py-1.5 text-xs font-semibold text-app transition hover:border-scarlet hover:text-scarlet"
                    >
                      Unpublish
                    </button>
                  </form>
                  <form action={setPostStatus}>
                    <input type="hidden" name="slug" value={post.slug} />
                    <input type="hidden" name="status" value="archived" />
                    <button
                      type="submit"
                      className="rounded-full border border-app px-3 py-1.5 text-xs font-semibold text-app transition hover:border-scarlet hover:text-scarlet"
                    >
                      Archive
                    </button>
                  </form>
                  <form action={setPostFeatured}>
                    <input type="hidden" name="slug" value={post.slug} />
                    <input type="hidden" name="featured" value={post.featured ? "off" : "on"} />
                    <button
                      type="submit"
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        post.featured
                          ? "border border-app text-app hover:border-scarlet hover:text-scarlet"
                          : "bg-scarlet text-white hover:bg-scarlet/90"
                      }`}
                    >
                      {post.featured ? "Unfeature" : "Feature"}
                    </button>
                  </form>
                  <Link
                    href={`/admin/blog/${post.slug}`}
                    className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-app shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Edit
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ArchivedTable({ rows }: { rows: Row[] }) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-app bg-muted px-4 py-6 text-sm text-muted shadow-inner">
        Nothing in the archive. Unpublish a story to move it here.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-app">Title</th>
            <th className="px-4 py-3 text-left font-semibold text-app">Last updated</th>
            <th className="px-4 py-3 text-left font-semibold text-app">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((post) => (
            <tr key={post.slug} className="border-t">
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <Link href={`/admin/blog/${post.slug}`} className="font-medium hover:underline">
                    {post.title}
                  </Link>
                  <span className="text-xs text-muted">Archived</span>
                </div>
              </td>
              <td className="px-4 py-3">{formatDate(post.updated_at)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-3">
                  <form action={setPostStatus}>
                    <input type="hidden" name="slug" value={post.slug} />
                    <input type="hidden" name="status" value="draft" />
                    <button
                      type="submit"
                      className="rounded-full border border-app px-3 py-1.5 text-xs font-semibold text-app transition hover:border-scarlet hover:text-scarlet"
                    >
                      Restore to draft
                    </button>
                  </form>
                  <form action={setPostStatus}>
                    <input type="hidden" name="slug" value={post.slug} />
                    <input type="hidden" name="status" value="published" />
                    <button
                      type="submit"
                      className="rounded-full bg-scarlet px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-scarlet/90"
                    >
                      Publish
                    </button>
                  </form>
                  <Link
                    href={`/admin/blog/${post.slug}`}
                    className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-app shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Edit
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
