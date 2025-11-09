-- Create blog-images storage bucket
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

-- Allow admins to upload images
create policy "Admins can upload blog images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'blog-images'
  and auth.uid() in (select user_id from public.admins)
);

-- Allow admins to update images
create policy "Admins can update blog images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'blog-images'
  and auth.uid() in (select user_id from public.admins)
);

-- Allow admins to delete images
create policy "Admins can delete blog images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'blog-images'
  and auth.uid() in (select user_id from public.admins)
);

-- Allow public read access
create policy "Anyone can view blog images"
on storage.objects for select
to public
using (bucket_id = 'blog-images');
