'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn, formatSchedule, formatTimeIn } from '@/lib/utils';

type HistorySession = {
  id: string;
  session_name: string;
  instructor: string;
  class: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'active' | 'inactive';
};

type HistoryLog = {
  id: string;
  session_id: string;
  student_name: string;
  student_id: string | null;
  proof_url: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
};

type SessionHistoryAccordionProps = {
  sessions: HistorySession[];
  logs: HistoryLog[];
};

export function SessionHistoryAccordion({ sessions, logs }: SessionHistoryAccordionProps) {
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const logsBySession = useMemo(() => {
    const grouped = new Map<string, HistoryLog[]>();

    logs.forEach((log) => {
      const items = grouped.get(log.session_id) ?? [];
      items.push(log);
      grouped.set(log.session_id, items);
    });

    return grouped;
  }, [logs]);

  if (!sessions.length) {
    return (
      <Card className="p-8 text-center text-slate-500">
        No sessions yet.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="hidden grid-cols-[1.6fr_1fr_0.8fr_1fr_1fr_0.3fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
        <p>Session Name</p>
        <p>Class</p>
        <p>Attendees</p>
        <p>Instructor</p>
        <p>Schedule</p>
        <p className="text-right" />
      </div>

      <div className="divide-y divide-slate-100">
        {sessions.map((session) => {
          const sessionLogs = logsBySession.get(session.id) ?? [];
          const isExpanded = expandedSessionId === session.id;

          return (
            <div key={session.id}>
              <button
                type="button"
                onClick={() => setExpandedSessionId((current) => (current === session.id ? null : session.id))}
                className="w-full px-4 py-4 text-left transition hover:bg-slate-50"
              >
                <div className="space-y-1 md:hidden">
                  <p className="text-base font-bold text-slate-800">{session.session_name}</p>
                  <p className="text-sm text-slate-600">{session.class}</p>
                  <p className="text-xs text-slate-500">{formatSchedule(session.date, session.start_time, session.end_time)}</p>
                  <p className="text-xs font-semibold text-brand-700">
                    {sessionLogs.length} attendee{sessionLogs.length === 1 ? '' : 's'}
                  </p>
                </div>

                <div className="hidden grid-cols-[1.6fr_1fr_0.8fr_1fr_1fr_0.3fr] items-center gap-3 md:grid">
                  <p className="font-semibold text-slate-800">{session.session_name}</p>
                  <p className="text-sm text-slate-600">{session.class}</p>
                  <p className="text-sm font-semibold text-brand-700">{sessionLogs.length}</p>
                  <p className="text-sm text-slate-600">{session.instructor}</p>
                  <p className="text-sm text-slate-600">{session.start_time} - {session.end_time}</p>
                  <span className="ml-auto text-slate-500">{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</span>
                </div>
              </button>

              {isExpanded ? (
                <div className="border-t border-slate-200 bg-slate-50/60 p-4">
                  <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-bold uppercase tracking-wide text-slate-700">Student Attendance Logs</p>
                      </div>

                      {!sessionLogs.length ? (
                        <p className="px-4 py-8 text-center text-sm text-slate-500">No attendance logs for this session yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-4 py-3">Student</th>
                                <th className="px-4 py-3">Time-In</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Proof</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {sessionLogs.map((log) => (
                                <tr key={log.id}>
                                  <td className="px-4 py-3">
                                    <p className="font-semibold text-slate-800">{log.student_name}</p>
                                    {log.student_id ? <p className="text-xs text-slate-500">{log.student_id}</p> : null}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">{formatTimeIn(log.submitted_at)}</td>
                                  <td className="px-4 py-3">
                                    <span
                                      className={cn(
                                        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                                        log.status === 'approved' && 'bg-emerald-100 text-emerald-700',
                                        log.status === 'rejected' && 'bg-rose-100 text-rose-700',
                                        log.status === 'pending' && 'bg-amber-100 text-amber-700'
                                      )}
                                    >
                                      {log.status.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <a
                                      href={log.proof_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-800"
                                    >
                                      View
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="min-h-[260px] rounded-2xl border border-slate-300 bg-slate-200/70" />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
