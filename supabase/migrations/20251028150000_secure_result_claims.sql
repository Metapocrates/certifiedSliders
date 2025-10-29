-- Secure Athletic.net claim workflow: tokens + verified insert

create extension if not exists pgcrypto;

create table if not exists public.proof_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    scope text not null default 'athleticnet_result_claim',
    status text not null default 'new' check (status in ('new','used','expired')),
    expires_at timestamptz not null,
    created_at timestamptz not null default timezone('utc', now())
);

create index if not exists proof_tokens_user_scope_idx
  on public.proof_tokens (user_id, scope, status);

alter table public.proof_tokens enable row level security;

drop policy if exists proof_tokens_select_own on public.proof_tokens;
create policy proof_tokens_select_own
  on public.proof_tokens
  for select
  using (user_id = auth.uid());

-- store source athlete id for provenance (idempotent)
alter table public.results
  add column if not exists source_athlete_id text;

-- Mint short-lived token
create or replace function public.mint_proof_token(p_scope text default 'athleticnet_result_claim')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.proof_tokens (user_id, scope, expires_at)
  values (v_uid, coalesce(p_scope, 'athleticnet_result_claim'), now() + interval '15 minutes')
  returning id into v_id;

  return v_id;
end;
$$;

-- Insert result only when athlete id matches linked identities
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

  if not exists (
    select 1
    from public.external_identities
    where user_id = v_uid
      and provider = 'athleticnet'
      and verified = true
      and status = 'verified'
      and external_id = p_source_athlete_id
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
    p_source,
    'parsed',
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
