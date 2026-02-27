'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Camera, CheckCircle2, ImagePlus, LogIn, UserRoundCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { submitAttendanceAction } from '@/lib/actions/attendance';
import { formatSchedule } from '@/lib/utils';

type SessionScanFormProps = {
  session: {
    id: string;
    session_name: string;
    instructor: string;
    class: string;
    date: string;
    start_time: string;
    end_time: string;
    status: 'active' | 'inactive';
    is_paused: boolean;
    active_run_number: number | null;
  };
};

export function SessionScanForm({ session }: SessionScanFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [entryMode, setEntryMode] = useState<'gate' | 'guest' | 'account'>('gate');
  const [linkToAccount, setLinkToAccount] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountFullName, setAccountFullName] = useState('');
  const [accountSchoolId, setAccountSchoolId] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isPaused, setIsPaused] = useState(Boolean(session.is_paused));
  const [isActive, setIsActive] = useState(session.status === 'active');
  const [activeRunNumber, setActiveRunNumber] = useState<number | null>(session.active_run_number);
  const pausedMessage = 'Attendance logging is currently paused by the instructor.';
  const closedMessage = 'This session is closed.';

  useEffect(() => {
    let mounted = true;

    async function loadAccountProfile() {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (!user) {
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(true);
      setAccountEmail(user.email ?? '');

      const { data: profile } = await supabase.from('users').select('full_name, school_id').eq('id', user.id).maybeSingle();

      if (!mounted) {
        return;
      }

      setAccountFullName(profile?.full_name ?? '');
      setAccountSchoolId(profile?.school_id ?? '');
    }

    void loadAccountProfile();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    async function refreshSessionState() {
      const [{ data, error: sessionStateError }, { data: activeRun }] = await Promise.all([
        supabase.from('sessions').select('status, is_paused').eq('id', session.id).maybeSingle(),
        supabase
          .from('session_runs')
          .select('run_number, status')
          .eq('session_id', session.id)
          .eq('status', 'active')
          .order('run_number', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      if (!mounted) {
        return;
      }

      if (sessionStateError || !data) {
        setIsActive(false);
        setActiveRunNumber(null);
        return;
      }

      setIsActive(data.status === 'active');
      setIsPaused(Boolean(data.is_paused));
      setActiveRunNumber(activeRun?.run_number ?? null);
    }

    void refreshSessionState();
    const intervalId = window.setInterval(() => {
      void refreshSessionState();
    }, 5000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [session.id, supabase]);

  const blockedMessage = !isActive ? closedMessage : isPaused || !activeRunNumber ? pausedMessage : '';

  useEffect(() => {
    if (!blockedMessage && (error === pausedMessage || error === closedMessage)) {
      setError('');
    }
  }, [blockedMessage, closedMessage, error, pausedMessage]);

  function handlePickedFile(file: File | null) {
    setProofFile(file);
    setError('');

    if (!file) {
      setPreviewUrl('');
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleConfirm() {
    const studentName = fullName.trim();

    if (!studentName) {
      setError('Full Name is required.');
      return;
    }

    if (!proofFile) {
      setError('Please attach a proof photo before confirming.');
      return;
    }

    if (blockedMessage) {
      setError(blockedMessage);
      return;
    }

    setPending(true);
    setError('');

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      const effectiveStudentId = linkToAccount ? studentId.trim() || user?.id || user?.email || '' : studentId.trim();

      const formData = new FormData();
      formData.set('student_name', studentName);
      formData.set('student_id', effectiveStudentId);
      formData.set('proof_image', proofFile);

      const result = await submitAttendanceAction(session.id, formData);

      if (!result.ok) {
        setIsPaused(Boolean(result.isPaused));
        setIsActive(result.isActive ?? true);
        setActiveRunNumber(result.runNumber ?? null);
        throw new Error(result.message);
      }

      setActiveRunNumber(result.runNumber ?? activeRunNumber);
      setSubmitted(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Failed to submit attendance.');
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-brand-500 via-brand-500 to-brand-500 px-4 py-8 text-white">
        <div className="mx-auto w-full max-w-md rounded-3xl bg-white/95 p-6 text-center text-slate-900 shadow-card">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-3 text-2xl font-extrabold text-emerald-600">ATTENDANCE LOGGED</h1>
          <p className="mt-2 text-sm text-slate-600">Your proof was submitted successfully.</p>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-700">
            <p>
              <span className="font-semibold text-slate-900">Session:</span> {session.session_name}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-slate-900">Instructor:</span> {session.instructor}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-slate-900">Class:</span> {session.class}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-slate-900">Schedule:</span>{' '}
              {formatSchedule(session.date, session.start_time, session.end_time)}
            </p>
          </div>

          <Link href="/" className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white">
            Return
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-500 via-brand-500 to-brand-500 px-4 py-6 text-white">
      <div className="mx-auto w-full max-w-md">
        {entryMode === 'gate' ? (
          <>
            <div className="mb-5 flex justify-center">
              <Image
                src="/icons/stilltherelogomobile.png"
                alt="Still There"
                width={340}
                height={96}
                className="h-28 w-auto max-w-full object-contain"
                priority
              />
            </div>

            <h1 className="text-center text-4xl font-extrabold text-lime-300">QR CODE SUCCESS</h1>
            <p className="mt-1 text-center text-sm text-white/90">Choose how you want to continue.</p>

            <div className="mt-4 rounded-3xl bg-white/95 p-4 text-slate-900 shadow-card transition-all duration-300 ease-in-out">
              <h2 className="text-xl font-bold text-brand-700">ATTENDANCE OPTIONS</h2>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <p>
                  <span className="font-bold text-slate-900">SESSION NAME:</span> {session.session_name}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-slate-900">INSTRUCTOR:</span> {session.instructor}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-slate-900">CLASS:</span> {session.class}
                </p>
                <p className="mt-1">
                  <span className="font-bold text-slate-900">SCHEDULE:</span>{' '}
                  {formatSchedule(session.date, session.start_time, session.end_time)}
                </p>
              </div>

              <div className="mt-4 space-y-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-center gap-2 transition-all duration-300 ease-in-out"
                  onClick={() => {
                    setEntryMode('guest');
                    setLinkToAccount(false);
                    setFullName('');
                    setStudentId('');
                    setError('');
                  }}
                >
                  Continue without logging in
                </Button>

                {isAuthenticated ? (
                  <Button
                    type="button"
                    className="w-full justify-center gap-2 transition-all duration-300 ease-in-out"
                    onClick={() => {
                      setEntryMode('account');
                      setLinkToAccount(true);
                      setFullName(accountFullName || accountEmail || '');
                      setStudentId(accountSchoolId || '');
                      setError('');
                    }}
                  >
                    <UserRoundCheck className="h-4 w-4" />
                    Continue with account
                  </Button>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:bg-brand-700"
                  >
                    <LogIn className="h-4 w-4" />
                    Log in first
                  </Link>
                )}
              </div>

              {!isAuthenticated ? (
                <p className="mt-3 text-xs text-slate-500">Log in from here to access your account, then scan this QR again.</p>
              ) : null}
            </div>
          </>
        ) : null}

        {entryMode !== 'gate' ? (
          <>
        <div className="mb-5 flex justify-center">
          <Image
            src="/icons/stilltherelogomobile.png"
            alt="Still There"
            width={340}
            height={96}
            className="h-28 w-auto max-w-full object-contain"
            priority
          />
        </div>

        <h1 className="text-5xl font-extrabold text-lime-300 text-center">QR CODE SUCCESS</h1>
        <p className="mt-1 text-sm text-white/90 text-center">Attach proof to confirm your attendance.</p>

        <div className="mt-4 rounded-3xl bg-white/95 p-4 text-slate-900 shadow-card">
          <h2 className="text-xl font-bold text-brand-700">ATTACH PROOF</h2>
          {entryMode === 'account' ? (
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Account mode: fields prefilled from profile</p>
          ) : null}

          {blockedMessage ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition-all duration-300 ease-in-out">
              ⚠ {blockedMessage}
            </div>
          ) : null}

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            <p>
              <span className="font-bold text-slate-900">SESSION NAME:</span> {session.session_name}
            </p>
            <p className="mt-1">
              <span className="font-bold text-slate-900">INSTRUCTOR:</span> {session.instructor}
            </p>
            <p className="mt-1">
              <span className="font-bold text-slate-900">CLASS:</span> {session.class}
            </p>
            <p className="mt-1">
              <span className="font-bold text-slate-900">SCHEDULE:</span>{' '}
              {formatSchedule(session.date, session.start_time, session.end_time)}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="full_name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Full Name *
              </label>
              <input
                id="full_name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
            </div>

            <div>
              <label htmlFor="student_id" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Student ID (Optional)
              </label>
              <input
                id="student_id"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                placeholder="e.g. 2024-123456"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => handlePickedFile(event.target.files?.[0] ?? null)}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handlePickedFile(event.target.files?.[0] ?? null)}
          />

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" className="gap-2" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="h-4 w-4" />
              Use Camera
            </Button>
            <Button type="button" variant="secondary" className="gap-2" onClick={() => uploadInputRef.current?.click()}>
              <ImagePlus className="h-4 w-4" />
              Upload Image
            </Button>
          </div>

          <div className="mt-4 rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-3">
            {previewUrl ? (
              <Image src={previewUrl} alt="Proof preview" width={320} height={220} className="h-auto w-full rounded-xl object-cover" />
            ) : (
              <p className="text-center text-xs font-medium text-slate-500">No proof image selected yet.</p>
            )}
          </div>

          {proofFile ? <p className="mt-2 text-xs text-slate-600">{proofFile.name}</p> : null}
          {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (entryMode === 'account') {
                  setFullName(accountFullName || accountEmail || '');
                  setStudentId(accountSchoolId || '');
                } else {
                  setFullName('');
                  setStudentId('');
                }
                setProofFile(null);
                setPreviewUrl('');
                setError('');
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-emerald-500 transition-all duration-300 ease-in-out hover:bg-emerald-600"
              onClick={() => void handleConfirm()}
              disabled={pending || Boolean(blockedMessage)}
            >
              {pending ? 'Submitting...' : 'Log Attendance'}
            </Button>
          </div>
        </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
