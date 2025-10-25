// src/components/home/BlogList.tsx
// Server component
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";

// Minimal shape for blog cards
type BlogCard = {
  id: string;
  slug: string;
  title?: string | null;
  excerpt?: string | null;
  cover_image_url?: string | null;
  published_at?: string | null;
  [key: string]: unknown;
};

export default async function BlogList() {
  const supabase = createSupabaseServer();

  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title, excerpt, cover_image_url, published_at")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(3);

  if (error) {
    return (
      <div className="p-4 rounded-xl border">
        <h3 className="font-semibold mb-2">Blog</h3>
        <p className="text-sm text-red-600">Error: {error.message}</p>
      </div>
    );
  }

  if (!posts?.length) {
    return (
      <div className="p-4 rounded-xl border">
        <h3 className="font-semibold mb-2">Blog</h3>
        <p className="text-sm text-gray-600">No posts yet.</p>
      </div>
    );
  }

  const typedPosts: BlogCard[] = posts as unknown as BlogCard[];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Blog</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {typedPosts.map((p: BlogCard) => (
          <Link
            key={p.id}
            href={`/blog/${p.slug}`}
            className="rounded-xl border overflow-hidden"
          >
            {p.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.cover_image_url} alt={p.title ?? ""} className="w-full h-32 object-cover" />
            ) : null}
            <div className="p-3">
              <div className="font-medium">{p.title}</div>
              {p.excerpt ? (
                <p className="text-sm text-gray-600 mt-1">{p.excerpt}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
      <div>
        <Link href="/blog" className="btn">View all posts</Link>
      </div>
    </div>
  );
}
