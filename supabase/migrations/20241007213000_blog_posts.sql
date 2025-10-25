-- Blog posts schema for Certified Sliders media hub

create table if not exists public.blog_posts (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    slug text not null unique,
    cover_image_url text,
    excerpt text,
    content text not null,
    author_id uuid references public.profiles(id) on delete set null,
    tags text[] default array[]::text[],
    status text not null default 'draft', -- 'draft' | 'published'
    published_at timestamptz,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists blog_posts_status_published_idx
  on public.blog_posts (status, published_at desc nulls last);

create index if not exists blog_posts_tags_gin_idx
  on public.blog_posts using gin (tags);

-- Automatically refresh updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row
  execute procedure public.set_updated_at();

-- RLS policies
alter table public.blog_posts enable row level security;

-- Readers can see published posts (status = 'published' and published_at <= now)
drop policy if exists "Public published blog posts" on public.blog_posts;
create policy "Public published blog posts"
  on public.blog_posts
  for select
  using (status = 'published' and (published_at is null or published_at <= timezone('utc', now())));

-- Admins can manage everything
drop policy if exists "Admins manage blog posts" on public.blog_posts;
create policy "Admins manage blog posts"
  on public.blog_posts
  for all
  using (
    auth.uid() in (
      select user_id from public.admins
    )
  )
  with check (
    auth.uid() in (
      select user_id from public.admins
    )
  );
