export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import SignInForm from "./SignInForm";

export default async function SignInPage() {
  const supabase = supabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) redirect("/me");

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <SignInForm />
    </main>
  );
}
