import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
    const body = await req.json();
    // TODO: auth check; for now accept trusted payloads
    const { data, error } = await supabaseAdmin.from('results').insert({
        athlete_id: body.athleteId,
        event: body.event,
        mark: body.mark,
        mark_seconds: toSeconds(body.mark),
        meet_name: body.meetName,
        meet_date: body.meetDate,
        timing: body.timing ?? 'FAT',
        level: body.level ?? 'HS',
        video_url: body.videoUrl
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
}

function toSeconds(mark: string) {
    const m = mark.trim().toLowerCase().replace('h', '');
    if (!m.includes(':')) return Number(m);
    const [mm, ss] = m.split(':');
    return Number(mm) * 60 + Number(ss);
}
