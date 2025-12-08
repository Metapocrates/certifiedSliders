import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/compat';
import { getSessionUser } from '@/lib/auth';
import { parseMarkToSeconds } from '@/lib/marks/normalize';

export const runtime = 'nodejs';

async function adjustTime(
    event: string,
    seconds: number,
    timing: 'FAT' | 'hand' | null
): Promise<{ seconds: number }> {
    try {
        const supabase = await createSupabaseServer();
        const { data, error } = await supabase.rpc('adjust_time', {
            p_event: event, p_seconds: seconds, p_timing: timing,
        });
        if (!error && data && typeof (data as any).seconds === 'number') {
            return data as { seconds: number };
        }
    } catch { }
    return { seconds };
}

export async function POST(req: NextRequest) {
    try {
        const { event, markText, timing, wind, season, meetName, meetDate, proofUrl } = await req.json();

        if (!proofUrl || typeof proofUrl !== 'string') {
            return NextResponse.json({ error: 'Proof URL is required' }, { status: 400 });
        }
        if (!event || !markText) {
            return NextResponse.json({ error: 'Event and mark are required' }, { status: 400 });
        }

        const user = await getSessionUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const supabase = await createSupabaseServer();

        const parsed = parseMarkToSeconds(markText);
        const adj = await adjustTime(event, parsed.seconds, (timing ?? parsed.timing ?? null) as any);

        // 1) Proof row (source=direct, pending)
        const { data: proof, error: pErr } = await supabase
            .from('proofs')
            .insert({
                result_id: null,
                athlete_id: user.id,
                url: proofUrl,
                source: 'direct',
                status: 'pending',
                confidence: 0,
                parsed: {
                    event, markText, markSeconds: parsed.seconds, timing: timing ?? parsed.timing ?? null,
                    wind: wind ?? null, meetName: meetName ?? null, meetDate: meetDate ?? null,
                },
                normalized_mark_seconds: adj.seconds,
                normalized_mark_metric: markText,
                timing: timing ?? parsed.timing ?? null,
                meet_name: meetName ?? null,
                meet_date: meetDate ?? null,
                event,
                created_by: user.id,
            })
            .select('id')
            .single();

        if (pErr || !proof) {
            return NextResponse.json({ error: pErr?.message || 'Failed to save proof' }, { status: 400 });
        }

        // 2) Pending result for admin verification
        const { data: result, error: rErr } = await supabase
            .from('results')
            .insert({
                athlete_id: user.id,
                event,
                mark: markText,
                mark_seconds: parsed.seconds,
                mark_seconds_adj: adj.seconds,
                mark_metric: null,
                timing: timing ?? parsed.timing ?? null,
                wind: wind ?? null,
                season: season ?? 'OUTDOOR',
                status: 'pending',
                source: 'direct',
                proof_url: proofUrl,
                meet_name: meetName ?? null,
                meet_date: meetDate ?? null,
            })
            .select('id')
            .single();

        if (rErr || !result) {
            return NextResponse.json({ error: rErr?.message || 'Failed to save result' }, { status: 400 });
        }

        // 3) Link proof to result
        await supabase.from('proofs').update({ result_id: result.id }).eq('id', proof.id);

        return NextResponse.json({ ok: true, proofId: proof.id, resultId: result.id });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
    }
}
