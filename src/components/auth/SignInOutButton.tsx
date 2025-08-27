'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function SignInOutButton() {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthed(!!session);
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_e, s) => setIsAuthed(!!s));
      return () => subscription?.unsubscribe();
    })();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // redirect home (or refresh)
    window.location.assign('/');
  };

  if (!isAuthed) {
    return (
      <Link href="/signin" className="text-sm hover:underline">
        Sign in
      </Link>
    );
  }

  return (
    <button onClick={signOut} className="text-sm">
      Sign out
    </button>
  );
}
