-- Session Runs migration
-- Run this in Supabase SQL Editor for existing projects.

create extension if not exists "pgcrypto";

alter table public.sessions
  add column if not exists is_paused boolean not null default false;

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

alter table public.attendance_logs
  add column if not exists run_id uuid references public.session_runs(id) on delete cascade;

create index if not exists attendance_logs_run_id_idx on public.attendance_logs(run_id);
create unique index if not exists attendance_logs_run_student_unique on public.attendance_logs(run_id, student_id)
where run_id is not null and student_id is not null;
create unique index if not exists attendance_logs_run_student_name_unique on public.attendance_logs(run_id, student_name)
where run_id is not null;

alter table public.session_runs enable row level security;

drop policy if exists "session_runs_select_owner" on public.session_runs;
create policy "session_runs_select_owner" on public.session_runs
  for select to authenticated
  using (
    exists (
      select 1
      from public.sessions s
      where s.id = session_runs.session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "session_runs_select_active_public" on public.session_runs;
create policy "session_runs_select_active_public" on public.session_runs
  for select to anon, authenticated
  using (status = 'active');

drop policy if exists "attendance_logs_insert_if_active" on public.attendance_logs;
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
