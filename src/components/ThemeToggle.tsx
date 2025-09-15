"use client";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-md border border-app bg-card px-3 py-1.5 text-sm text-ink hover:bg-bg-muted"
      aria-label="Toggle theme"
      type="button"
    >
      {isDark ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
