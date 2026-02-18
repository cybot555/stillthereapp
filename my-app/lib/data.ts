import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AttendanceRecord, Profile, Session } from '@/lib/types/app';

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

  if (activeSession) {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('session_id', activeSession.id)
      .order('time_in', { ascending: true })
      .returns<AttendanceRecord[]>();

    attendance = data ?? [];
  }

  return {
    user,
    profile: profile ?? null,
    activeSession: activeSession ?? null,
    attendance,
    history: history ?? []
  };
}

export async function getSessionByToken(token: string) {
  const supabase = createAdminClient();

  const { data } = await supabase.from('sessions').select('*').eq('qr_token', token).maybeSingle<Session>();

  return data ?? null;
}
