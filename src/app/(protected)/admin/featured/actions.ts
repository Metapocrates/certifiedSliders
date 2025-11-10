'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServer } from '@/lib/supabase/compat';
import { getSessionUser } from '@/lib/auth';

export async function setFeaturedAction(formData: FormData) {
    const athleteId = String(formData.get('athleteId') || '');
    const featured = formData.get('featured') === 'true';

    if (!athleteId) {
        return { ok: false, error: 'Missing athleteId' };
    }

    const user = await getSessionUser();
    if (!user) {
        return { ok: false, error: 'Unauthorized' };
    }

    const supabase = createSupabaseServer();

    // Admin check — relies on your admins table
    const { data: isAdmin } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (!isAdmin) {
        return { ok: false, error: 'Admin required' };
    }

    // Update profile featured status
    const { error } = await supabase
        .from('profiles')
        .update({ featured })
        .eq('id', athleteId);

    if (error) {
        return { ok: false, error: error.message };
    }

    // Revalidate both the admin page and homepage
    revalidatePath('/admin/featured');
    revalidatePath('/');

    return { ok: true };
}
