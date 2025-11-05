-- Create function to refresh materialized views
-- This allows the API to refresh views after updates

create or replace function public.refresh_materialized_view(view_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only allow refreshing specific views for security
  if view_name = 'mv_best_event' then
    refresh materialized view concurrently public.mv_best_event;
  else
    raise exception 'Unauthorized view refresh: %', view_name;
  end if;
end;
$$;

-- Grant execute to authenticated users (API will use admin client)
grant execute on function public.refresh_materialized_view(text) to authenticated;

comment on function public.refresh_materialized_view is
'Refreshes the specified materialized view. Only whitelisted views can be refreshed.';
