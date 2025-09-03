"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function SignOutButtonClient() {
  const router = useRouter();

  async function signOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.refresh(); // refresh server comps so Header updates
  }

  return (
    <button onClick={signOut} className="rounded border px-3 py-1.5">
      Sign out
    </button>
  );
}
