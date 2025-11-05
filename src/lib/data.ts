import { supabaseAdmin } from './supabaseAdmin';

export async function getAthleteByUsername(username: string) {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();
    if (error) return null;
    return data;
}

export async function getResultsForAthlete(athleteId: string, limit = 25) {
    const { data } = await supabaseAdmin
        .from('results')
        .select('id,event,mark,mark_seconds,meet_name,meet_date,video_url,is_verified')
        .eq('athlete_id', athleteId)
        .order('mark_seconds', { ascending: true, nullsFirst: false })
        .limit(limit);
    return data ?? [];
}

export async function searchAthletes(q: string, state?: string, year?: number) {
    // Search for athletes by full_name or aliases
    // First, find athlete IDs from public aliases that match the search query
    const { data: aliasMatches } = await supabaseAdmin
        .from('athlete_aliases')
        .select('athlete_id')
        .ilike('alias', `%${q}%`)
        .eq('is_public', true);

    const aliasAthleteIds = aliasMatches?.map(a => a.athlete_id) ?? [];

    // Now search profiles: either full_name matches OR id is in aliasAthleteIds
    let query = supabaseAdmin.from('profiles')
        .select('id,username,full_name,school_name,school_state,class_year,profile_pic_url');

    // Build OR condition: full_name ILIKE query OR id IN (alias matches)
    if (aliasAthleteIds.length > 0) {
        query = query.or(`full_name.ilike.%${q}%,id.in.(${aliasAthleteIds.join(',')})`);
    } else {
        query = query.ilike('full_name', `%${q}%`);
    }

    if (state) query = query.eq('school_state', state);
    if (year) query = query.eq('class_year', year);

    const { data } = await query.limit(50);
    return data ?? [];
}

export async function leaderboard(event: string, scope: { state?: string }, year?: number) {
    let q = supabaseAdmin.rpc('noop'); // placeholder to keep types happy
    const { data, error } = await supabaseAdmin
        .from('results')
        .select('mark,mark_seconds,athlete_id,profiles(username,display_name,school_name,grad_year)')
        .eq('event', event)
        .eq('is_verified', true)
        .order('mark_seconds', { ascending: true })
        .limit(100);
    if (error) return [];
    // filter in JS by state/year (simple for MVP)
    return (data as any[]).filter(r => {
        const okState = scope.state ? r.profiles.school_state === scope.state : true;
        const okYear = year ? r.profiles.grad_year === year : true;
        return okState && okYear;
    });
}
