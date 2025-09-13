"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client";

export default function AuthListener() {
  const router = useRouter();
  const syncingRef = useRef(false);

  // Only sync cookies for these events. Ignore INITIAL_SESSION.
  const EVENTS_TO_SYNC = new Set([
    "SIGNED_IN",
    "SIGNED_OUT",
    "TOKEN_REFRESHED",
    "USER_UPDATED",
  ]);

  async function syncServerCookie() {
    if (syncingRef.current) return;     // de-dupe bursts
    syncingRef.current = true;
    try {
      await fetch("/auth/callback", { method: "POST" });
      router.refresh();
    } finally {
      // small delay to prevent thrash on rapid refresh events
      setTimeout(() => { syncingRef.current = false; }, 500);
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event) => {
        if (EVENTS_TO_SYNC.has(event)) {
          await syncServerCookie();
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
