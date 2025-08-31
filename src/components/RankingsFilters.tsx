'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const EVENTS = ['100m','200m','400m','800m','1600m','3200m','110H','300H']; // tweak if needed
const GENDERS = ['M','F'];
const SORTS = [
  { v: 'time', label: 'Best Time' },
  { v: 'time_adj', label: 'Adj. Time' },
  { v: 'name', label: 'Name' },
  { v: 'date', label: 'Most Recent' },
];

export default function RankingsFilters({ initial }: { initial: Record<string, string | undefined> }) {
  const router = useRouter();
  const sp = useSearchParams();

  function setParam(k: string, v?: string) {
    const next = new URLSearchParams(sp);
    if (v && v.length) next.set(k, v); else next.delete(k);
    next.delete('page'); // reset to page 1 on any filter change
    router.push(`/rankings?${next.toString()}`);
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6 items-end">
      <label className="flex flex-col">
        <span className="text-xs text-muted-foreground">Event</span>
        <select
          className="input"
          value={initial.event ?? ''}
          onChange={(e) => setParam('event', e.target.value || undefined)}
        >
          <option value="">All</option>
          {EVENTS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col">
        <span className="text-xs text-muted-foreground">Gender</span>
        <select
          className="input"
          value={initial.gender ?? ''}
          onChange={(e) => setParam('gender', e.target.value || undefined)}
        >
          <option value="">All</option>
          {GENDERS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col">
        <span className="text-xs text-muted-foreground">Class Year</span>
        <input
          className="input"
          inputMode="numeric"
          placeholder="e.g. 2028"
          defaultValue={initial.classYear ?? ''}
          onBlur={(e) => setParam('classYear', e.currentTarget.value || undefined)}
        />
      </label>

      <label className="flex flex-col">
        <span className="text-xs text-muted-foreground">State</span>
        <input
          className="input"
          placeholder="e.g. CA"
          defaultValue={initial.state ?? ''}
          onBlur={(e) => setParam('state', e.currentTarget.value.toUpperCase() || undefined)}
        />
      </label>

      <label className="flex flex-col">
        <span className="text-xs text-muted-foreground">Sort</span>
        <select
          className="input"
          value={initial.sort ?? 'time'}
          onChange={(e) => setParam('sort', e.target.value)}
        >
          {SORTS.map((s) => (
            <option key={s.v} value={s.v}>{s.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
