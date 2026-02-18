export const dynamic = 'force-dynamic';

import { SessionScanForm } from '@/components/scan/session-scan-form';
import { Card } from '@/components/ui/card';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatSchedule } from '@/lib/utils';

type ScanPageProps = {
  params: {
    sessionId: string;
  };
};

export default async function ScanPage({ params }: ScanPageProps) {
  const supabase = createAdminClient();
  const { data: session } = await supabase
    .from('sessions')
    .select('id, session_name, instructor, class, date, start_time, end_time, status')
    .eq('id', params.sessionId)
    .maybeSingle();

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-500 via-brand-600 to-fuchsia-500 p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Invalid QR / Session not found</h1>
          <p className="mt-2 text-sm text-slate-600">This QR code is invalid, expired, or belongs to another environment.</p>
        </Card>
      </main>
    );
  }

  if (session.status !== 'active') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-500 via-brand-600 to-fuchsia-500 p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Session closed / QR inactive</h1>
          <p className="mt-2 text-sm text-slate-600">{formatSchedule(session.date, session.start_time, session.end_time)}</p>
        </Card>
      </main>
    );
  }

  return (
    <SessionScanForm
      session={{
        id: session.id,
        session_name: session.session_name,
        instructor: session.instructor,
        class: session.class,
        date: session.date,
        start_time: session.start_time,
        end_time: session.end_time
      }}
    />
  );
}
