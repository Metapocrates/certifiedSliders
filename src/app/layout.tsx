// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "Certified Sliders",
  description: "HS T&F rankings",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png" }]
  },
  manifest: "/site.webmanifest",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side session + admin check
  const supabase = createSupabaseServer();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user ?? null;

  let isAdmin = false;
  if (user?.id) {
    const { data: adminRow } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    isAdmin = Boolean(adminRow?.user_id);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-app text-app">
        {/* Theming provider: toggles `dark` class on <html> */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Header receives props; no client fetching */}
          <SiteHeader isAdmin={isAdmin} signedIn={!!user} />

          {/* Separation bar (brand accent) */}
          <div className="border-b-4 border-accent" />

          {/* Page content */}
          <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
