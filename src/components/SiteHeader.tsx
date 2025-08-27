// src/components/SiteHeader.tsx
// ──────────────────────────────────────────────────────────────────────────────
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import SignInOutButton from "@/components/auth/SignInOutButton";

export async function SiteHeader() {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="font-semibold tracking-tight">Certified Sliders</Link>
        <nav className="ml-auto flex items-center gap-4 text-sm">
          <Link href="/submit-result" className="hover:underline">Submit Result</Link>
          {user ? (
            <Link href="/me" className="hover:underline">Me</Link>
          ) : null}
          <SignInOutButton />
        </nav>
      </div>
    </header>
  );
}
