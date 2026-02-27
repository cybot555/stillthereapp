export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { TopNavbar } from '@/components/layout/top-navbar';
import { ProfileForm } from '@/components/profile/profile-form';
import { createClient } from '@/lib/supabase/server';
import { upsertProfileFromAuth } from '@/lib/actions/auth';

export default async function ProfilePage() {
  await upsertProfileFromAuth();
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('users').select('full_name, school_id, avatar_url').eq('id', user.id).maybeSingle();

  return (
    <main className="min-h-screen w-full">
      <TopNavbar email={user.email ?? 'No email'} avatarUrl={profile?.avatar_url ?? null} />
      <div className="mx-auto w-full max-w-7xl px-4 pb-8 md:px-8">
        <ProfileForm
          email={user.email ?? ''}
          fullName={profile?.full_name ?? ''}
          schoolId={profile?.school_id ?? ''}
          avatarUrl={profile?.avatar_url ?? null}
        />
      </div>
    </main>
  );
}
