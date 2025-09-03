import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";

export default async function MePage() {
  const supabase = createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { data: prof } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (!prof?.username) redirect("/onboarding");
  redirect(`/athletes/${prof.username}#edit`);
}
