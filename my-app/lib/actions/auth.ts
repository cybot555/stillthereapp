'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function signOutAction() {
  const supabase = createClient();

  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function upsertProfileFromAuth() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { data: existingProfile } = await supabase
    .from('users')
    .select('full_name, school_id, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  await supabase.from('users').upsert({
    id: user.id,
    email: user.email ?? '',
    full_name: existingProfile?.full_name ?? user.user_metadata.full_name ?? user.user_metadata.name ?? null,
    school_id: existingProfile?.school_id ?? null,
    avatar_url: existingProfile?.avatar_url ?? user.user_metadata.avatar_url ?? null
  });
}
