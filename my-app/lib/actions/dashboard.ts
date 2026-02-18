'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type ActionResult = {
  ok: boolean;
  message: string;
  session?: {
    id: string;
    session_name: string;
    instructor: string;
    class: string;
    date: string;
    start_time: string;
    end_time: string;
    qr_token: string;
    cover_image_url: string | null;
  };
};

function parseTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  return value;
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return value;
}

function getTodayInLocalTimezone() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export async function createSessionAction(formData: FormData): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: 'You need to be logged in to create a session.'
    };
  }

  const sessionName = String(formData.get('session_name') ?? '').trim();
  const instructor = String(formData.get('instructor') ?? '').trim();
  const className = String(formData.get('class') ?? '').trim();
  const date = parseDate(String(formData.get('date') ?? '').trim());
  const startTime = parseTime(String(formData.get('start_time') ?? '').trim());
  const endTime = parseTime(String(formData.get('end_time') ?? '').trim());

  if (!sessionName || !instructor || !className || !date || !startTime || !endTime) {
    return {
      ok: false,
      message: 'Please complete all required fields.'
    };
  }

  if (date < getTodayInLocalTimezone()) {
    return {
      ok: false,
      message: 'Session date cannot be earlier than today.'
    };
  }

  let coverImageUrl: string | null = null;
  const coverImage = formData.get('cover_image');

  if (coverImage instanceof File && coverImage.size > 0) {
    const fileExt = coverImage.name.split('.').pop() ?? 'jpg';
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('session-covers')
      .upload(filePath, coverImage, {
        cacheControl: '3600',
        upsert: false,
        contentType: coverImage.type || 'image/jpeg'
      });

    if (!uploadError) {
      const { data: imageData } = supabase.storage.from('session-covers').getPublicUrl(filePath);
      coverImageUrl = imageData.publicUrl;
    }
  }

  // Keep a single live QR per instructor by closing any previous active session.
  await supabase.from('sessions').update({ status: 'inactive' }).eq('user_id', user.id).eq('status', 'active');

  const qrToken = crypto.randomUUID();
  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      session_name: sessionName,
      instructor,
      class: className,
      date,
      start_time: startTime,
      end_time: endTime,
      status: 'active',
      qr_token: qrToken,
      cover_image_url: coverImageUrl
    })
    .select('id, session_name, instructor, class, date, start_time, end_time, qr_token, cover_image_url')
    .single();

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  revalidatePath('/dashboard');
  revalidatePath('/history');

  return {
    ok: true,
    message: 'Session created. QR is now active.',
    session
  };
}

export async function endSessionAction(sessionId: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: 'Authentication required.'
    };
  }

  const { error } = await supabase
    .from('sessions')
    .update({ status: 'inactive' })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  revalidatePath('/dashboard');
  revalidatePath('/history');

  return {
    ok: true,
    message: 'Session ended. QR is inactive.'
  };
}

export async function setSessionPauseAction(sessionId: string, paused: boolean): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: 'Authentication required.'
    };
  }

  const { error } = await supabase
    .from('sessions')
    .update({ is_paused: paused })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  revalidatePath('/dashboard');
  revalidatePath('/history');

  return {
    ok: true,
    message: paused ? 'Attendance paused.' : 'Attendance resumed.'
  };
}
