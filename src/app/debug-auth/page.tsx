export const dynamic = "force-dynamic";
export const revalidate = 0;

import { supabaseServer } from "@/lib/supabase/server";
import AuthClientProbe from "./AuthClientProbe";

export default async function DebugAuthPage() {
  const supabase = await supabaseServer();

  // SERVER: What the server sees right now
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
        Auth Debug
      </h1>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Server session</h2>
        <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
{JSON.stringify({
  hasSession: !!session,
  user: session?.user ? { id: session.user.id, email: session.user.email } : null
}, null, 2)}
        </pre>
      </section>

      <AuthClientProbe />
    </main>
  );
}
