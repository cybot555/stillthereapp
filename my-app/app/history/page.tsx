export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export default async function HistoryPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: sessions }, { data: attendanceLogs }] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, session_name, class, date, start_time, end_time, status')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(50),
    supabase
      .from('attendance_logs')
      .select(
        'id, student_name, student_id, proof_url, submitted_at, status, sessions!inner(session_name, class, date, start_time, end_time)'
      )
      .eq('sessions.user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(100)
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 md:px-8">
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

      <Card className="overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Schedule</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!sessions?.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No sessions yet.
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr key={session.id}>
                  <td className="px-4 py-3 font-semibold text-slate-700">{session.session_name}</td>
                  <td className="px-4 py-3 text-slate-600">{session.class}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {session.date} | {session.start_time} - {session.end_time}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        session.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {session.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <h2 className="mt-8 text-2xl font-bold text-slate-900">Student Attendance Logs</h2>
      <Card className="mt-4 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Proof</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!attendanceLogs?.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No attendance logs yet.
                </td>
              </tr>
            ) : (
              attendanceLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-slate-700">
                    <p className="font-semibold">{log.student_name}</p>
                    {log.student_id ? <p className="text-xs text-slate-500">{log.student_id}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{log.sessions?.session_name ?? '-'}</td>
                  <td className="px-4 py-3 text-slate-600">{new Date(log.submitted_at).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        log.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : log.status === 'rejected'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {log.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a href={log.proof_url} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 hover:text-brand-800">
                      View proof
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
