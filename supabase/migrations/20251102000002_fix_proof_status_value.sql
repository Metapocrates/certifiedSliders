-- Fix proof_status value from 'parsed' to 'pending'
create or replace function public.verify_and_insert_result(
  p_token uuid,
  p_source text,
  p_source_url text,
  p_source_athlete_id text,
  p_event text,
  p_mark_text text,
  p_mark_seconds numeric,
  p_mark_metric numeric,
  p_timing text,
  p_wind numeric,
  p_season text,
  p_meet_date timestamptz,
  p_meet_name text,
  p_confidence numeric default 0
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_token record;
  v_result_id bigint;
  v_mark_seconds_adj numeric := null;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_token
  from public.proof_tokens
  where id = p_token
    and user_id = v_uid
    and scope = 'athleticnet_result_claim'
    and status = 'new'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Invalid or expired token';
  end if;

  -- Check if athlete ID matches verified profile (use numeric ID or slug)
  if not exists (
    select 1
    from public.external_identities
    where user_id = v_uid
      and provider = 'athleticnet'
      and verified = true
      and status = 'verified'
      and (
        external_numeric_id = p_source_athlete_id
        or external_id = p_source_athlete_id
      )
  ) then
    update public.proof_tokens set status = 'expired' where id = v_token.id;
    raise exception 'Athlete ID mismatch';
  end if;

  begin
    select seconds into v_mark_seconds_adj
    from public.adjust_time(p_event, p_mark_seconds, p_timing);
  exception when undefined_function then
    v_mark_seconds_adj := p_mark_seconds;
  when others then
    v_mark_seconds_adj := p_mark_seconds;
  end;
  v_mark_seconds_adj := coalesce(v_mark_seconds_adj, p_mark_seconds);

  insert into public.results (
    athlete_id,
    event,
    mark,
    mark_seconds,
    mark_seconds_adj,
    mark_metric,
    timing,
    wind,
    season,
    status,
    source,
    proof_url,
    meet_name,
    meet_date,
    source_athlete_id,
    created_at
  )
  values (
    v_uid,
    p_event,
    p_mark_text,
    p_mark_seconds,
    v_mark_seconds_adj,
    p_mark_metric,
    p_timing,
    p_wind,
    upper(coalesce(p_season, 'OUTDOOR')),
    'pending',
    p_source,
    p_source_url,
    p_meet_name,
    p_meet_date,
    p_source_athlete_id,
    timezone('utc', now())
  )
  returning id into v_result_id;

  insert into public.proofs (
    result_id,
    athlete_id,
    url,
    source,
    status,
    confidence,
    parsed,
    normalized_mark_seconds,
    normalized_mark_metric,
    timing,
    meet_name,
    meet_date,
    event,
    created_by,
    created_at
  )
  values (
    v_result_id,
    v_uid,
    p_source_url,
    p_source::proof_source,
    'pending',  -- Use valid enum value instead of 'parsed'
    coalesce(p_confidence, 0),
    jsonb_build_object(
      'event', p_event,
      'markText', p_mark_text,
      'markSeconds', p_mark_seconds,
      'timing', p_timing,
      'wind', p_wind,
      'meetName', p_meet_name,
      'meetDate', p_meet_date,
      'sourceAthleteId', p_source_athlete_id
    ),
    v_mark_seconds_adj,
    case when p_mark_metric is not null then p_mark_metric::text else null end,
    p_timing,
    p_meet_name,
    p_meet_date,
    p_event,
    v_uid,
    timezone('utc', now())
  );

  update public.proof_tokens
  set status = 'used'
  where id = v_token.id;

  return v_result_id;
exception when others then
  update public.proof_tokens
  set status = 'expired'
  where id = p_token;
  raise;
end;
$$;
