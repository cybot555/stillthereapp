export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { SessionHistoryAccordion } from '@/components/history/session-history-accordion';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export default async function AttendedSessionsPage() {
  const supabase = createClient();
  const adminSupabase = createAdminClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase.from('users').select('full_name, school_id').eq('id', user.id).maybeSingle();
  const identifiers = [user.id, user.email, profile?.school_id].filter((value): value is string => Boolean(value));
  const identityNames = [profile?.full_name, user.email]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim())
    .filter(Boolean);

  const logQueries = [
    ...identifiers.map((identifier) =>
      supabase
        .from('attendance_logs')
        .select('id, session_id, run_id, student_name, student_id, proof_url, submitted_at, status')
        .eq('student_id', identifier)
    ),
    ...identityNames.map((name) =>
      supabase
        .from('attendance_logs')
        .select('id, session_id, run_id, student_name, student_id, proof_url, submitted_at, status')
        .ilike('student_name', name)
    )
  ];

  const logResults = await Promise.all(logQueries);
  const logsById = new Map<
    string,
    {
      id: string;
      session_id: string;
      run_id: string | null;
      student_name: string;
      student_id: string | null;
      proof_url: string;
      submitted_at: string;
      status: 'pending' | 'approved' | 'rejected';
    }
  >();

  logResults.forEach(({ data }) => {
    (data ?? []).forEach((log) => {
      logsById.set(log.id, log);
    });
  });

  const attendanceLogs = Array.from(logsById.values()).sort(
    (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  );
  const sessionIds = Array.from(new Set(attendanceLogs.map((log) => log.session_id)));

  const [{ data: sessions }, { data: sessionRuns }] = sessionIds.length
    ? await Promise.all([
        adminSupabase
          .from('sessions')
          .select('id, session_name, instructor, class, date, start_time, end_time, status')
          .in('id', sessionIds)
          .order('date', { ascending: false }),
        adminSupabase
          .from('session_runs')
          .select('id, session_id, run_number, status, started_at, ended_at')
          .in('session_id', sessionIds)
          .order('run_number', { ascending: false })
      ])
    : [{ data: [] }, { data: [] }];
  const attendedRunIds = new Set(attendanceLogs.map((log) => log.run_id).filter((runId): runId is string => Boolean(runId)));
  const filteredSessionRuns = (sessionRuns ?? []).filter((run) => attendedRunIds.has(run.id));

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Attended Sessions</h1>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <SessionHistoryAccordion sessions={sessions ?? []} logs={attendanceLogs} runs={filteredSessionRuns} />
    </main>
  );
}
