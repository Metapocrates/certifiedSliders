import { getAthleteByUsername, getResultsForAthlete } from '@/lib/data';
import { notFound } from 'next/navigation';

export const revalidate = 120;

export default async function Page({ params }: { params: { username: string }}) {
  const athlete = await getAthleteByUsername(params.username);
  if (!athlete) return notFound();
  const results = await getResultsForAthlete(athlete.id, 50);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: athlete.display_name,
    affiliation: { '@type':'SportsOrganization', name: athlete.school_name },
    sport: 'Track and Field',
    url: `https://YOURDOMAIN/athletes/${athlete.username}`,
    image: athlete.avatar_url
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-4">
          {/* next/image in real project */}
          <img src={athlete.avatar_url ?? '/placeholder.jpg'} alt="" width={96} height={96} />
          <div>
            <h1 className="text-2xl font-semibold">{athlete.display_name}</h1>
            <p>{athlete.school_name} • Class of {athlete.grad_year}</p>
            <p>PRs: {/* derive from verified results later */}</p>
          </div>
        </div>
        <section className="mt-6">
          <h2 className="font-semibold">Recent Results</h2>
          <ul className="mt-2 space-y-1">
            {results.map(r => (
              <li key={r.id}>{r.event} — {r.mark} ({r.meet_name}, {r.meet_date}) {r.is_verified ? '✅' : '⏳'}</li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
