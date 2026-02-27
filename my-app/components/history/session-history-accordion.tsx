'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

type HistoryRun = {
  id: string;
  session_id: string;
  run_number: number;
  status: 'active' | 'ended';
  started_at: string;
  ended_at: string | null;
};

type HistoryLog = {
  id: string;
  session_id: string;
  run_id: string | null;
  student_name: string;
  student_id: string | null;
  proof_url: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
};

type SessionHistoryAccordionProps = {
  sessions: HistorySession[];
  logs: HistoryLog[];
  runs: HistoryRun[];
};

export function SessionHistoryAccordion({ sessions, logs, runs }: SessionHistoryAccordionProps) {
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [selectedRunBySession, setSelectedRunBySession] = useState<Record<string, string>>({});
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [isExportMode, setIsExportMode] = useState(false);

  const logsBySession = useMemo(() => {
    const grouped = new Map<string, HistoryLog[]>();

    logs.forEach((log) => {
      const items = grouped.get(log.session_id) ?? [];
      items.push(log);
      grouped.set(log.session_id, items);
    });

    return grouped;
  }, [logs]);

  const logsByRun = useMemo(() => {
    const grouped = new Map<string, HistoryLog[]>();

    logs.forEach((log) => {
      if (!log.run_id) {
        return;
      }

      const items = grouped.get(log.run_id) ?? [];
      items.push(log);
      grouped.set(log.run_id, items);
    });

    return grouped;
  }, [logs]);

  const runsBySession = useMemo(() => {
    const grouped = new Map<string, HistoryRun[]>();

    runs.forEach((run) => {
      const items = grouped.get(run.session_id) ?? [];
      items.push(run);
      grouped.set(run.session_id, items);
    });

    grouped.forEach((sessionRuns, sessionId) => {
      grouped.set(
        sessionId,
        [...sessionRuns].sort((a, b) => b.run_number - a.run_number)
      );
    });

    return grouped;
  }, [runs]);

  useEffect(() => {
    const validIds = new Set(sessions.map((session) => session.id));
    setSelectedSessionIds((previous) => previous.filter((id) => validIds.has(id)));
  }, [sessions]);

  useEffect(() => {
    if (!isExportMode) {
      setSelectedSessionIds([]);
    }
  }, [isExportMode]);

  const selectedCount = selectedSessionIds.length;

  function toggleSessionSelection(sessionId: string) {
    setSelectedSessionIds((previous) =>
      previous.includes(sessionId) ? previous.filter((id) => id !== sessionId) : [...previous, sessionId]
    );
  }

  async function exportSessions(mode: 'all' | 'selected') {
    const targetIds = mode === 'all' ? sessions.map((session) => session.id) : selectedSessionIds;

    if (!targetIds.length) {
      return;
    }

    const targetIdSet = new Set(targetIds);
    const targetSessions = sessions.filter((session) => targetIdSet.has(session.id));
    const targetRuns = runs.filter((run) => targetIdSet.has(run.session_id));
    const targetLogs = logs.filter((log) => targetIdSet.has(log.session_id));
    const sessionById = new Map(targetSessions.map((session) => [session.id, session]));
    const runById = new Map(targetRuns.map((run) => [run.id, run]));

    const sessionRows = targetSessions.map((session) => {
      const attendeeCount = (logsBySession.get(session.id) ?? []).length;
      const runCount = (runsBySession.get(session.id) ?? []).length;

      return {
        session_id: session.id,
        session_name: session.session_name,
        class: session.class,
        instructor: session.instructor,
        date: session.date,
        start_time: session.start_time,
        end_time: session.end_time,
        schedule: formatSchedule(session.date, session.start_time, session.end_time),
        attendees: attendeeCount,
        runs: runCount,
        status: session.status
      };
    });

    const runRows = targetRuns.map((run) => {
      const runLogs = logsByRun.get(run.id) ?? [];

      return {
        run_id: run.id,
        session_id: run.session_id,
        session_name: sessionById.get(run.session_id)?.session_name ?? '',
        run_number: run.run_number,
        status: run.status,
        started_at: run.started_at,
        ended_at: run.ended_at,
        attendees: runLogs.length
      };
    });

    const attendeesByRunRows = targetRuns.flatMap((run) => {
      const runLogs = logsByRun.get(run.id) ?? [];
      const session = sessionById.get(run.session_id);

      return runLogs.map((log) => ({
        session_id: run.session_id,
        session_name: session?.session_name ?? '',
        class: session?.class ?? '',
        run_id: run.id,
        run_number: run.run_number,
        student_name: log.student_name,
        student_id: log.student_id,
        submitted_at: log.submitted_at,
        status: log.status,
        proof_url: log.proof_url
      }));
    });

    const logRows = targetLogs.map((log) => ({
      log_id: log.id,
      session_id: log.session_id,
      run_id: log.run_id,
      run_number: log.run_id ? (runById.get(log.run_id)?.run_number ?? '') : '',
      student_name: log.student_name,
      student_id: log.student_id,
      submitted_at: log.submitted_at,
      status: log.status,
      proof_url: log.proof_url
    }));

    const today = new Date().toISOString().slice(0, 10);
    const fileSuffix = mode === 'all' ? 'all-sessions' : 'selected-sessions';

    setExporting(true);

    try {
      const xlsx = await import('xlsx');
      const workbook = xlsx.utils.book_new();

      xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(sessionRows), 'Sessions');
      xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(runRows), 'Runs');
      xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(attendeesByRunRows), 'Attendees by Run');
      xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(logRows), 'Attendance Logs');

      xlsx.writeFile(workbook, `still-there-${fileSuffix}-${today}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportAll() {
    const allSessionIds = sessions.map((session) => session.id);
    setSelectedSessionIds(allSessionIds);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await exportSessions('all');
  }

  if (!sessions.length) {
    return <Card className="p-8 text-center text-slate-500">No sessions yet.</Card>;
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-end border-b border-slate-200 bg-white px-4 py-3">
        {!isExportMode ? (
          <Button
            type="button"
            variant="secondary"
            className="gap-2 transition-all duration-300 ease-in-out"
            disabled={exporting}
            onClick={() => setIsExportMode(true)}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2 transition-all duration-300 ease-in-out">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{selectedCount} selected</span>
            <Button
              type="button"
              variant="ghost"
              className="transition-all duration-300 ease-in-out"
              disabled={exporting}
              onClick={() => setIsExportMode(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="gap-2 transition-all duration-300 ease-in-out"
              disabled={!selectedCount || exporting}
              onClick={() => exportSessions('selected')}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              type="button"
              className="gap-2 transition-all duration-300 ease-in-out"
              disabled={exporting}
              onClick={handleExportAll}
            >
              <Download className="h-4 w-4" />
              Export all
            </Button>
          </div>
        )}
      </div>

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
          const sessionRuns = runsBySession.get(session.id) ?? [];
          const legacyRunKey = `legacy-${session.id}`;
          const hasLegacyLogs = sessionLogs.some((log) => !log.run_id);
          const selectedRunId = selectedRunBySession[session.id] ?? sessionRuns[0]?.id ?? (hasLegacyLogs ? legacyRunKey : '');
          const selectedRunLogs =
            selectedRunId === legacyRunKey
              ? sessionLogs.filter((log) => !log.run_id)
              : logsByRun.get(selectedRunId) ?? [];
          const isExpanded = expandedSessionId === session.id;

          return (
            <div key={session.id}>
              <div className="flex items-start gap-3 px-4 py-4 transition hover:bg-slate-50 md:items-center">
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    isExportMode ? 'w-5 opacity-100' : 'w-0 opacity-0'
                  )}
                >
                  <input
                    type="checkbox"
                    aria-label={`Select ${session.session_name}`}
                    checked={selectedSessionIds.includes(session.id)}
                    onChange={() => toggleSessionSelection(session.id)}
                    disabled={!isExportMode}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-300 md:mt-0"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const nextExpanded = expandedSessionId === session.id ? null : session.id;
                    setExpandedSessionId(nextExpanded);

                    if (nextExpanded && !selectedRunBySession[session.id]) {
                      const defaultRunId = sessionRuns[0]?.id ?? (hasLegacyLogs ? legacyRunKey : '');

                      if (defaultRunId) {
                        setSelectedRunBySession((previous) => ({
                          ...previous,
                          [session.id]: defaultRunId
                        }));
                      }
                    }
                  }}
                  className="w-full text-left"
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
                    <p className="text-sm text-slate-600">{formatSchedule(session.date, session.start_time, session.end_time)}</p>
                    <span className="ml-auto text-slate-500">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </span>
                  </div>
                </button>
              </div>

              {isExpanded ? (
                <div className="border-t border-slate-200 bg-slate-50/60 p-4">
                  <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
                    <div className="space-y-4">
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-sm font-bold uppercase tracking-wide text-slate-700">Runs</p>
                        </div>

                        {!sessionRuns.length && !hasLegacyLogs ? (
                          <p className="px-4 py-6 text-sm text-slate-500">No runs created for this session yet.</p>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {sessionRuns.map((run) => {
                              const runLogs = logsByRun.get(run.id) ?? [];
                              const selected = selectedRunId === run.id;

                              return (
                                <button
                                  key={run.id}
                                  type="button"
                                  className={cn(
                                    'grid w-full grid-cols-[0.7fr_1fr_1fr_0.5fr] items-center gap-2 px-4 py-3 text-left transition',
                                    selected ? 'bg-brand-50' : 'hover:bg-slate-50'
                                  )}
                                  onClick={() =>
                                    setSelectedRunBySession((previous) => ({
                                      ...previous,
                                      [session.id]: run.id
                                    }))
                                  }
                                >
                                  <p className="text-sm font-bold text-slate-800">RUN #{run.run_number}</p>
                                  <p className="text-xs text-slate-500">Started: {formatTimeIn(run.started_at)}</p>
                                  <p className="text-xs text-slate-500">
                                    Ended: {run.ended_at ? formatTimeIn(run.ended_at) : 'In progress'}
                                  </p>
                                  <div className="justify-self-end">
                                    <span
                                      className={cn(
                                        'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
                                        run.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                                      )}
                                    >
                                      {run.status} · {runLogs.length}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}

                            {hasLegacyLogs ? (
                              <button
                                type="button"
                                className={cn(
                                  'grid w-full grid-cols-[0.7fr_1fr_1fr_0.5fr] items-center gap-2 px-4 py-3 text-left transition',
                                  selectedRunId === legacyRunKey ? 'bg-brand-50' : 'hover:bg-slate-50'
                                )}
                                onClick={() =>
                                  setSelectedRunBySession((previous) => ({
                                    ...previous,
                                    [session.id]: legacyRunKey
                                  }))
                                }
                              >
                                <p className="text-sm font-bold text-slate-800">LEGACY</p>
                                <p className="text-xs text-slate-500">Logs created before runs</p>
                                <p />
                                <div className="justify-self-end">
                                  <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                    {sessionLogs.filter((log) => !log.run_id).length}
                                  </span>
                                </div>
                              </button>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                          <p className="text-sm font-bold uppercase tracking-wide text-slate-700">Student Attendance Logs</p>
                        </div>

                        {!selectedRunLogs.length ? (
                          <p className="px-4 py-8 text-center text-sm text-slate-500">No attendance logs for this run yet.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                  <th className="px-4 py-3">Student</th>
                                  <th className="px-4 py-3">Time-In</th>
                                  <th className="px-4 py-3">Status</th>
                                  <th className="px-4 py-3 text-center">Proof</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {selectedRunLogs.map((log) => (
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
                                    <td className="px-4 py-3 text-center">
                                    <a
                                      href={log.proof_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex w-full items-center justify-center gap-2 font-semibold text-brand-700 hover:text-brand-800"
                                    >
                                      <Image
                                        src="/icons/viewprooflogo.png"
                                        alt="View proof"
                                        width={84}
                                        height={16}
                                        className="h-8 w-auto object-contain"
                                      />
                                    </a>
                                  </td>
                                </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
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
