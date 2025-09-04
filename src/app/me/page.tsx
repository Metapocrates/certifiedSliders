import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";

export const dynamic = "force-dynamic";       // don't cache a signed-out version
export const revalidate = 0;                  // belt-and-suspenders

export default async function MePage() {
  const supabase = createSupabaseServer();

  // Server-side: read session from cookies
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Find my profile username
  const { data: prof, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="container py-12">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="mt-3 text-red-600">Error: {error.message}</p>
      </div>
    );
  }

  if (!prof?.username) {
    // Fallback: show something rather than looping
    return (
      <div className="container py-12">
        <h1 className="text-2xl font-bold">Complete your profile</h1>
        <p className="mt-3">We couldn’t find a username on your profile record.</p>
        <p className="mt-2">Once you set it, this page will send you to your public profile.</p>
      </div>
    );
  }

  redirect(`/athletes/${prof.username}`);
}
