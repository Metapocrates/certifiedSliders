import { createSupabaseServer } from '@/lib/supabase/compat';
import { setFeaturedAction } from './actions';

type Candidate = {
  id: string;
  username: string | null;
  full_name: string | null;
  star_rating: number | null;
  featured: boolean | null;
};

type FeaturedListRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  star_rating: number | null;
};

export default async function FeaturedAdminPage() {
  const supabase = createSupabaseServer();

  // Only show 3–5★ athletes (DB constraint also enforces this on update)
  const { data: candidates, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, star_rating, featured')
    .gte('star_rating', 3)
    .order('star_rating', { ascending: false })
    .order('username', { ascending: true })
    .limit(200);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Featured Profiles (Admin)</h1>
      <p className="subtle">
        Only athletes with <strong>3–5★</strong> can be marked as Featured. The database
        enforces this rule.
      </p>

      {error && (
        <div className="text-sm text-red-600">Failed to load athletes: {error.message}</div>
      )}

      <form action={setFeaturedAction} className="card p-4 space-y-3">
        <label className="block text-sm font-medium">Athlete</label>
        <select name="athleteId" className="input" required>
          <option value="">— Select athlete —</option>
          {(candidates as Candidate[] | null)?.map((p: Candidate) => (
            <option key={p.id} value={p.id}>
              {p.username} • {p.full_name || 'No name'} • {p.star_rating ?? 0}★ • currently:{' '}
              {p.featured ? 'Featured' : 'Not featured'}
            </option>
          )) || null}
        </select>

        <label className="block text-sm font-medium">Featured status</label>
        {/* Use a select so the server action can read 'true' | 'false' cleanly */}
        <select name="featured" className="input" defaultValue="false">
          <option value="false">Not featured</option>
          <option value="true">Featured</option>
        </select>

        <button className="btn btn-primary" type="submit">Save</button>
      </form>

      <div className="prose">
        <h2>Currently Featured</h2>
        <FeaturedList />
      </div>
    </div>
  );
}

async function FeaturedList() {
  const supabase = createSupabaseServer();
  const { data } = await supabase
    .from('profiles')
    .select('id, username, full_name, star_rating')
    .eq('featured', true)
    .order('star_rating', { ascending: false })
    .order('username', { ascending: true })
    .limit(100);

  const rows = (data ?? []) as FeaturedListRow[];

  if (!rows.length) {
    return <div className="text-sm subtle">No featured athletes yet.</div>;
  }

  return (
    <ul className="list-disc pl-5">
      {rows.map((p: FeaturedListRow) => (
        <li key={p.id}>
          {p.username} • {p.full_name || 'No name'} • {p.star_rating ?? 0}★
        </li>
      ))}
    </ul>
  );
}
