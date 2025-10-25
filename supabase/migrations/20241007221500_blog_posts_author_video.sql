alter table public.blog_posts
  add column if not exists author_override text,
  add column if not exists video_url text;
