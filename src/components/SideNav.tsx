'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

type NavItem = { href: string; label: string };

export default function SideNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userType, setUserType] = useState<string | null>(null);
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check admin status
      const { data: adminData } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsAdmin(!!adminData);

      // Get user type from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .maybeSingle();

      const type = profileData?.user_type || null;
      setUserType(type);

      // Set navigation based on user type
      if (type === 'ncaa_coach') {
        setNavItems([
          { href: '/coach/portal', label: 'Athletes' },
          { href: '/coach/portal/analytics', label: 'Analytics' },
          { href: '/coach/verify', label: 'Verify Account' },
        ]);
      } else if (type === 'hs_coach') {
        setNavItems([
          { href: '/hs/portal', label: 'My Team' },
          { href: '/hs/portal/roster', label: 'Roster' },
          { href: '/hs/portal/attest', label: 'Attest Results' },
        ]);
      } else if (type === 'parent') {
        setNavItems([
          { href: '/parent/dashboard', label: 'Dashboard' },
          { href: '/parent/activity', label: 'Activity' },
          { href: '/parent/onboarding', label: 'Link Athlete' },
        ]);
      } else {
        // Athlete or default
        setNavItems([
          { href: '/me', label: 'My Profile' },
          { href: '/submit-result', label: 'Submit Result' },
          { href: '/me/edit', label: 'Edit Profile' },
        ]);
      }
    })();
  }, []);

  return (
    <aside className="hidden md:block w-60 shrink-0 border-r bg-background/40">
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
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
