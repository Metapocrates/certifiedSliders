import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser } from "@/lib/auth";

type AuditRow = {
  id: number;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  meta: any;
  created_at: string;
  actor_name: string | null;
};

export const dynamic = "force-dynamic";

async function getAudit(): Promise<AuditRow[]> {
  const supabase = createSupabaseServer();
  const user = await getSessionUser();
  if (!user) throw new Error("Not signed in.");
  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) {
    throw new Error("Admin access required.");
  }

  const { data, error } = await supabase
    .from("audit_events")
    .select(`
      id, actor, action, target_type, target_id, meta, created_at,
      profiles:actor ( full_name )
    `)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    actor: r.actor,
    action: r.action,
    target_type: r.target_type,
    target_id: r.target_id,
    meta: r.meta,
    created_at: r.created_at,
    actor_name: r.profiles?.full_name ?? null,
  }));
}

export default async function AuditPage() {
  const rows = await getAudit();
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Audit Log</h1>
      {!rows.length ? (
        <div className="text-sm text-muted-foreground">No audit entries yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Actor</th>
                <th className="py-2 pr-3">Action</th>
                <th className="py-2 pr-3">Target</th>
                <th className="py-2 pr-3">Meta</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-b-0">
                  <td className="py-2 pr-3">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-3">{r.actor_name ?? r.actor}</td>
                  <td className="py-2 pr-3">{r.action}</td>
                  <td className="py-2 pr-3">{r.target_type} #{r.target_id}</td>
                  <td className="py-2 pr-3">
                    <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(r.meta, null, 2)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
