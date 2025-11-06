import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import FeaturedForm from "./FeaturedForm";

export default async function AdminDashboard() {
  const supabase = createSupabaseServer();
  const me = await getSessionUser();
  if (!me) redirect("/signin");
  if (!(await isAdmin(me.id))) redirect("/");

  // Fetch current featured profile
  const { data: feat } = await supabase
    .from("featured_profiles")
    .select("profile_id")
    .maybeSingle();

  let currentUsername: string | null = null;
  if (feat?.profile_id) {
    const { data: p } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", feat.profile_id)
      .maybeSingle();
    currentUsername = p?.username ?? null;
  }

  // Fetch dashboard metrics
  const [
    { count: pendingResults },
    { count: pendingClaims },
    { count: pendingReviews },
    { count: flaggedReports },
    { count: totalAthletes },
    { count: verifiedResults }
  ] = await Promise.all([
    supabase.from("results").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("verification_claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("v_pending_rating_reviews").select("result_id", { count: "exact", head: true }),
    supabase.from("result_reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("results").select("id", { count: "exact", head: true }).in("status", ["verified", "approved"])
  ]);

  const metrics = [
    {
      label: "Pending Results",
      value: pendingResults ?? 0,
      href: "/admin/results",
      color: pendingResults && pendingResults > 0 ? "text-amber-600" : "text-app",
      bgColor: pendingResults && pendingResults > 0 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-card"
    },
    {
      label: "Pending Claims",
      value: pendingClaims ?? 0,
      href: "/admin/claims",
      color: pendingClaims && pendingClaims > 0 ? "text-blue-600" : "text-app",
      bgColor: pendingClaims && pendingClaims > 0 ? "bg-blue-50 dark:bg-blue-900/20" : "bg-card"
    },
    {
      label: "Rating Reviews",
      value: pendingReviews ?? 0,
      href: "/admin/rating-review",
      color: pendingReviews && pendingReviews > 0 ? "text-purple-600" : "text-app",
      bgColor: pendingReviews && pendingReviews > 0 ? "bg-purple-50 dark:bg-purple-900/20" : "bg-card"
    },
    {
      label: "Open Reports",
      value: flaggedReports ?? 0,
      href: "/admin/reports",
      color: flaggedReports && flaggedReports > 0 ? "text-red-600" : "text-app",
      bgColor: flaggedReports && flaggedReports > 0 ? "bg-red-50 dark:bg-red-900/20" : "bg-card"
    },
    {
      label: "Total Athletes",
      value: totalAthletes ?? 0,
      href: "/athletes",
      color: "text-app",
      bgColor: "bg-card"
    },
    {
      label: "Verified Results",
      value: verifiedResults ?? 0,
      href: "/results",
      color: "text-app",
      bgColor: "bg-card"
    }
  ];

  const quickActions = [
    { label: "Review Results Queue", href: "/admin/results", icon: "📋" },
    { label: "Rating Review", href: "/admin/rating-review", icon: "⭐" },
    { label: "Verify Claims", href: "/admin/claims", icon: "✓" },
    { label: "Manual Review", href: "/admin/manual-review", icon: "👁️" },
    { label: "Manage Standards", href: "/admin/standards", icon: "📊" },
    { label: "Blog Posts", href: "/admin/blog", icon: "✍️" },
    { label: "Create Athlete", href: "/admin/athletes/new", icon: "➕" },
    { label: "Featured Profiles", href: "/admin/featured", icon: "🌟" }
  ];

  return (
    <div className="space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-app">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-muted">
          Overview and quick actions for platform management
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            className={`rounded-2xl border border-app p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${metric.bgColor}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">
              {metric.label}
            </p>
            <p className={`mt-2 text-4xl font-bold ${metric.color}`}>
              {metric.value}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-app">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-3 rounded-xl border border-app bg-card px-4 py-3 transition hover:border-scarlet hover:bg-muted"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-semibold text-app">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Profile Management */}
      <div className="rounded-2xl border border-app bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-app">Homepage Featured Profile</h2>
        <p className="mb-6 text-sm text-muted">
          Manage which athlete profile appears in the featured carousel on the public homepage
        </p>
        <FeaturedForm currentUsername={currentUsername} />
      </div>
    </div>
  );
}
