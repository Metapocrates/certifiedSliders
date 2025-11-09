'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const nav = [
  { href: '/me', label: 'My Profile' },
  { href: '/submit-result', label: 'Submit Result' },
  { href: '/me/edit', label: 'Edit Profile' },
];

export default function SideNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsAdmin(!!data);
    })();
  }, []);

  return (
    <aside className="hidden md:block w-60 shrink-0 border-r bg-background/40">
      <nav className="p-3 space-y-1">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm transition hover:bg-accent hover:text-accent-foreground ${
                active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <div className="pt-3 mt-3 border-t">
            <Link
              href="/admin/verify"
              className={`block rounded-lg px-3 py-2 text-sm transition hover:bg-accent hover:text-accent-foreground ${
                pathname?.startsWith('/admin/verify')
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              Admin · Verify Results
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );
}
