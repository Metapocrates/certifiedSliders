alter table public.blog_posts
  add column if not exists featured boolean not null default false;
