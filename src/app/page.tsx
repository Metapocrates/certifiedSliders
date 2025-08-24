// src/app/page.tsx
import { Section } from "@/components/section";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import NewsMergedGrid from "@/components/news-merged-grid";

export default function Home() {
  return (
    <div className="grid gap-10">
      {/* Hero */}
      <section className="grid gap-3">
        <h1 className="text-3xl font-bold">Certified Sliders</h1>
        <p className="subtle">
          Track &amp; Field blog • rankings • athlete profiles
        </p>
      </section>

      {/* Featured | Latest */}
      <div className="grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Featured Athlete</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-[var(--border)]" />
              <div>
                <div className="font-medium">Coming soon</div>
                <div className="text-sm subtle">Top performer highlight</div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Latest Posts</CardTitle>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span>Welcome to Certified Sliders</span>
                <span className="subtle">Blog</span>
              </li>
            </ul>
          </CardBody>
        </Card>

        {/* Empty third column to keep grid balanced when News is full-width below */}
        <div className="hidden md:block" />
      </div>

      {/* Full-width News Gallery */}
      <Section title="News Feed">
        <NewsMergedGrid />
      </Section>

      {/* CTA row */}
      <Section title="Get Involved">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardBody>
              <div className="mb-2 font-medium">Athletes</div>
              <p className="subtle mb-4">
                Claim your profile and add results for verification.
              </p>
              <a className="btn" href="/submit">
                Submit a Result
              </a>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="mb-2 font-medium">Coaches</div>
              <p className="subtle mb-4">
                Help verify marks and highlight your athletes.
              </p>
              <a className="btn" href="/admin/verify">
                Go to Verify
              </a>
            </CardBody>
          </Card>
        </div>
      </Section>
    </div>
  );
}
