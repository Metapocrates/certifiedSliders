import Link from "next/link";
import { getSanity } from "@/lib/sanity.client";
import { articleListQuery } from "@/lib/sanity.queries";

export const revalidate = 300;

type Row = {
  slug: string;
  title: string;
  excerpt?: string | null;
  premium?: boolean | null;
  publishedAt?: string | null;
};

export default async function BlogIndex() {
  const client = getSanity();

  if (!client) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Blog</h1>
        <p className="text-gray-600">Coming soon. Headless CMS not configured yet.</p>
      </div>
    );
  }

  let rows: Row[] = [];
  try {
    rows = (await client.fetch(articleListQuery)) as Row[];
  } catch (e: any) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Blog</h1>
        <p className="text-red-600 text-sm">Failed to fetch articles: {e?.message ?? "Unknown error"}</p>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Blog</h1>
        <p className="text-gray-600">No posts yet.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Blog</h1>
      <ul className="space-y-4">
        {rows.map((p) => (
          <li key={p.slug} className="rounded-xl border p-4">
            <Link className="text-lg font-semibold underline" href={`/blog/${p.slug}`}>
              {p.title} {p.premium ? "🔒" : ""}
            </Link>
            {p.excerpt ? <p className="text-sm text-gray-600 mt-1">{p.excerpt}</p> : null}
            {p.publishedAt ? (
              <p className="text-xs text-gray-500 mt-2">{new Date(p.publishedAt).toLocaleDateString()}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
