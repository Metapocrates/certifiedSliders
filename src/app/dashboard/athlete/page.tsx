/**
 * Athlete Dashboard
 *
 * Main landing page for athletes after login
 */

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/roles";

export default async function AthleteDashboardPage() {
  // Ensure user is an athlete
  const roleInfo = await requireRole("athlete");

  // For now, redirect to existing /me page
  // TODO: Build dedicated athlete dashboard
  redirect("/me");
}
