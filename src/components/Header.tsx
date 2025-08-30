'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function Header() {
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => setIsAuthed(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setIsAuthed(!!s));
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 md:px-8">
        <Link href="/" className="font-semibold">Certified Sliders</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/rankings" className="hover:underline">Rankings</Link>
          <Link href="/dev" className="hover:underline">Dev</Link>
          {isAuthed ? (
            <>
              <Link href="/me" className="hover:underline">Me</Link>
              <Link href="/submit-result" className="hover:underline">Submit Result</Link>
              <button onClick={signOut} className="hover:underline">Sign out</button>
            </>
          ) : (
            <Link href="/signin" className="hover:underline">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
