'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';


export default function RecentSubmissions({ athleteId }: { athleteId: string }) {
const [recent, setRecent] = useState<any[]>([]);


useEffect(() => {
(async () => {
const supabase = createClient();
const { data } = await supabase
.from('results')
.select('id, event, mark, mark_seconds_adj, meet_name, meet_date, status')
.eq('athlete_id', athleteId)
.order('meet_date', { ascending: false })
.limit(5);
setRecent(data ?? []);
})();
}, [athleteId]);


return (
<section className="mt-8">
<h2 className="text-lg font-medium">Recent Submissions</h2>
{recent.length === 0 ? (
<p className="text-sm text-muted-foreground">No recent results.</p>
) : (
<ul className="divide-y">
{recent.map((r) => (
<li key={r.id} className="py-3 text-sm flex items-center justify-between">
<div>
<div className="font-medium">{r.event} · {r.mark}</div>
<div className="text-muted-foreground">{r.meet_name} · {new Date(r.meet_date).toLocaleDateString()}</div>
</div>
<span className="rounded-md border px-2 py-1 text-xs">{r.status ?? 'pending'}</span>
</li>
))}
</ul>
)}
</section>
);
}