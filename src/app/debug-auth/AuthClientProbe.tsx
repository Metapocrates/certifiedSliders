"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/utils/supabase/client";

export default function AuthClientProbe() {
  const router = useRouter();
  const [clientState, setClientState] = useState<any>(null);
  const [events, setEvents] = useState<string[]>([]);

  // CLIENT: What the browser sees now (no redirects here!)
  useEffect(() => {
    let unsub = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      setEvents((prev) => [`${new Date().toISOString()} ${event}`, ...prev].slice(0, 10));
      // IMPORTANT: never redirect here; we only observe.
      // If something else in your app redirects, you’ll see it happen while this stays mounted.
    }).data.subscription;

    (async () => {
      const userRes = await supabaseBrowser.auth.getUser();
      const sessRes = await supabaseBrowser.auth.getSession();
      setClientState({
        getUser: { hasUser: !!userRes.data.user, user: userRes.data.user ? { id: userRes.data.user.id, email: userRes.data.user.email } : null, error: userRes.error?.message || null },
        getSession: { hasSession: !!sessRes.data.session, error: sessRes.error?.message || null }
      });
    })();

    return () => { unsub?.unsubscribe(); };
  }, []);

  async function handleSignOut() {
    await supabaseBrowser.auth.signOut();
    router.refresh();
  }

  return (
    <section>
      <h2 style={{ fontSize: 16, fontWeight: 600 }}>Client session</h2>
      <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
{JSON.stringify(clientState, null, 2)}
      </pre>

      <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>Recent auth events</h3>
      <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
{events.join("\n")}
      </pre>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={() => router.push("/me")} style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6 }}>
          Go to /me
        </button>
        <button onClick={() => router.push("/signin")} style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6 }}>
          Go to /signin
        </button>
        <button onClick={handleSignOut} style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6 }}>
          Sign out (client)
        </button>
      </div>
    </section>
  );
}
