import { NextResponse } from 'next/server';
import { searchAthletes } from '@/lib/data';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? '';
    const state = searchParams.get('state') ?? undefined;
    const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined;
    const rows = await searchAthletes(q, state, year);
    return NextResponse.json(rows, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } });
}
