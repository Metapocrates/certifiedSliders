/**
 * High School Coach Dashboard
 *
 * Main landing page for HS coaches after login
 */

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/roles";

export default async function HSCoachDashboardPage() {
  // Ensure user is a HS coach
  const roleInfo = await requireRole("hs_coach");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">High School Coach Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Welcome to your coaching portal. Manage your roster, submit results, and track athlete progress.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          title="My Roster"
          description="View and manage your athletes"
          href="/hs/roster"
        />
        <DashboardCard
          title="Submit Results"
          description="Add meet results for your athletes"
          href="/hs/submit-results"
        />
        <DashboardCard
          title="Team Analytics"
          description="Track performance and trends"
          href="/hs/analytics"
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
