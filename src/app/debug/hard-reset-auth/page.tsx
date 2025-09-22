"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function HardResetAuth() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // Clear client session/localStorage/IndexedDB
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        await supabase.auth.signOut().catch(() => {});

        // Also clear server cookies
        await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});

        // Nuke any lingering 'sb-*' keys if present
        try {
          Object.keys(localStorage)
            .filter((k) => k.startsWith("sb-"))
            .forEach((k) => localStorage.removeItem(k));
        } catch {}
        // IndexedDB cleanup is handled by supabase.auth.signOut()
      } finally {
        router.replace("/");
        router.refresh();
      }
    })();
  }, [router]);

  return <div className="container py-10 text-sm opacity-70">Resetting auth…</div>;
}
