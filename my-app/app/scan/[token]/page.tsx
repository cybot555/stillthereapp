export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { AttendanceScanForm } from '@/components/scan/attendance-scan-form';
import { Card } from '@/components/ui/card';
import { getSessionByToken } from '@/lib/data';

export default async function ScanPage({ params }: { params: { token: string } }) {
  const session = await getSessionByToken(params.token);

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center p-5">
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-2xl font-bold text-slate-800">Session Not Found</h1>
          <p className="mt-2 text-sm text-slate-600">The QR token is invalid or has expired.</p>
        </Card>
      </main>
    );
  }

  const isActive = session.status === 'active';

  return (
    <main className="flex min-h-screen items-center justify-center p-5">
      <Card className="w-full max-w-lg p-6">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Still There Attendance</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{session.session_name}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {session.class} | {session.date} | {session.start_time} - {session.end_time}
          </p>
          <span
            className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
              isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isActive ? 'QR ACTIVE' : 'QR INACTIVE'}
          </span>
        </div>

        <AttendanceScanForm sessionToken={params.token} active={isActive} />

        <p className="mt-6 text-center text-xs text-slate-500">
          Instructor dashboard is available at
          <Link href="/login" className="ml-1 font-semibold text-brand-700">
            /login
          </Link>
        </p>
      </Card>
    </main>
  );
}
