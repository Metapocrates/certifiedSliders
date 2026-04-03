// src/app/auth/post-login/page.tsx
// Client-side post-login page that retries until the server session is available
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

const MAX_REDIRECT_ATTEMPTS = 6;
const REDIRECT_RETRY_DELAY_MS = 350;

function getSafeDestination(destination?: string | null) {
  if (!destination || destination === "/auth/post-login" || destination.startsWith("/auth/post-login?")) {
    return "/me";
  }

  return destination;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncServerSession() {
  const sb = supabaseBrowser();
  const { data: sessionData } = await sb.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const refreshToken = sessionData.session?.refresh_token;

  if (!accessToken || !refreshToken) {
    return false;
  }

  const response = await fetch("/auth/callback", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
    }),
  });

  return response.ok;
}

export default function PostLoginPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Completing sign in...");

  useEffect(() => {
    let cancelled = false;

    const handlePostLogin = async () => {
      const next = searchParams.get("next");
      const redirectUrl = next
        ? `/auth/post-login/redirect?next=${encodeURIComponent(next)}`
        : "/auth/post-login/redirect";

      for (let attempt = 1; attempt <= MAX_REDIRECT_ATTEMPTS; attempt += 1) {
        if (cancelled) return;

        setStatus(attempt === 1 ? "Completing sign in..." : "Finishing sign in...");
        await syncServerSession();

        const response = await fetch(
          `${redirectUrl}${redirectUrl.includes("?") ? "&" : "?"}attempt=${attempt}`,
          {
            credentials: "include",
            cache: "no-store",
            headers: { "cache-control": "no-store" },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const destination = getSafeDestination(data.redirectTo);

          if (!cancelled) {
            setStatus("Redirecting...");
            window.location.replace(destination);
          }
          return;
        }

        if (response.status !== 401) {
          break;
        }

        await wait(REDIRECT_RETRY_DELAY_MS * attempt);
      }

      const { data: sessionData } = await supabaseBrowser().auth.getSession();
      const fallbackDestination = sessionData.session
        ? getSafeDestination(searchParams.get("next") || "/me")
        : "/login";

      if (!cancelled) {
        window.location.replace(fallbackDestination);
      }
    };

    handlePostLogin().catch(async (error) => {
      console.error("Post-login error:", error);
      const { data: sessionData } = await supabaseBrowser().auth.getSession();

      if (!cancelled) {
        window.location.replace(sessionData.session ? getSafeDestination(searchParams.get("next") || "/me") : "/login");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-scarlet border-t-transparent mx-auto" />
        <p className="text-muted">{status}</p>
      </div>
    </div>
  );
}
