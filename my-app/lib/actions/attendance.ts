'use server';

import { createAdminClient } from '@/lib/supabase/admin';

type AttendanceResult = {
  ok: boolean;
  message: string;
};

export async function submitAttendanceAction(sessionToken: string, formData: FormData): Promise<AttendanceResult> {
  // Public scan submissions run server-side with service-role permissions.
  const supabase = createAdminClient();
  const studentName = String(formData.get('student_name') ?? '').trim();

  if (!studentName) {
    return {
      ok: false,
      message: 'Student name is required.'
    };
  }

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id, status')
    .eq('qr_token', sessionToken)
    .single();

  if (sessionError || !session) {
    return {
      ok: false,
      message: 'Session not found.'
    };
  }

  if (session.status !== 'active') {
    return {
      ok: false,
      message: 'QR is inactive. Ask your instructor to reopen the session.'
    };
  }

  let proofImageUrl: string | null = null;
  const proofImage = formData.get('proof_image');

  if (proofImage instanceof File && proofImage.size > 0) {
    const fileExt = proofImage.name.split('.').pop() ?? 'jpg';
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${session.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('attendance-proofs')
      .upload(filePath, proofImage, {
        cacheControl: '3600',
        upsert: false,
        contentType: proofImage.type || 'image/jpeg'
      });

    if (!uploadError) {
      const { data: imageData } = supabase.storage.from('attendance-proofs').getPublicUrl(filePath);
      proofImageUrl = imageData.publicUrl;
    }
  }

  const { error } = await supabase.from('attendance').insert({
    session_id: session.id,
    student_name: studentName,
    proof_image: proofImageUrl
  });

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  return {
    ok: true,
    message: 'Attendance recorded successfully.'
  };
}
