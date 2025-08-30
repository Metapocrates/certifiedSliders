import './globals.css';
import type { Metadata } from 'next';
import Header from '@/components/Header';

export const metadata = {
  title: "Certified Sliders",
  description: "Track & Field rankings and athlete profiles",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Certified Sliders",
    description: "Track & Field rankings and athlete profiles",
    url: "/",
    siteName: "Certified Sliders",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Certified Sliders",
    description: "Track & Field rankings and athlete profiles",
  },
  alternates: {
    canonical: "/",
  },
} satisfies import("next").Metadata;


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <Header />
        {children}
      </body>
    </html>
  );
}
