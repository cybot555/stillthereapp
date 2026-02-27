-- Session Presets migration
-- Run this in Supabase SQL Editor for existing projects.

create extension if not exists "pgcrypto";

create table if not exists public.session_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_name text not null,
  instructor text not null,
  class text not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

create unique index if not exists session_presets_unique_per_user
on public.session_presets(user_id, session_name, instructor, class, start_time, end_time);

alter table public.session_presets enable row level security;

drop policy if exists "session_presets_select_own" on public.session_presets;
create policy "session_presets_select_own" on public.session_presets
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "session_presets_insert_own" on public.session_presets;
create policy "session_presets_insert_own" on public.session_presets
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "session_presets_update_own" on public.session_presets;
create policy "session_presets_update_own" on public.session_presets
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "session_presets_delete_own" on public.session_presets;
create policy "session_presets_delete_own" on public.session_presets
  for delete to authenticated
  using (auth.uid() = user_id);
