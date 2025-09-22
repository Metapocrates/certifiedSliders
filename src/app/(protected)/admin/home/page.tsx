import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import FeaturedForm from "./FeaturedForm";
import NewsForm from "./NewsForm";
import NewsListClient from "./NewsListClient";

export default async function AdminHomeManager() {
  const supabase = createSupabaseServer();
  const me = await getSessionUser();
  if (!me) redirect("/signin");
  if (!(await isAdmin(me.id))) redirect("/");

  // Current featured (if any)
  const { data: feat } = await supabase
    .from("featured_profiles")
    .select("profile_id")
    .maybeSingle();

  let currentUsername: string | null = null;
  if (feat?.profile_id) {
    const { data: p } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", feat.profile_id)
      .maybeSingle();
    currentUsername = p?.username ?? null;
  }

  // Latest news
  const { data: news } = await supabase
    .from("news_items")
    .select("id, title, url, source, published_at")
    .order("published_at", { ascending: false })
    .limit(12);

  return (
    <div className="container py-12 space-y-6">
      <h1 className="text-2xl font-bold">Home Content</h1>

      <FeaturedForm currentUsername={currentUsername} />

      <div className="grid gap-6 md:grid-cols-2">
        <NewsForm />
        <NewsListClient items={news || []} />
      </div>
    </div>
  );
}
