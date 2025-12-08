'use server';

import { createSupabaseServer } from '@/lib/supabase/compat';
import { getSessionUser } from '@/lib/auth';

export async function setStarRatingAction(formData: FormData) {
    const athleteId = String(formData.get('athleteId') || '');
    const newRating = Number(formData.get('newRating') || 0);
    const reason = String(formData.get('reason') || '');

    if (!athleteId) {
        return { ok: false, error: 'Missing athleteId' };
    }
    if (!Number.isInteger(newRating) || newRating < 0 || newRating > 5) {
        return { ok: false, error: 'newRating must be an integer 0..5' };
    }

    const user = await getSessionUser();
    if (!user) {
        return { ok: false, error: 'Unauthorized' };
    }

    const supabase = await createSupabaseServer();

    // SECURITY DEFINER RPC enforces admin and writes the audit row
    const { error } = await supabase.rpc('set_star_rating', {
        p_athlete_id: athleteId,
        p_new_rating: newRating,
        p_reason: reason || null,
    });

    if (error) {
        return { ok: false, error: error.message || 'RPC failed' };
    }

    return { ok: true };
}
