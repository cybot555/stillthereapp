'use server';

import { createAdminClient } from '@/lib/supabase/admin';

type SubmitAttendanceResult = {
  ok: boolean;
  message: string;
  isPaused?: boolean;
  isActive?: boolean;
};

function sanitizeFileExtension(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  return ext.replace(/[^a-z0-9]/g, '') || 'jpg';
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

  // Server-side guard: never insert attendance if session is closed/paused.
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, status, is_paused')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError || !session) {
    return {
      ok: false,
      message: 'Invalid QR / Session not found'
    };
  }

  if (session.status !== 'active') {
    return {
      ok: false,
      message: 'This session is closed.',
      isActive: false,
      isPaused: Boolean(session.is_paused)
    };
  }

  if (session.is_paused) {
    return {
      ok: false,
      message: 'Attendance logging is currently paused by the instructor.',
      isActive: true,
      isPaused: true
    };
  }

  const fileExt = sanitizeFileExtension(proofImage.name);
  const filePath = `${session.id}/${crypto.randomUUID()}.${fileExt}`;

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

  const { error: logsInsertError } = await supabase.from('attendance_logs').insert({
    session_id: session.id,
    student_name: studentName,
    student_id: studentId || null,
    proof_url: proofUrl,
    status: 'pending'
  });

  if (logsInsertError) {
    return {
      ok: false,
      message: logsInsertError.message
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
      message: attendanceInsertError.message
    };
  }

  return {
    ok: true,
    message: 'Attendance recorded successfully.',
    isActive: true,
    isPaused: false
  };
}
