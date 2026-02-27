-- Profile fields + avatar storage migration
-- Run this in Supabase SQL Editor for existing projects.

alter table public.users
  add column if not exists school_id text;

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do nothing;

drop policy if exists "profile_avatars_insert_own" on storage.objects;
create policy "profile_avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile_avatars_update_own" on storage.objects;
create policy "profile_avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile_avatars_delete_own" on storage.objects;
create policy "profile_avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile_avatars_public_read" on storage.objects;
create policy "profile_avatars_public_read" on storage.objects
  for select to public
  using (bucket_id = 'profile-avatars');
