'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Camera, CheckCircle2, ImagePlus, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { uploadProofImage } from '@/lib/supabase/storage';
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
  };
};

export function SessionScanForm({ session }: SessionScanFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

    setPending(true);
    setError('');

    try {
      const proofUrl = await uploadProofImage(supabase, session.id, proofFile);

      const { error: logError } = await supabase.from('attendance_logs').insert({
        session_id: session.id,
        student_name: studentName,
        student_id: studentId.trim() || null,
        proof_url: proofUrl,
        status: 'pending'
      });

      if (logError) {
        throw new Error(logError.message);
      }

      // Keep compatibility with the existing dashboard attendance feed.
      await supabase.from('attendance').insert({
        session_id: session.id,
        student_name: studentName,
        proof_image: proofUrl
      });

      setSubmitted(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Failed to submit attendance.');
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-brand-500 via-brand-600 to-fuchsia-500 px-4 py-8 text-white">
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
    <main className="min-h-screen bg-gradient-to-br from-brand-500 via-brand-600 to-fuchsia-500 px-4 py-6 text-white">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-4 flex items-center gap-2">
          <QrCode className="h-6 w-6" />
          <p className="text-sm font-semibold uppercase tracking-wide">Still There</p>
        </div>

        <h1 className="text-3xl font-extrabold">QR CODE SUCCESS</h1>
        <p className="mt-1 text-sm text-white/90">Attach proof to confirm your attendance.</p>

        <div className="mt-4 rounded-3xl bg-white/95 p-4 text-slate-900 shadow-card">
          <h2 className="text-xl font-bold text-brand-700">ATTACH PROOF</h2>

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
                Full Name
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
                placeholder="e.g. 2026-00123"
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
                setFullName('');
                setStudentId('');
                setProofFile(null);
                setPreviewUrl('');
                setError('');
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" className="bg-emerald-500 hover:bg-emerald-600" onClick={() => void handleConfirm()} disabled={pending}>
              {pending ? 'Submitting...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
