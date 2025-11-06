// src/app/(protected)/admin/class-year-override/page.tsx
import { createSupabaseServer } from "@/lib/supabase/compat";
import { overrideClassYearAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminClassYearOverridePage() {
  const supabase = createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  if (!user) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-2">Class Year Override</h1>
        <p className="text-sm text-red-700">You must be signed in.</p>
      </div>
    );
  }

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-2">Class Year Override</h1>
        <p className="text-sm text-red-700">Unauthorized.</p>
      </div>
    );
  }

  // Fetch recent audit logs for class year changes
  const { data: auditLogs } = await supabase
    .from("audit_logs")
    .select("id, action, entity_id, old_value, new_value, reason, created_at, metadata")
    .eq("action", "class_year_override")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-2">Class Year Override</h1>
      <p className="text-sm text-gray-600 mb-6">
        Override a locked class year for a user. This action will be logged in the audit trail.
      </p>

      <div className="rounded-xl border bg-white p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Override Class Year</h2>
        <form action={overrideClassYearAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              User ID (UUID or Profile ID)
            </label>
            <input
              name="user_id"
              type="text"
              className="w-full rounded border px-3 py-2 font-mono text-sm"
              placeholder="99aec159-f825-4a98-94db-d176e0032896 or CS-ABC12"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the user&apos;s UUID or their CS-XXXXX profile ID
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              New Class Year
            </label>
            <input
              name="new_class_year"
              type="number"
              min={2024}
              max={2099}
              className="w-full rounded border px-3 py-2"
              placeholder="2028"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Reason for Override (Required)
            </label>
            <textarea
              name="reason"
              rows={3}
              className="w-full rounded border px-3 py-2"
              placeholder="Explain why this class year needs to be changed..."
              required
            />
          </div>

          <button
            type="submit"
            className="rounded-md bg-scarlet px-4 py-2 text-white font-semibold hover:opacity-90"
          >
            Override Class Year
          </button>
        </form>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Overrides</h2>
        {!auditLogs || auditLogs.length === 0 ? (
          <p className="text-sm text-gray-500">No overrides yet.</p>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log: any) => (
              <div key={log.id} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="font-mono text-xs text-gray-500">
                    {log.metadata?.profile_name || log.entity_id}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">
                    {log.old_value?.class_year || "—"}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium">
                    {log.new_value?.class_year || "—"}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  <span className="font-medium">Reason:</span> {log.reason || "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
