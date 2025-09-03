import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { mdToHtml } from "@/lib/markdown";

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const supabase = createSupabaseServer();

  const me = await getSessionUser();
  const admin = me ? await isAdmin(me.id) : false;
  const preview =
    (Array.isArray(searchParams?.preview)
      ? searchParams?.preview[0]
      : searchParams?.preview) === "1";

  const { data: post } = await supabase
    .from("posts")
    .select("title, content, cover_url, published_at, status")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!post) return notFound();
  if (post.status !== "published" && !(admin && preview)) return notFound();

  const html = mdToHtml(post.content ?? "");

  return (
    <div className="container py-12">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      {post.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_url}
          alt=""
          className="w-full h-64 object-cover rounded-xl mt-4"
        />
      ) : null}
      <article
        className="prose max-w-none mt-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
