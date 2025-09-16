"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid SSR/CSR mismatch by rendering the label only after mount
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "☀️ Light" : "🌙 Dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-md border border-app bg-card px-3 py-1.5 text-sm text-ink hover:bg-bg-muted"
      aria-label="Toggle theme"
    >
      {/* suppress text hydration differences */}
      <span suppressHydrationWarning>{mounted ? label : "🌙 Dark"}</span>
    </button>
  );
}
