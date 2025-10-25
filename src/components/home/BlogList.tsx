// src/components/home/BlogList.tsx
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";

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

export default async function BlogList() {
  const supabase = createSupabaseServer();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_image_url, published_at, featured")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(5);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Couldn’t load blog posts: {error.message}
      </div>
    );
  }

const posts: BlogCard[] = (data ?? []) as BlogCard[];
if (!posts.length) {
    return (
      <div className="rounded-2xl border border-app bg-muted px-4 py-6 text-sm text-muted shadow-inner">
        No articles yet. We publish new stories soon.
      </div>
    );
  }

  const primary = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p.id !== primary.id).slice(0, 4);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-stretch">
        <Link
          href={`/blog/${primary.slug}`}
          className="relative overflow-hidden rounded-3xl border border-app shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
        >
          <div
            className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/30 to-transparent"
            aria-hidden="true"
          />
          {primary.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primary.cover_image_url}
              alt={primary.title ?? "Featured blog post"}
              onError={(e) => {
                if (e.currentTarget.dataset.fallback === "1") return;
                e.currentTarget.dataset.fallback = "1";
                e.currentTarget.src = "/brand/logo.png";
                e.currentTarget.classList.add("object-contain", "p-10", "bg-white");
              }}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#C8102E]" />
          )}
          <div className="relative flex h-full flex-col justify-end gap-4 p-8 text-white">
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-white/70">
              <span>Featured story</span>
              <span>•</span>
              <span>{formatDate(primary.published_at)}</span>
            </div>
            <h3 className="text-2xl font-semibold leading-tight">
              {primary.title ?? "Untitled story"}
            </h3>
            {primary.excerpt ? (
              <p className="text-sm text-white/80 line-clamp-3">{primary.excerpt}</p>
            ) : null}
            <span className="text-sm font-semibold text-[#F5C518]">Read story →</span>
          </div>
        </Link>

        {rest.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {rest.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-3xl border border-app bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                {post.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.cover_image_url}
                    alt={post.title ?? ""}
                    className="h-36 w-full object-cover transition duration-500 group-hover:scale-105"
                    onError={(e) => {
                      if (e.currentTarget.dataset.fallback === "1") return;
                      e.currentTarget.dataset.fallback = "1";
                      e.currentTarget.src = "/brand/logo.png";
                      e.currentTarget.classList.add("object-contain", "p-6", "bg-white");
                    }}
                  />
                ) : (
                  <div className="h-36 w-full bg-muted" />
                )}
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="text-xs uppercase tracking-[0.3em] text-muted">
                    {formatDate(post.published_at)}
                  </div>
                  <h4 className="text-lg font-semibold text-app line-clamp-2">
                    {post.title ?? "Untitled story"}
                  </h4>
                  {post.excerpt ? (
                    <p className="text-sm text-muted line-clamp-3">{post.excerpt}</p>
                  ) : null}
                  <span className="text-sm font-semibold text-scarlet">Read more →</span>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Link
          href="/blog"
          className="inline-flex h-11 items-center justify-center rounded-full border border-app px-6 text-sm font-semibold text-app transition hover:border-scarlet hover:text-scarlet"
        >
          View all posts
        </Link>
      </div>
    </div>
  );
}
