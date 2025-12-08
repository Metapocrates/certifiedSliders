import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const revalidate = 600;

type PostRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  tags: string[] | null;
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

function TagBadge({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted/80">
      #{tag}
    </span>
  );
}

export default async function BlogIndex() {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, title, excerpt, cover_image_url, published_at, tags")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });

  if (error) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold">Blog</h1>
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load posts: {error.message}
        </p>
      </div>
    );
  }

  const posts = (data ?? []) as PostRow[];
  const [latest, ...rest] = posts;

  if (!latest) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold">Blog</h1>
        <p className="text-muted">No posts yet. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-16 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">Latest feature</p>
          <h1 className="text-4xl font-semibold text-app">{latest.title}</h1>
          {latest.excerpt ? <p className="text-sm text-muted">{latest.excerpt}</p> : null}
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            <span>{formatDate(latest.published_at)}</span>
            {latest.tags?.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>
          <Link
            href={`/blog/${latest.slug}`}
            className="inline-flex h-11 items-center justify-center rounded-full bg-scarlet px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-scarlet"
          >
            Read article
          </Link>
        </div>
        <div className="overflow-hidden rounded-3xl border border-app bg-card shadow-lg">
          {latest.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={latest.cover_image_url}
              alt={latest.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[240px] flex-col justify-center bg-muted px-6 py-10 text-sm text-muted">
              <p>No cover image yet.</p>
            </div>
          )}
        </div>
      </section>

      {rest.length ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted">More stories</p>
              <h2 className="text-2xl font-semibold text-app">Browse the archive</h2>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <article
                key={post.slug}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-app bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                {post.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    className="h-44 w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-44 w-full bg-muted" />
                )}
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex flex-wrap gap-2 text-xs text-muted">
                    <span>{formatDate(post.published_at)}</span>
                    {post.tags?.map((tag) => (
                      <TagBadge key={`${post.slug}-${tag}`} tag={tag} />
                    ))}
                  </div>
                  <Link href={`/blog/${post.slug}`} className="text-lg font-semibold text-app hover:underline">
                    {post.title}
                  </Link>
                  {post.excerpt ? <p className="text-sm text-muted">{post.excerpt}</p> : null}
                  <span className="text-sm font-semibold text-scarlet">Read more →</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
