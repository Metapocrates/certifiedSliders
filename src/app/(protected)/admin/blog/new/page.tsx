import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import NewPostForm from "./NewPostForm";
import { redirect } from "next/navigation";

export default async function NewBlogPostPage() {
  const supabase = await createSupabaseServer();
  const me = await getSessionUser();
  if (!me) redirect("/signin");
  if (!(await isAdmin(me.id))) redirect("/");

  return (
    <div className="container py-12">
      <h1 className="text-2xl font-bold mb-4">New Blog Post</h1>
      <NewPostForm />
    </div>
  );
}
