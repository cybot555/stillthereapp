'use server';

import { createAdminClient } from '@/lib/supabase/admin';

type SubmitAttendanceResult = {
  ok: boolean;
  message: string;
  isPaused?: boolean;
  isActive?: boolean;
  runNumber?: number | null;
};

function sanitizeFileExtension(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  return ext.replace(/[^a-z0-9]/g, '') || 'jpg';
}

async function getSessionAndRunState(supabase: ReturnType<typeof createAdminClient>, sessionId: string) {
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, status, is_paused')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError || !session) {
    return {
      session: null,
      activeRun: null,
      error: 'Invalid QR / Session not found'
    };
  }

  const { data: activeRun } = await supabase
    .from('session_runs')
    .select('id, run_number, status')
    .eq('session_id', session.id)
    .eq('status', 'active')
    .order('run_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    session,
    activeRun: activeRun ?? null,
    error: null
  };
}

export async function logAttendance(
  sessionId: string,
  studentName: string,
  studentId: string | null,
  proofUrl: string
): Promise<SubmitAttendanceResult> {
  const supabase = createAdminClient();
  const { session, activeRun, error } = await getSessionAndRunState(supabase, sessionId);

  if (error || !session) {
    return {
      ok: false,
      message: error ?? 'Invalid QR / Session not found'
    };
  }

  if (session.status !== 'active') {
    return {
      ok: false,
      message: 'This session is closed.',
      isActive: false,
      isPaused: Boolean(session.is_paused),
      runNumber: null
    };
  }

  if (session.is_paused || !activeRun) {
    return {
      ok: false,
      message: 'Attendance logging is currently paused by the instructor.',
      isActive: true,
      isPaused: true,
      runNumber: activeRun?.run_number ?? null
    };
  }

  let duplicateQuery = supabase.from('attendance_logs').select('id').eq('run_id', activeRun.id).limit(1);
  duplicateQuery = studentId ? duplicateQuery.eq('student_id', studentId) : duplicateQuery.eq('student_name', studentName);

  const { data: existingLog } = await duplicateQuery.maybeSingle();

  if (existingLog) {
    return {
      ok: false,
      message: 'Already logged for this run.',
      isActive: true,
      isPaused: false,
      runNumber: activeRun.run_number
    };
  }

  const { error: logsInsertError } = await supabase.from('attendance_logs').insert({
    session_id: session.id,
    run_id: activeRun.id,
    student_name: studentName,
    student_id: studentId,
    proof_url: proofUrl,
    status: 'pending'
  });

  if (logsInsertError) {
    return {
      ok: false,
      message: logsInsertError.code === '23505' ? 'Already logged for this run.' : logsInsertError.message,
      isActive: true,
      isPaused: false,
      runNumber: activeRun.run_number
    };
  }

  const { error: attendanceInsertError } = await supabase.from('attendance').insert({
    session_id: session.id,
    student_name: studentName,
    proof_image: proofUrl
  });

  if (attendanceInsertError) {
    return {
      ok: false,
      message: attendanceInsertError.message,
      isActive: true,
      isPaused: false,
      runNumber: activeRun.run_number
    };
  }

  return {
    ok: true,
    message: 'Attendance recorded successfully.',
    isActive: true,
    isPaused: false,
    runNumber: activeRun.run_number
  };
}

export async function submitAttendanceAction(sessionId: string, formData: FormData): Promise<SubmitAttendanceResult> {
  const supabase = createAdminClient();
  const studentName = String(formData.get('student_name') ?? '').trim();
  const studentId = String(formData.get('student_id') ?? '').trim();
  const proofImage = formData.get('proof_image');

  if (!studentName) {
    return {
      ok: false,
      message: 'Full Name is required.'
    };
  }

  if (!(proofImage instanceof File) || proofImage.size === 0) {
    return {
      ok: false,
      message: 'Please attach a proof photo before confirming.'
    };
  }

  const fileExt = sanitizeFileExtension(proofImage.name);
  const filePath = `${sessionId}/${crypto.randomUUID()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage.from('proofs').upload(filePath, proofImage, {
    cacheControl: '3600',
    upsert: false,
    contentType: proofImage.type || 'image/jpeg'
  });

  if (uploadError) {
    return {
      ok: false,
      message: uploadError.message
    };
  }

  const { data: proofUrlData } = supabase.storage.from('proofs').getPublicUrl(filePath);
  const proofUrl = proofUrlData.publicUrl;

  return logAttendance(sessionId, studentName, studentId || null, proofUrl);
}
