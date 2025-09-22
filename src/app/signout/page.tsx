"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function SignoutPage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      // Browser Supabase client (NEXT_PUBLIC_* envs must be set)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // 1) Clear client session (localStorage)
      await supabase.auth.signOut().catch(() => {});

      // 2) Clear server cookies
      await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});

      // 3) Redirect + refresh so the header re-evaluates auth state
      router.replace("/");
      router.refresh();
    };
    run();
  }, [router]);

  return <div className="container py-10 text-sm opacity-70">Signing you out…</div>;
}
