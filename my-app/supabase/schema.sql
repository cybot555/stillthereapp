-- Still There database schema
-- Run this script in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_name text not null,
  instructor text not null,
  class text not null,
  start_time time not null,
  end_time time not null,
  date date not null,
  status text not null check (status in ('active', 'inactive')) default 'inactive',
  is_paused boolean not null default false,
  qr_token text not null unique,
  cover_image_url text,
  created_at timestamptz not null default now()
);

alter table public.sessions
  add column if not exists is_paused boolean not null default false;

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_name text not null,
  time_in timestamptz not null default now(),
  proof_image text,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_name text not null,
  student_id text,
  proof_url text not null,
  submitted_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected'))
);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.attendance_logs enable row level security;

create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

create policy "sessions_select_own" on public.sessions
  for select using (auth.uid() = user_id);

create policy "sessions_select_active_public" on public.sessions
  for select to anon, authenticated
  using (status = 'active');

create policy "sessions_insert_own" on public.sessions
  for insert with check (auth.uid() = user_id);

create policy "sessions_update_own" on public.sessions
  for update using (auth.uid() = user_id);

create policy "attendance_select_owner" on public.attendance
  for select using (
    exists (
      select 1
      from public.sessions s
      where s.id = attendance.session_id and s.user_id = auth.uid()
    )
  );

create policy "attendance_insert_if_active" on public.attendance
  for insert to anon, authenticated with check (
    exists (
      select 1
      from public.sessions s
      where s.id = attendance.session_id and s.status = 'active' and coalesce(s.is_paused, false) = false
    )
  );

create policy "attendance_logs_insert_if_active" on public.attendance_logs
  for insert to anon, authenticated
  with check (
    exists (
      select 1
      from public.sessions s
      where s.id = attendance_logs.session_id and s.status = 'active' and coalesce(s.is_paused, false) = false
    )
  );

create policy "attendance_logs_select_owner" on public.attendance_logs
  for select to authenticated
  using (
    exists (
      select 1
      from public.sessions s
      where s.id = attendance_logs.session_id and s.user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('session-covers', 'session-covers', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('attendance-proofs', 'attendance-proofs', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true)
on conflict (id) do nothing;

create policy "session_covers_upload_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'session-covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "session_covers_public_read" on storage.objects
  for select to public
  using (bucket_id = 'session-covers');

create policy "attendance_proofs_public_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'attendance-proofs');

create policy "attendance_proofs_public_read" on storage.objects
  for select to public
  using (bucket_id = 'attendance-proofs');

create policy "proofs_public_insert" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'proofs');

create policy "proofs_public_read" on storage.objects
  for select to public
  using (bucket_id = 'proofs');

alter publication supabase_realtime add table public.attendance;
