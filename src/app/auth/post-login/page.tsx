// src/app/auth/post-login/page.tsx
// Client-side post-login page that forces router refresh before redirect
"use client";

import { useEffect, useState, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PostLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Completing sign in...");

  useEffect(() => {
    const handlePostLogin = async () => {
      try {
        // Force refresh to pick up new auth state in server components
        // Use startTransition to avoid blocking UI
        startTransition(() => {
          router.refresh();
        });

        // Longer delay to ensure cookies are fully set
        await new Promise(resolve => setTimeout(resolve, 300));

        // Get redirect destination from API
        const next = searchParams.get("next");
        const redirectUrl = next ? `/auth/post-login/redirect?next=${encodeURIComponent(next)}` : "/auth/post-login/redirect";

        const response = await fetch(redirectUrl);

        if (!response.ok) {
          console.error("Post-login redirect API error:", response.status);
          window.location.href = "/me";
          return;
        }

        const data = await response.json();
        const destination = data.redirectTo || "/me";

        setStatus("Redirecting...");

        // Use window.location for more reliable navigation
        window.location.href = destination;
      } catch (error) {
        console.error("Post-login error:", error);
        window.location.href = "/me";
      }
    };

    handlePostLogin();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-scarlet border-t-transparent mx-auto" />
        <p className="text-muted">{status}</p>
      </div>
    </div>
  );
}
