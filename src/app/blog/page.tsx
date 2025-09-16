import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const revalidate = 300;

// Minimal shape for blog posts
type BlogPost = {
  id: string;
  slug: string;
  title?: string | null;
  excerpt?: string | null;
  cover_url?: string | null;
  published_at?: string | null;
  [key: string]: unknown;
};

export default async function BlogIndexPage() {
  const supabase = createSupabaseServer();
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, slug, title, excerpt, cover_url, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(24);

  if (error) {
    return (
      <div className="container py-12">
        <h1 className="text-2xl font-bold mb-4">Blog</h1>
        <p className="text-red-600">Error: {error.message}</p>
      </div>
    );
  }

  if (!posts?.length) {
    return (
      <div className="container py-12">
        <h1 className="text-2xl font-bold mb-2">Blog</h1>
        <p className="text-gray-600">No posts yet.</p>
      </div>
    );
  }

  const typedPosts: BlogPost[] = posts as unknown as BlogPost[];

  return (
    <div className="container py-12">
      <h1 className="text-2xl font-bold mb-6">Blog</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {typedPosts.map((p: BlogPost) => (
          <Link
            key={p.id}
            href={`/blog/${p.slug}`}
            className="rounded-xl border overflow-hidden block"
          >
            {p.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.cover_url}
                alt={p.title ?? ""}
                className="w-full h-40 object-cover"
              />
            ) : null}
            <div className="p-4">
              <div className="font-semibold">{p.title}</div>
              {p.published_at ? (
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(p.published_at).toLocaleDateString()}
                </div>
              ) : null}
              {p.excerpt ? (
                <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                  {p.excerpt}
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
