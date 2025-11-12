-- Create blog-images storage bucket with full configuration
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];

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
