import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-muted/40">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* About */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-display text-lg">CERTIFIED SLIDERS</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The premier platform for HS track &amp; field athletes to showcase verified results and connect with college coaches.
            </p>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Resources
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <FooterLink href="/guides">Guides</FooterLink>
              <FooterLink href="/faq">FAQs</FooterLink>
              <FooterLink href="/rankings">Rankings</FooterLink>
            </ul>
          </div>

          {/* How To */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              How To
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <FooterLink href="/guides/claim-profile">Claim Profile</FooterLink>
              <FooterLink href="/guides/submit-result">Submit a Result</FooterLink>
              <FooterLink href="/guides/verify-profile">Verify Profile</FooterLink>
              <FooterLink href="/guides/star-ratings">Star Ratings</FooterLink>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Legal
            </h4>
            <ul className="mt-3 space-y-2 text-sm">
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/terms">Terms of Service</FooterLink>
              <FooterLink href="/blog">Blog</FooterLink>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          &copy; {currentYear} Certified Sliders. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-muted-foreground transition hover:text-foreground">
        {children}
      </Link>
    </li>
  );
}
