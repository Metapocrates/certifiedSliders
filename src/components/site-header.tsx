import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--background),white_2%)]/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="text-base font-semibold tracking-tight">Certified Sliders</Link>
        <nav className="hidden gap-6 sm:flex">
          <Link href="/blog" className="subtle hover:underline">Blog</Link>
          <Link href="/rankings" className="subtle hover:underline">Rankings</Link>
          <Link href="/athletes" className="subtle hover:underline">Athletes</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/submit"><Button className="hidden sm:inline-flex">Submit Result</Button></Link>
          <Link href="/search"><Button variant="ghost">Search</Button></Link>
        </div>
      </div>
    </header>
  );
}
