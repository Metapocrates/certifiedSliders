// src/app/(protected)/hs/portal/create-team/page.tsx
import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import CreateTeamForm from "@/components/hs-portal/CreateTeamForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CreateTeamPage() {
  const supabase = await createSupabaseServer();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/hs/portal/create-team");
  }

  // Check if user is HS coach
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();

  if (!profile || profile.user_type !== "hs_coach") {
    redirect("/me");
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-app">Create Your Team</h1>
        <p className="text-muted-foreground">
          Set up your high school track & field team profile
        </p>
      </div>

      <div className="rounded-xl border border-app bg-card p-6">
        <CreateTeamForm />
      </div>
    </div>
  );
}
