import { notFound } from "next/navigation";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";

export const revalidate = 600;

type BlogPostRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  tags: string[] | null;
  published_at: string | null;
  status: "draft" | "published";
  author: {
    full_name: string | null;
    username: string | null;
  } | null;
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

function renderMarkdown(md: string) {
  const raw = marked.parse(md, { gfm: true, breaks: true });
  return sanitizeHtml(raw, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "h3",
      "h4",
      "blockquote",
      "pre",
      "code",
      "figure",
      "figcaption",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title", "width", "height", "loading"],
      a: ["href", "name", "target", "rel"],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  });
}

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { preview?: string };
}) {
  const supabase = createSupabaseServer();
  const previewRequested = searchParams?.preview === "1";

  let previewAllowed = false;
  if (previewRequested) {
    const sessionUser = await getSessionUser();
    if (sessionUser && (await isAdmin(sessionUser.id))) {
      previewAllowed = true;
    }
  }

  let query = supabase
    .from("blog_posts")
    .select(
      "slug, title, excerpt, content, cover_image_url, tags, published_at, status, author:profiles!blog_posts_author_id_fkey(full_name, username)"
    )
    .eq("slug", params.slug)
    .limit(1);

  if (!previewAllowed) {
    query = query.eq("status", "published").lte("published_at", new Date().toISOString());
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    notFound();
  }

  const post = data as BlogPostRow;
  const html = renderMarkdown(post.content);

  return (
    <article className="mx-auto max-w-3xl space-y-10 px-4 pb-24 pt-12 sm:px-6 lg:px-8">
      <header className="space-y-6">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted">
          <span>Certified Sliders Blog</span>
          {previewAllowed && post.status === "draft" ? (
            <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-900">
              Preview
            </span>
          ) : null}
        </div>
        <h1 className="text-4xl font-semibold text-app">{post.title}</h1>
        <p className="text-sm text-muted">{post.excerpt}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          {post.author ? (
            <span>
              By{" "}
              {post.author.username ? (
                <a href={`/athletes/${post.author.username}`} className="font-semibold text-app hover:underline">
                  {post.author.full_name ?? post.author.username}
                </a>
              ) : (
                <span className="font-semibold text-app">{post.author.full_name ?? "Certified Sliders"}</span>
              )}
            </span>
          ) : null}
          <span>{formatDate(post.published_at)}</span>
          {post.tags?.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted/80"
            >
              #{tag}
            </span>
          ))}
        </div>
        {post.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="w-full rounded-3xl border border-app object-cover"
          />
        ) : null}
      </header>

      <section
        className="prose prose-lg prose-slate max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
