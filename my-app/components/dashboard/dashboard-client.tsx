'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck2, Clock3, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { endSessionAction, setSessionPauseAction } from '@/lib/actions/dashboard';
import { AttendanceRecord, Session } from '@/lib/types/app';
import { ActionTile } from '@/components/dashboard/action-tile';
import { AttendanceList } from '@/components/dashboard/attendance-list';
import { CreateSessionPanel } from '@/components/dashboard/create-session-panel';
import { EmptyQrCard } from '@/components/dashboard/empty-qr-card';
import { QrPanel } from '@/components/dashboard/qr-panel';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatSchedule } from '@/lib/utils';

type DashboardClientProps = {
  fullName: string;
  activeSession: Session | null;
  initialAttendance: AttendanceRecord[];
};

export function DashboardClient({ fullName, activeSession, initialAttendance }: DashboardClientProps) {
  const router = useRouter();
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [attendance, setAttendance] = useState(initialAttendance);
  const [feedback, setFeedback] = useState('');
  const [sessionState, setSessionState] = useState<Session | null>(activeSession);
  const [ending, startEnding] = useTransition();
  const [updatingPause, startUpdatingPause] = useTransition();

  useEffect(() => {
    setSessionState(activeSession);
  }, [activeSession]);

  useEffect(() => {
    setAttendance(initialAttendance);
  }, [initialAttendance]);

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    // Live updates for the currently active session only.
    const supabase = createClient();
    const channel = supabase
      .channel(`attendance-live-${activeSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `session_id=eq.${activeSession.id}`
        },
        (payload) => {
          const record = payload.new as AttendanceRecord;
          setAttendance((prev) => {
            if (prev.some((item) => item.id === record.id)) {
              return prev;
            }

            return [...prev, record].sort((a, b) => new Date(a.time_in).getTime() - new Date(b.time_in).getTime());
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeSession]);

  const schedule = useMemo(() => {
    if (!sessionState) {
      return '';
    }

    return formatSchedule(sessionState.date, sessionState.start_time, sessionState.end_time);
  }, [sessionState]);

  function handleCompleteCreate(message: string) {
    setShowCreatePanel(false);
    setFeedback(message);
    router.refresh();
  }

  function handleEndSession() {
    if (!sessionState) {
      return;
    }

    const currentSession = sessionState;

    startEnding(async () => {
      const result = await endSessionAction(currentSession.id);
      setFeedback(result.message);

      if (result.ok) {
        router.refresh();
      }
    });
  }

  function handleTogglePause() {
    if (!sessionState || sessionState.status !== 'active') {
      return;
    }

    const nextPaused = !sessionState.is_paused;
    const previous = sessionState;

    setSessionState({
      ...sessionState,
      is_paused: nextPaused
    });

    startUpdatingPause(async () => {
      const result = await setSessionPauseAction(sessionState.id, nextPaused);
      setFeedback(result.message);

      if (!result.ok) {
        setSessionState(previous);
        return;
      }

      router.refresh();
    });
  }

  return (
    <section className="mt-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <ActionTile title="Create Session" icon={Plus} onClick={() => setShowCreatePanel((prev) => !prev)} />
        <ActionTile title="View History" icon={CalendarCheck2} href="/history" />
      </div>

      {feedback ? <p className="rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">{feedback}</p> : null}

      {showCreatePanel ? (
        <CreateSessionPanel
          instructorName={fullName}
          onCancel={() => setShowCreatePanel(false)}
          onComplete={handleCompleteCreate}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Session</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">{sessionState?.session_name ?? 'No active session'}</h2>
              </div>

              {sessionState ? (
                <div className="text-right">
                  <div className="inline-flex items-center justify-end gap-1 text-sm font-semibold text-slate-600">
                    <Clock3 className="h-4 w-4" />
                    {schedule}
                  </div>
                </div>
              ) : null}
            </div>

            {sessionState ? (
              <>
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  <p>
                    <span className="font-semibold text-slate-700">Instructor:</span> {sessionState.instructor}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-700">Class:</span> {sessionState.class}
                  </p>
                </div>

                <div className="mt-5">
                  <AttendanceList records={attendance} />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button type="button" variant="danger" onClick={handleEndSession} disabled={ending}>
                    {ending ? 'Ending...' : 'End Session'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-500">
                Create a session to generate your live QR and start receiving real-time attendance.
              </div>
            )}
          </Card>

          {sessionState ? (
            <QrPanel
              session={sessionState}
              active={sessionState.status === 'active'}
              paused={sessionState.is_paused}
              updatingPause={updatingPause}
              onTogglePause={handleTogglePause}
            />
          ) : (
            <EmptyQrCard />
          )}
        </div>
      )}
    </section>
  );
}
