import { createClient } from '@/lib/supabase/server';
import { AttendanceLog, AttendanceRecord, Profile, Session, SessionRun } from '@/lib/types/app';

export async function getDashboardData() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      profile: null,
      activeSession: null,
      currentRun: null,
      attendance: [] as AttendanceRecord[],
      history: [] as Session[]
    };
  }

  const [{ data: profile }, { data: activeSession }, { data: history }] = await Promise.all([
    supabase.from('users').select('*').eq('id', user.id).maybeSingle<Profile>(),
    supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<Session>(),
    supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(20)
      .returns<Session[]>()
  ]);

  let attendance: AttendanceRecord[] = [];
  let currentRun: SessionRun | null = null;

  if (activeSession) {
    const [{ data: attendanceData }, { data: runData }] = await Promise.all([
      supabase.from('attendance').select('*').eq('session_id', activeSession.id).order('time_in', { ascending: true }).returns<AttendanceRecord[]>(),
      supabase
        .from('session_runs')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('run_number', { ascending: false })
        .limit(1)
        .maybeSingle<SessionRun>()
    ]);

    attendance = attendanceData ?? [];
    currentRun = runData ?? null;
  }

  return {
    user,
    profile: profile ?? null,
    activeSession: activeSession ?? null,
    currentRun,
    attendance,
    history: history ?? []
  };
}

export async function getAttendanceLogsForInstructor() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return [] as Array<
      AttendanceLog & {
        sessions: Pick<Session, 'session_name' | 'class' | 'instructor' | 'date' | 'start_time' | 'end_time'> | null;
      }
    >;
  }

  const { data } = await supabase
    .from('attendance_logs')
    .select('id, session_id, run_id, student_name, student_id, proof_url, submitted_at, status, sessions!inner(session_name, class, instructor, date, start_time, end_time)')
    .eq('sessions.user_id', user.id)
    .order('submitted_at', { ascending: false });

  return (
    data as Array<
      AttendanceLog & {
        sessions: Pick<Session, 'session_name' | 'class' | 'instructor' | 'date' | 'start_time' | 'end_time'> | null;
      }
    >
  ) ?? [];
}
