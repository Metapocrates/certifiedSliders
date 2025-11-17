/**
 * Parent Dashboard
 *
 * Main landing page for parents after login
 */

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/roles";

export default async function ParentDashboardPage() {
  // Ensure user is a parent
  const roleInfo = await requireRole("parent");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Parent Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Track your athlete&apos;s progress, manage their profile, and stay informed about recruiting.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="My Athletes"
          description="View linked athlete profiles"
          href="/parent/athletes"
        />
        <DashboardCard
          title="College Radar"
          description="See qualifying programs and fit"
          href="/parent/college-radar"
        />
        <DashboardCard
          title="Settings"
          description="Manage account and notifications"
          href="/parent/settings"
        />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="rounded-lg border border-app bg-card p-6 transition hover:shadow-lg hover:border-scarlet"
    >
      <h2 className="text-xl font-semibold text-app mb-2">{title}</h2>
      <p className="text-sm text-muted">{description}</p>
    </a>
  );
}
