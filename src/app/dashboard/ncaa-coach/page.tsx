/**
 * NCAA Coach Dashboard
 *
 * Main landing page for NCAA coaches after login
 */

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/roles";

export default async function NCAACoachDashboardPage() {
  // Ensure user is an NCAA coach
  const roleInfo = await requireRole("ncaa_coach");

  // Redirect to existing coach portal
  // TODO: Build unified NCAA coach dashboard with portal link
  redirect("/coach/portal");
}
