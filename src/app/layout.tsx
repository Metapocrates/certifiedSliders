// src/app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/SiteHeader";
import { createSupabaseServer } from "@/lib/supabase/compat";
import Providers from "@/components/Providers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SUPABASE_SITE_URL ?? "https://certifiedsliders.vercel.app"),
  title: {
    default: "Certified Sliders",
    template: "%s – Certified Sliders",
  },
  description: "HS Track & Field rankings and verified results.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png" }]
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    url: "/",
    title: "Certified Sliders",
    description: "HS Track & Field rankings and verified results.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Certified Sliders" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Certified Sliders",
    description: "HS Track & Field rankings and verified results.",
    images: ["/og.png"],
  },
  // ⛔️ remove themeColor from here
};

// ✅ NEW: move themeColor to viewport export
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf0e6" },
    { media: "(prefers-color-scheme: dark)",  color: "#1c1c1c" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
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
        <Providers>
          <SiteHeader />
          <div className="border-b-4 border-accent" />
          <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
