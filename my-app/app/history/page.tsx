export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { SessionHistoryAccordion } from '@/components/history/session-history-accordion';
import { createClient } from '@/lib/supabase/server';

export default async function HistoryPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, session_name, instructor, class, date, start_time, end_time, status')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(50);

  const sessionIds = (sessions ?? []).map((session) => session.id);
  const { data: attendanceLogs } = sessionIds.length
    ? await supabase
        .from('attendance_logs')
        .select('id, session_id, student_name, student_id, proof_url, submitted_at, status')
        .in('session_id', sessionIds)
        .order('submitted_at', { ascending: false })
        .limit(300)
    : { data: [] };

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Session History</h1>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <SessionHistoryAccordion sessions={sessions ?? []} logs={attendanceLogs ?? []} />
    </main>
  );
}
