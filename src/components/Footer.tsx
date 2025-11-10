import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="font-semibold mb-3">Certified Sliders</h3>
            <p className="text-sm text-muted-foreground">
              The premier platform for track & field athletes to showcase verified results and connect with college programs.
            </p>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-3">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/guides" className="text-muted-foreground hover:text-foreground">
                  Guides
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-muted-foreground hover:text-foreground">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="/rankings" className="text-muted-foreground hover:text-foreground">
                  Rankings
                </Link>
              </li>
            </ul>
          </div>

          {/* How To */}
          <div>
            <h3 className="font-semibold mb-3">How To</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/guides/claim-profile" className="text-muted-foreground hover:text-foreground">
                  Claim Your Profile
                </Link>
              </li>
              <li>
                <Link href="/guides/submit-result" className="text-muted-foreground hover:text-foreground">
                  Submit a Result
                </Link>
              </li>
              <li>
                <Link href="/guides/verify-profile" className="text-muted-foreground hover:text-foreground">
                  Verify Your Profile
                </Link>
              </li>
              <li>
                <Link href="/guides/star-ratings" className="text-muted-foreground hover:text-foreground">
                  Star Ratings
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-muted-foreground hover:text-foreground">
                  Blog
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/anthropics/claude-code/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Report Issue
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          <p>
            &copy; {currentYear} Certified Sliders. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
