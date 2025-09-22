"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const current = theme === "system" ? systemTheme : theme;
  const isDark = current === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      className="rounded-md border px-2 py-1 text-sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Switch to light" : "Switch to dark"}
    >
      {isDark ? "🌙" : "☀️"}
    </button>
  );
}
