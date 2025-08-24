import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only
const db = createClient(url, key, { auth: { persistSession: false }});

export const revalidate = 120;

export default async function AthletePage({ params }: { params: { username: string } }) {
  const { data: profile } = await db
    .from('profiles')
    .select('id,username,display_name,avatar_url,school_name,school_state,grad_year')
    .eq('username', params.username)
    .single();

  if (!profile) return notFound();

  const { data: results } = await db
    .from('results')
    .select('id,event,mark,meet_name,meet_date,is_verified')
    .eq('athlete_id', profile.id)
    .order('mark_seconds', { ascending: true })
    .limit(50);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <header className="flex items-center gap-4">
        {/* next/image later; <img> is fine for MVP */}
        <img src={profile.avatar_url ?? '/placeholder.jpg'} alt="" width={96} height={96} />
        <div>
          <h1 className="text-2xl font-semibold">{profile.display_name}</h1>
          <p>{profile.school_name} • {profile.school_state} • Class of {profile.grad_year}</p>
        </div>
      </header>

      <section>
        <h2 className="font-semibold">Results</h2>
        <ul className="mt-2 space-y-1">
          {(results ?? []).map(r => (
            <li key={r.id}>
              {r.event} — {r.mark} ({r.meet_name ?? 'Meet'}, {r.meet_date ?? '—'}) {r.is_verified ? '✅' : '⏳'}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
