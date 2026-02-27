-- Attended Sessions access migration
-- Run this in Supabase SQL Editor.

alter table public.users
  add column if not exists school_id text;

create index if not exists attendance_logs_student_id_idx on public.attendance_logs(student_id);
create index if not exists attendance_logs_student_name_lower_idx on public.attendance_logs(lower(student_name));

drop policy if exists "attendance_logs_select_self" on public.attendance_logs;
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

drop policy if exists "sessions_select_attended" on public.sessions;

drop policy if exists "session_runs_select_attended" on public.session_runs;
