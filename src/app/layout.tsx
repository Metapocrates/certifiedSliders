// src/app/layout.tsx
import "./globals.css"; // ← this loads Tailwind base/components/utilities
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import AuthListener from "@/components/AuthListener";

export const metadata: Metadata = {
  title: "Certified Sliders",
  description: "Rankings and verified results for high school track & field.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <SiteHeader />
        <AuthListener />
        <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
