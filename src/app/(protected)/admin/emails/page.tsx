// src/app/(protected)/admin/emails/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OutboundEmail = {
  id: number;
  template: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  body_text: string;
  body_html: string | null;
  meta: Record<string, any>;
  status: "queued" | "sent" | "failed";
  error: string | null;
  created_at: string;
  sent_at: string | null;
};

export default async function AdminEmailsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin/emails");
  if (!(await isAdmin(user.id))) redirect("/");

  // Fetch last 200 emails
  const { data: emails, error } = await supabase
    .from("outbound_emails")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Failed to fetch emails:", error);
  }

  const emailList = (emails || []) as OutboundEmail[];

  // Count by status
  const statusCounts = {
    queued: emailList.filter((e) => e.status === "queued").length,
    sent: emailList.filter((e) => e.status === "sent").length,
    failed: emailList.filter((e) => e.status === "failed").length,
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-app pb-4">
        <h1 className="text-3xl font-bold text-app">Email Queue</h1>
        <p className="mt-2 text-sm text-muted">
          Monitor outbound email delivery and troubleshoot failures
        </p>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-app bg-card p-4">
          <div className="text-sm font-medium text-muted">Queued</div>
          <div className="mt-1 text-2xl font-bold text-app">
            {statusCounts.queued}
          </div>
        </div>
        <div className="rounded-xl border border-app bg-card p-4">
          <div className="text-sm font-medium text-muted">Sent</div>
          <div className="mt-1 text-2xl font-bold text-green-600">
            {statusCounts.sent}
          </div>
        </div>
        <div className="rounded-xl border border-app bg-card p-4">
          <div className="text-sm font-medium text-muted">Failed</div>
          <div className="mt-1 text-2xl font-bold text-red-600">
            {statusCounts.failed}
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="rounded-xl border border-app bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-app bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Template
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  To
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Sent
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app/50">
              {emailList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    No emails in queue
                  </td>
                </tr>
              ) : (
                emailList.map((email) => (
                  <tr key={email.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm text-app">{email.id}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          email.status === "sent"
                            ? "bg-green-100 text-green-800"
                            : email.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {email.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-app">
                      {email.template}
                    </td>
                    <td className="px-4 py-3 text-sm text-app">
                      <div className="max-w-xs truncate">
                        {email.to_name && (
                          <div className="font-medium">{email.to_name}</div>
                        )}
                        <div className="text-muted">{email.to_email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-app">
                      <div className="max-w-xs truncate">{email.subject}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {new Date(email.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {email.sent_at
                        ? new Date(email.sent_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {email.error ? (
                        <details className="cursor-pointer">
                          <summary className="text-red-600">View error</summary>
                          <pre className="mt-2 max-w-xs overflow-auto rounded bg-red-50 p-2 text-xs text-red-800">
                            {email.error}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Trigger */}
      <div className="rounded-xl border border-app bg-card p-6">
        <h2 className="text-lg font-semibold text-app">Manual Trigger</h2>
        <p className="mt-2 text-sm text-muted">
          The email queue is processed automatically every 2 minutes via Supabase Edge Function schedule.
          You can also trigger it manually using the Supabase Dashboard or by invoking the edge function directly.
        </p>
        <div className="mt-4 rounded-lg border border-muted bg-muted/10 p-4">
          <p className="text-xs font-mono text-muted">
            supabase functions invoke process_email_queue
          </p>
        </div>
      </div>
    </div>
  );
}
