import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import EditPostForm from "./EditPostForm";

export default async function EditBlogPostPage({ params }: { params: { slug: string } }) {
  const supabase = createSupabaseServer();
  const me = await getSessionUser();
  if (!me) redirect("/signin");
  if (!(await isAdmin(me.id))) redirect("/");

  const { data: post } = await supabase
    .from("blog_posts")
    .select("slug, title, excerpt, content, cover_image_url, tags, status, video_url, author_override")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!post) {
    return (
      <div className="container py-12">
        <h1 className="text-2xl font-bold mb-4">Edit Blog Post</h1>
        <p>Post not found.</p>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Edit Blog Post</h1>
        <a href={`/blog/${post.slug}?preview=1`} className="btn">Preview</a>
      </div>
      <EditPostForm initial={post as any} />
    </div>
  );
}
