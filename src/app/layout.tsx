import './globals.css';
import type { Metadata } from 'next';
import SiteHeader from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Certified Sliders',
  description: 'Track & Field blog and rankings',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SiteHeader />
        <main className="container py-10">{children}</main>
        <footer className="border-t border-[var(--border)] mt-12">
          <div className="container py-8 text-sm subtle">
            © {new Date().getFullYear()} Certified Sliders • Track &amp; Field
          </div>
        </footer>
      </body>
    </html>
  );
}
