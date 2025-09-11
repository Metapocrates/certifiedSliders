export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Helper: server-scoped client that can write cookies in a Server Action
function serverClientForActions() {
  const cookieStore = cookies();

  const get = (name: string) => cookieStore.get(name)?.value;
  const set = (name: string, value: string, options: CookieOptions) => {
    cookieStore.set({ name, value, ...options });
  };
  const remove = (name: string, options: CookieOptions) => {
    cookieStore.set({ name, value: "", ...options, maxAge: 0 });
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createServerClient(url, anon, { cookies: { get, set, remove } });
}

// ✅ Server Action: runs on the server, sets cookies, then redirects.
async function signInAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const supabase = serverClientForActions();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Redirect back with a query param so we can show the error
    redirect(`/signin?error=${encodeURIComponent(error.message)}`);
  }
  // Cookie is already written on the server — go straight to /me
  redirect("/me");
}

import { supabaseServer } from "@/lib/supabase/server";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  // If already signed in, bounce to /me
  const { data: { session } } = await supabaseServer().auth.getSession();
  if (session) redirect("/me");

  const err = searchParams?.error;

  return (
    <main className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      {err ? (
        <p className="text-sm text-red-600">Error: {err}</p>
      ) : (
        <p className="text-sm text-gray-600">Use your email and password.</p>
      )}

      {/* Pure server form; no client component needed */}
      <form action={signInAction} className="grid gap-3" noValidate>
        <label className="grid gap-1">
          <span className="text-sm font-medium">Email</span>
          <input
            name="email"
            type="email"
            className="input"
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium">Password</span>
          <input
            name="password"
            type="password"
            className="input"
            placeholder="••••••••"
            required
          />
        </label>

        <button type="submit" className="btn">Sign in</button>
      </form>
    </main>
  );
}
