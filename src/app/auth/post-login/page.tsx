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
        // Brief delay to ensure cookies are fully set from OAuth callback
        await new Promise(resolve => setTimeout(resolve, 300));

        // Get redirect destination from API with timeout
        const next = searchParams.get("next");
        const redirectUrl = next ? `/auth/post-login/redirect?next=${encodeURIComponent(next)}` : "/auth/post-login/redirect";

        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(redirectUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          console.error("Post-login redirect API error:", response.status);
          window.location.href = "/me";
          return;
        }

        const data = await response.json();
        let destination = data.redirectTo || "/me";

        // CRITICAL: Prevent redirect loop by never redirecting back to /auth/post-login
        if (destination === "/auth/post-login" || destination.startsWith("/auth/post-login?")) {
          console.warn("Prevented redirect loop - destination was /auth/post-login, using /me instead");
          destination = "/me";
        }

        setStatus("Redirecting...");

        // Use window.location for more reliable navigation
        window.location.href = destination;
      } catch (error) {
        console.error("Post-login error:", error);
        // If timeout or other error, default to /me
        window.location.href = "/me";
      }
    };

    handlePostLogin();
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
