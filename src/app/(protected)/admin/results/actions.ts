'use server';

import { createSupabaseServer } from '@/lib/supabase/compat';

export async function verifyResultAction(formData: FormData) {
    const resultId = String(formData.get('resultId') || '');
    const decision = String(formData.get('decision') || ''); // 'approve' | 'reject'

    if (!resultId) return { ok: false, error: 'Missing resultId' };
    if (decision !== 'approve' && decision !== 'reject') {
        return { ok: false, error: 'Invalid decision' };
    }

    const supabase = createSupabaseServer();

    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return { ok: false, error: 'Unauthorized' };

    const { data: adminRow, error: adminErr } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (adminErr) return { ok: false, error: adminErr.message };
    if (!adminRow) return { ok: false, error: 'Admin required' };

    const verified = decision === 'approve';

    const { error } = await supabase
        .from('results')
        .update({
            verified,
            verified_by: user.id,
            verified_at: new Date().toISOString(),
        })
        .eq('id', resultId);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
}
