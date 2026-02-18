export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { TopNavbar } from '@/components/layout/top-navbar';
import { upsertProfileFromAuth } from '@/lib/actions/auth';
import { getDashboardData } from '@/lib/data';
import { getDisplayName } from '@/lib/utils';

export default async function DashboardPage() {
  await upsertProfileFromAuth();
  const { user, profile, activeSession, attendance } = await getDashboardData();

  if (!user) {
    redirect('/login');
  }

  const fullName =
    getDisplayName(profile?.full_name ?? user.user_metadata.full_name ?? user.user_metadata.name ?? 'Sir Cyrus');

  return (
    <main className="min-h-screen w-full">
      <TopNavbar fullName={fullName} />
      <div className="mx-auto w-full max-w-7xl px-4 pb-6 md:px-8">
        <DashboardClient fullName={fullName} activeSession={activeSession} initialAttendance={attendance} />
      </div>
    </main>
  );
}
