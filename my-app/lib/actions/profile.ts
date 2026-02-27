'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type UpdateProfileResult = {
  ok: boolean;
  message: string;
  profile?: {
    full_name: string | null;
    school_id: string | null;
    avatar_url: string | null;
  };
};

function sanitizeFileExtension(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  return ext.replace(/[^a-z0-9]/g, '') || 'jpg';
}

export async function updateProfileAction(formData: FormData): Promise<UpdateProfileResult> {
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

  const fullName = String(formData.get('full_name') ?? '').trim();
  const schoolId = String(formData.get('school_id') ?? '').trim();
  const avatarFile = formData.get('avatar_file');
  let avatarUrl: string | null = null;

  if (avatarFile instanceof File && avatarFile.size > 0) {
    const fileExt = sanitizeFileExtension(avatarFile.name);
    const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('profile-avatars').upload(filePath, avatarFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: avatarFile.type || 'image/jpeg'
    });

    if (uploadError) {
      return {
        ok: false,
        message: uploadError.message
      };
    }

    const { data: publicUrl } = supabase.storage.from('profile-avatars').getPublicUrl(filePath);
    avatarUrl = publicUrl.publicUrl;
  }

  const { data: existingProfile } = await supabase.from('users').select('avatar_url').eq('id', user.id).maybeSingle();

  const payload = {
    id: user.id,
    email: user.email ?? '',
    full_name: fullName || null,
    school_id: schoolId || null,
    avatar_url: avatarUrl ?? existingProfile?.avatar_url ?? null
  };

  const { error: upsertError, data: profile } = await supabase
    .from('users')
    .upsert(payload)
    .select('full_name, school_id, avatar_url')
    .single();

  if (upsertError) {
    return {
      ok: false,
      message: upsertError.message
    };
  }

  revalidatePath('/dashboard');
  revalidatePath('/profile');
  revalidatePath('/attended');

  return {
    ok: true,
    message: 'Profile updated successfully.',
    profile
  };
}
