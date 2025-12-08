'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '@/lib/supabase/compat';
import { getSessionUser, isAdmin } from '@/lib/auth';

export async function approveResult(resultId: number) {
    const user = await getSessionUser();
    if (!user || !(await isAdmin(user.id))) throw new Error('Unauthorized');

    const supabase = await createSupabaseServer();

    // Update result → verified
    const { error: rerr } = await supabase
        .from('results')
        .update({
            status: 'verified',
            verified_by: user.id,
            verified_at: new Date().toISOString(),
        })
        .eq('id', resultId);
    if (rerr) throw new Error(rerr.message);

    // Mark linked proof (if any) as valid
    const { data: proofs } = await supabase
        .from('proofs')
        .select('id')
        .eq('result_id', resultId)
        .limit(1);
    const proofId = proofs?.[0]?.id;
    if (proofId) {
        await supabase
            .from('proofs')
            .update({ status: 'valid', confidence: 1 })
            .eq('id', proofId);
    }

    // (Optional) kick any MV refresh here via RPC

    revalidatePath('/admin/results');
}

export async function rejectResult(resultId: number) {
    const user = await getSessionUser();
    if (!user || !(await isAdmin(user.id))) throw new Error('Unauthorized');

    const supabase = await createSupabaseServer();

    const { error: rerr } = await supabase
        .from('results')
        .update({ status: 'rejected' })
        .eq('id', resultId);
    if (rerr) throw new Error(rerr.message);

    const { data: proofs } = await supabase
        .from('proofs')
        .select('id')
        .eq('result_id', resultId)
        .limit(1);
    const proofId = proofs?.[0]?.id;
    if (proofId) {
        await supabase.from('proofs').update({ status: 'invalid' }).eq('id', proofId);
    }

    revalidatePath('/admin/results');
}
