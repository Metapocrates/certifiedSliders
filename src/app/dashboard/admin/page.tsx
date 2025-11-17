/**
 * Admin Dashboard
 *
 * Main landing page for admins after login
 */

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/roles";

export default async function AdminDashboardPage() {
  // Ensure user is an admin
  const roleInfo = await requireRole("admin");

  // Redirect to existing admin page
  // TODO: Build unified admin dashboard
  redirect("/admin");
}
