import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { setPostStatus } from "@/app/(protected)/admin/blog/actions";
import { TEAM_AUTHOR_NAME } from "@/app/(protected)/admin/blog/constants";

export const revalidate = 600;

type BlogPostRow = {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  tags: string[] | null;
  published_at: string | null;
  video_url: string | null;
  author_override: string | null;
  status: "draft" | "published" | "archived";
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
  const htmlString = typeof raw === "string" ? raw : String(raw);
  return sanitizeHtml(htmlString, {
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
      h1: sanitizeHtml.simpleTransform("h1", {
        class: "mt-12 text-3xl font-semibold text-app",
      }),
      h2: sanitizeHtml.simpleTransform("h2", {
        class: "mt-10 text-2xl font-semibold text-app",
      }),
      h3: sanitizeHtml.simpleTransform("h3", {
        class: "mt-8 text-xl font-semibold text-app",
      }),
      h4: sanitizeHtml.simpleTransform("h4", {
        class: "mt-6 text-lg font-semibold text-app",
      }),
      p: sanitizeHtml.simpleTransform("p", {
        class: "mt-4 text-base leading-relaxed text-app",
      }),
      ul: sanitizeHtml.simpleTransform("ul", {
        class: "mt-5 list-disc space-y-2 pl-6 text-base leading-relaxed text-app",
      }),
      ol: sanitizeHtml.simpleTransform("ol", {
        class: "mt-5 list-decimal space-y-2 pl-6 text-base leading-relaxed text-app",
      }),
      li: sanitizeHtml.simpleTransform("li", {
        class: "leading-relaxed text-app",
      }),
      blockquote: sanitizeHtml.simpleTransform("blockquote", {
        class: "mt-6 border-l-4 border-scarlet/60 bg-muted/60 px-5 py-3 text-base italic text-app",
      }),
      pre: sanitizeHtml.simpleTransform("pre", {
        class:
          "mt-6 overflow-x-auto rounded-2xl border border-app bg-card px-5 py-4 text-sm text-app",
      }),
      code: sanitizeHtml.simpleTransform("code", {
        class: "rounded bg-muted px-1.5 py-0.5 text-sm text-app",
      }),
      img: sanitizeHtml.simpleTransform("img", {
        class: "mt-6 w-full rounded-3xl border border-app object-cover",
        loading: "lazy",
      }),
    },
  });
}

function renderVideo(url: string) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  if (ytMatch) {
    const id = ytMatch[1];
    return (
      <div className="relative overflow-hidden rounded-3xl border border-app bg-black shadow-lg">
        <iframe
          className="aspect-video w-full"
          src={`https://www.youtube.com/embed/${id}`}
          title="Embedded video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (/\.(mp4|webm|ogg)$/i.test(url)) {
    return (
      <video className="w-full rounded-3xl border border-app shadow-lg" controls preload="metadata">
        <source src={url} />
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-scarlet hover:underline">
          Watch video
        </a>
      </video>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-app px-4 py-2 text-sm font-semibold text-app transition hover:border-scarlet hover:text-scarlet"
    >
      Watch video →
    </a>
  );
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
      "slug, title, excerpt, content, cover_image_url, tags, published_at, status, video_url, author_override, author:profiles!blog_posts_author_id_fkey(full_name, username)"
    )
    .eq("slug", params.slug)
    .limit(1);

  if (!previewAllowed) {
    query = query.eq("status", "published").lte("published_at", new Date().toISOString());
  }

  const { data, error } = await query.limit(1).maybeSingle();

  if (error || !data) {
    notFound();
  }

  const post: BlogPostRow = {
    slug: data.slug,
    title: data.title,
    excerpt: data.excerpt ?? null,
    content: data.content,
    cover_image_url: data.cover_image_url ?? null,
    tags: (data.tags ?? []) as string[] | null,
    published_at: data.published_at ?? null,
    status: data.status as BlogPostRow["status"],
    video_url: data.video_url ?? null,
    author_override: data.author_override ?? null,
    author: data.author ?? null,
  };
  const html = renderMarkdown(post.content);
  const authorDisplay = post.author_override
    ? post.author_override
    : post.author?.full_name || post.author?.username || TEAM_AUTHOR_NAME;
  const authorLink = !post.author_override && post.author?.username ? `/athletes/${post.author.username}` : null;
  const videoEmbed = post.video_url ? renderVideo(post.video_url) : null;

  const previewControls = previewAllowed ? (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-app bg-card px-4 py-3 text-sm shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Preview controls</span>
      <Link
        href={`/admin/blog/${post.slug}`}
        className="rounded-full border border-app px-3 py-1.5 text-sm font-semibold text-app transition hover:border-scarlet hover:text-scarlet"
      >
        Edit in admin
      </Link>
      <form action={setPostStatus}>
        <input type="hidden" name="slug" value={post.slug} />
        <input
          type="hidden"
          name="redirectTo"
          value={`/blog/${post.slug}?preview=1`}
        />
        <div className="flex flex-wrap items-center gap-3">
          {post.status !== "published" ? (
            <button
              name="status"
              value="published"
              className="rounded-full bg-scarlet px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-scarlet/90"
            >
              Publish now
            </button>
          ) : null}

          {post.status === "published" ? (
            <button
              name="status"
              value="draft"
              className="rounded-full border border-app px-3 py-1.5 text-sm font-semibold text-app transition hover:border-scarlet hover:text-scarlet"
            >
              Unpublish
            </button>
          ) : null}

          {post.status !== "archived" ? (
            <button
              name="status"
              value="archived"
              className="rounded-full border border-app px-3 py-1.5 text-sm font-semibold text-app transition hover:border-scarlet hover:text-scarlet"
            >
              Archive
            </button>
          ) : null}

          {post.status === "archived" ? (
            <button
              name="status"
              value="draft"
              className="rounded-full border border-app px-3 py-1.5 text-sm font-semibold text-app transition hover:border-scarlet hover:text-scarlet"
            >
              Restore to draft
            </button>
          ) : null}
        </div>
      </form>
    </div>
  ) : null;

  return (
    <article className="mx-auto max-w-3xl space-y-10 px-4 pb-24 pt-12 sm:px-6 lg:px-8">
      {previewControls}
      <header className="space-y-6">
        <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-muted">
          <span>Certified Sliders Blog</span>
          {previewAllowed && post.status !== "published" ? (
            <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-900">
              {post.status === "draft" ? "Draft" : "Archived"}
            </span>
          ) : null}
        </div>
        <h1 className="text-4xl font-semibold text-app">{post.title}</h1>
        {post.excerpt ? <p className="text-sm text-muted">{post.excerpt}</p> : null}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          <span>
            By{" "}
            {authorLink ? (
              <Link href={authorLink} className="font-semibold text-app hover:underline">
                {authorDisplay}
              </Link>
            ) : (
              <span className="font-semibold text-app">{authorDisplay}</span>
            )}
          </span>
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
            loading="eager"
            className="w-full rounded-3xl border border-app object-cover shadow-lg"
          />
        ) : null}
        {videoEmbed}
      </header>

      <section
        className="space-y-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
