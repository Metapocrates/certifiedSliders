-- Add social media profile columns to profiles table
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'instagram_url') then
    alter table public.profiles add column instagram_url text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'twitter_url') then
    alter table public.profiles add column twitter_url text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'tiktok_url') then
    alter table public.profiles add column tiktok_url text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'youtube_url') then
    alter table public.profiles add column youtube_url text;
  end if;
end $$;

-- Add URL validation constraints
alter table public.profiles
  drop constraint if exists instagram_url_format,
  drop constraint if exists twitter_url_format,
  drop constraint if exists tiktok_url_format,
  drop constraint if exists youtube_url_format;

alter table public.profiles
  add constraint instagram_url_format check (instagram_url is null or instagram_url ~* '^https?://(www\.)?(instagram\.com|instagr\.am)/'),
  add constraint twitter_url_format check (twitter_url is null or twitter_url ~* '^https?://(www\.)?(twitter\.com|x\.com)/'),
  add constraint tiktok_url_format check (tiktok_url is null or tiktok_url ~* '^https?://(www\.)?tiktok\.com/@'),
  add constraint youtube_url_format check (youtube_url is null or youtube_url ~* '^https?://(www\.)?(youtube\.com/(c/|channel/|user/|@)|youtu\.be/)');

comment on column public.profiles.instagram_url is 'Athletes Instagram profile URL';
comment on column public.profiles.twitter_url is 'Athletes Twitter/X profile URL';
comment on column public.profiles.tiktok_url is 'Athletes TikTok profile URL';
comment on column public.profiles.youtube_url is 'Athletes YouTube channel URL';
