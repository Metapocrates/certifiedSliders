// src/components/home/BlogList.tsx
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";
import BlogCover from "@/components/home/BlogCover";

type BlogCard = {
  id: string;
  slug: string;
  title: string | null;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  featured: boolean;
};

function formatDate(iso: string | null) {
  if (!iso) return "--";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "--";
  }
}

export default async function BlogList() {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_image_url, published_at, featured")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(5);

  // If the table doesn't exist or no posts, render nothing
  if (error || !data?.length) {
    return null;
  }

  const posts: BlogCard[] = data as BlogCard[];

  const primary = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p.id !== primary.id).slice(0, 4);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-stretch">
        <Link
          href={`/blog/${primary.slug}`}
          className="relative min-h-[320px] overflow-hidden rounded-3xl border border-border shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
        >
          <div className="absolute inset-0" aria-hidden="true">
            <div className="relative h-full w-full">
              <BlogCover
                src={primary.cover_image_url}
                alt={primary.title ?? "Featured blog post"}
                fill
                fallbackClassName="p-10"
              />
            </div>
          </div>
          <div
            className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/40 to-transparent pointer-events-none"
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full flex-col justify-end gap-4 p-8 text-white">
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-white/70">
              <span>Featured story</span>
              <span>&bull;</span>
              <span>{formatDate(primary.published_at)}</span>
            </div>
            <h3 className="text-2xl font-semibold leading-tight">
              {primary.title ?? "Untitled story"}
            </h3>
            {primary.excerpt ? (
              <p className="text-sm text-white/80 line-clamp-3">{primary.excerpt}</p>
            ) : null}
            <span className="text-sm font-semibold text-accent">Read story &rarr;</span>
          </div>
        </Link>

        {rest.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {rest.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-36 w-full">
                  <BlogCover
                    src={post.cover_image_url}
                    alt={post.title ?? ""}
                    fill
                    fallbackClassName="p-6"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {formatDate(post.published_at)}
                  </div>
                  <h4 className="text-lg font-semibold text-foreground line-clamp-2">
                    {post.title ?? "Untitled story"}
                  </h4>
                  {post.excerpt ? (
                    <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                  ) : null}
                  <span className="text-sm font-semibold text-primary">Read more &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Link
          href="/blog"
          className="inline-flex h-11 items-center justify-center rounded-full border border-border px-6 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
        >
          View all posts
        </Link>
      </div>
    </div>
  );
}
