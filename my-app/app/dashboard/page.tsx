export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { TopNavbar } from '@/components/layout/top-navbar';
import { upsertProfileFromAuth } from '@/lib/actions/auth';
import { getDashboardData } from '@/lib/data';

export default async function DashboardPage() {
  await upsertProfileFromAuth();
  const { user, profile, activeSession, currentRun, attendance, sessionPresets } = await getDashboardData();

  if (!user) {
    redirect('/login');
  }

  const userEmail = user.email ?? 'No email';

  return (
    <main className="min-h-screen w-full">
      <TopNavbar email={userEmail} avatarUrl={profile?.avatar_url ?? null} />
      <div className="mx-auto w-full max-w-7xl px-4 pb-6 md:px-8">
        <DashboardClient
          activeSession={activeSession}
          initialAttendance={attendance}
          initialRun={currentRun}
          initialPresets={sessionPresets}
        />
      </div>
    </main>
  );
}
