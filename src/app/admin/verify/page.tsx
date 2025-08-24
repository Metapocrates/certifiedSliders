import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redirect } from 'next/navigation';

async function listUnverified() {
  const { data } = await supabaseAdmin
    .from('results')
    .select('id,event,mark,meet_name,meet_date,athlete_id,is_verified,created_at')
    .eq('is_verified', false)
    .order('created_at', { ascending: false })
    .limit(200);
  return data ?? [];
}

async function verifyAction(formData: FormData) {
  'use server';
  const id = Number(formData.get('id'));
  const { error } = await supabaseAdmin.rpc('verify_result', { p_result_id: id });
  if (error) throw new Error(error.message);
}

export const revalidate = 0; // always fresh

export default async function Page() {
  // (Optional) add an admin guard here. For MVP you can skip and rely on RPC's admin check.
  // If you have session logic, redirect non-admins:
  // const isAdmin = await yourIsAdminCheck();
  // if (!isAdmin) redirect('/');

  const rows = await listUnverified();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Unverified Results</h1>
      <p className="text-sm text-gray-500 mb-4">{rows.length} pending</p>
      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.id} className="py-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">{r.event} — {r.mark}</div>
              <div className="text-sm text-gray-600">
                {r.meet_name ?? 'Meet'} · {r.meet_date ?? 'unknown'} · Result #{r.id}
              </div>
            </div>
            <form action={verifyAction}>
              <input type="hidden" name="id" value={r.id} />
              <button
                className="rounded bg-black px-3 py-1.5 text-white text-sm hover:opacity-90"
                type="submit"
              >
                Verify
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
