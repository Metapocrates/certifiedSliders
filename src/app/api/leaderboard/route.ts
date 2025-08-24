import { NextResponse } from 'next/server';
import { leaderboard } from '@/lib/data';

export async function GET(req: Request) {
    const sp = new URL(req.url).searchParams;
    const event = sp.get('event')!;
    const state = sp.get('state') ?? undefined;
    const year = sp.get('year') ? Number(sp.get('year')) : undefined;
    const rows = await leaderboard(event, { state }, year);
    return NextResponse.json(rows, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } });
}
