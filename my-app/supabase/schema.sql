-- Still There database schema
-- Run this script in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  school_id text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.users
  add column if not exists school_id text;

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

create table if not exists public.session_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  run_number int not null,
  status text not null check (status in ('active', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by uuid
);

create index if not exists session_runs_session_id_idx on public.session_runs(session_id);
create unique index if not exists session_runs_session_run_number_unique on public.session_runs(session_id, run_number);
create unique index if not exists session_runs_one_active_per_session on public.session_runs(session_id) where status = 'active';

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
  run_id uuid references public.session_runs(id) on delete cascade,
  student_name text not null,
  student_id text,
  proof_url text not null,
  submitted_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected'))
);

alter table public.attendance_logs
  add column if not exists run_id uuid references public.session_runs(id) on delete cascade;

create index if not exists attendance_logs_run_id_idx on public.attendance_logs(run_id);
create index if not exists attendance_logs_student_id_idx on public.attendance_logs(student_id);
create index if not exists attendance_logs_student_name_lower_idx on public.attendance_logs(lower(student_name));
create unique index if not exists attendance_logs_run_student_unique on public.attendance_logs(run_id, student_id)
where run_id is not null and student_id is not null;
create unique index if not exists attendance_logs_run_student_name_unique on public.attendance_logs(run_id, student_name)
where run_id is not null;

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.session_presets enable row level security;
alter table public.session_runs enable row level security;
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

create policy "session_presets_select_own" on public.session_presets
  for select to authenticated
  using (auth.uid() = user_id);

create policy "session_presets_insert_own" on public.session_presets
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "session_presets_update_own" on public.session_presets
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "session_presets_delete_own" on public.session_presets
  for delete to authenticated
  using (auth.uid() = user_id);

create policy "session_runs_select_owner" on public.session_runs
  for select to authenticated
  using (
    exists (
      select 1
      from public.sessions s
      where s.id = session_runs.session_id and s.user_id = auth.uid()
    )
  );

create policy "session_runs_select_active_public" on public.session_runs
  for select to anon, authenticated
  using (status = 'active');

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
    and exists (
      select 1
      from public.session_runs sr
      where sr.id = attendance_logs.run_id and sr.session_id = attendance_logs.session_id and sr.status = 'active'
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

create policy "attendance_logs_select_self" on public.attendance_logs
  for select to authenticated
  using (
    attendance_logs.student_id = auth.uid()::text
    or (
      auth.jwt()->>'email' is not null
      and attendance_logs.student_id = auth.jwt()->>'email'
    )
    or (
      auth.jwt()->>'email' is not null
      and lower(attendance_logs.student_name) = lower(auth.jwt()->>'email')
    )
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.school_id is not null
        and attendance_logs.student_id = u.school_id
    )
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.full_name is not null
        and lower(attendance_logs.student_name) = lower(u.full_name)
    )
  );

create policy "sessions_select_attended" on public.sessions
  for select to authenticated
  using (
    exists (
      select 1
      from public.attendance_logs al
      where al.session_id = sessions.id
        and (
          al.student_id = auth.uid()::text
          or (
            auth.jwt()->>'email' is not null
            and al.student_id = auth.jwt()->>'email'
          )
          or (
            auth.jwt()->>'email' is not null
            and lower(al.student_name) = lower(auth.jwt()->>'email')
          )
          or exists (
            select 1
            from public.users u
            where u.id = auth.uid()
              and u.school_id is not null
              and al.student_id = u.school_id
          )
          or exists (
            select 1
            from public.users u
            where u.id = auth.uid()
              and u.full_name is not null
              and lower(al.student_name) = lower(u.full_name)
          )
        )
    )
  );

create policy "session_runs_select_attended" on public.session_runs
  for select to authenticated
  using (
    exists (
      select 1
      from public.attendance_logs al
      where al.run_id = session_runs.id
        and al.session_id = session_runs.session_id
        and (
          al.student_id = auth.uid()::text
          or (
            auth.jwt()->>'email' is not null
            and al.student_id = auth.jwt()->>'email'
          )
          or (
            auth.jwt()->>'email' is not null
            and lower(al.student_name) = lower(auth.jwt()->>'email')
          )
          or exists (
            select 1
            from public.users u
            where u.id = auth.uid()
              and u.school_id is not null
              and al.student_id = u.school_id
          )
          or exists (
            select 1
            from public.users u
            where u.id = auth.uid()
              and u.full_name is not null
              and lower(al.student_name) = lower(u.full_name)
          )
        )
    )
  );

create or replace function public.start_or_get_active_run(
  p_session_id uuid,
  p_created_by uuid default null
)
returns public.session_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.session_runs%rowtype;
  v_next_run_number int;
  v_requester uuid;
begin
  if auth.role() = 'anon' then
    raise exception 'Authentication required';
  end if;

  v_requester := auth.uid();

  if v_requester is not null then
    perform 1 from public.sessions where id = p_session_id and user_id = v_requester for update;
  else
    perform 1 from public.sessions where id = p_session_id for update;
  end if;

  if not found then
    raise exception 'Session not found or not owned by caller';
  end if;

  select *
  into v_run
  from public.session_runs
  where session_id = p_session_id and status = 'active'
  order by run_number desc
  limit 1;

  if found then
    return v_run;
  end if;

  select coalesce(max(run_number), 0) + 1
  into v_next_run_number
  from public.session_runs
  where session_id = p_session_id;

  insert into public.session_runs (session_id, run_number, status, started_at, created_by)
  values (p_session_id, v_next_run_number, 'active', now(), coalesce(p_created_by, v_requester))
  returning * into v_run;

  return v_run;
end;
$$;

create or replace function public.pause_run(
  p_session_id uuid
)
returns public.session_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.session_runs%rowtype;
  v_requester uuid;
begin
  if auth.role() = 'anon' then
    raise exception 'Authentication required';
  end if;

  v_requester := auth.uid();

  if v_requester is not null then
    perform 1 from public.sessions where id = p_session_id and user_id = v_requester for update;
  else
    perform 1 from public.sessions where id = p_session_id for update;
  end if;

  if not found then
    raise exception 'Session not found or not owned by caller';
  end if;

  select *
  into v_run
  from public.session_runs
  where session_id = p_session_id and status = 'active'
  order by run_number desc
  limit 1
  for update;

  if not found then
    return null;
  end if;

  update public.session_runs
  set status = 'ended', ended_at = now()
  where id = v_run.id
  returning * into v_run;

  return v_run;
end;
$$;

create or replace function public.resume_run(
  p_session_id uuid,
  p_created_by uuid default null
)
returns public.session_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.session_runs%rowtype;
begin
  select * into v_run from public.start_or_get_active_run(p_session_id, p_created_by);
  return v_run;
end;
$$;

insert into storage.buckets (id, name, public)
values ('session-covers', 'session-covers', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('attendance-proofs', 'attendance-proofs', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
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

create policy "profile_avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

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

create policy "profile_avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_avatars_public_read" on storage.objects
  for select to public
  using (bucket_id = 'profile-avatars');

alter publication supabase_realtime add table public.attendance;
