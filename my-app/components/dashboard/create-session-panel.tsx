'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { ImagePlus, Share2, Download, ArrowLeft, Clock3, Copy } from 'lucide-react';
import { createSessionAction } from '@/lib/actions/dashboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ConfirmedSession = {
  id: string;
  session_name: string;
  instructor: string;
  class: string;
  date: string;
  start_time: string;
  end_time: string;
  qr_token: string;
  cover_image_url: string | null;
};

type CreateSessionPanelProps = {
  instructorName: string;
  onCancel: () => void;
  onComplete: (message: string) => void;
};

export function CreateSessionPanel({ instructorName, onCancel, onComplete }: CreateSessionPanelProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState(process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  const [coverFileName, setCoverFileName] = useState('');
  const [confirmedSession, setConfirmedSession] = useState<ConfirmedSession | null>(null);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [startTimeError, setStartTimeError] = useState('');
  const [endTimeError, setEndTimeError] = useState('');

  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset();
  const localNow = new Date(now.getTime() - timezoneOffset * 60_000);
  const todayDate = localNow.toISOString().slice(0, 10);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const isTodaySelected = date === todayDate;
  const startTimeMin = isTodaySelected ? currentTime : undefined;
  const endTimeMin = startTime || undefined;
  const hasValidationErrors = Boolean(startTimeError || endTimeError);

  useEffect(() => {
    setBaseUrl(process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin);
  }, []);

  const normalizedBaseUrl = useMemo(() => baseUrl.replace(/\/$/, ''), [baseUrl]);

  const scanUrl = useMemo(
    () => (confirmedSession ? `${normalizedBaseUrl}/scan/${confirmedSession.id}` : ''),
    [confirmedSession, normalizedBaseUrl]
  );

  useEffect(() => {
    if (!scanUrl) {
      setQrDataUrl('');
      return;
    }

    void QRCode.toDataURL(scanUrl, {
      margin: 2,
      width: 220,
      color: {
        dark: '#111827',
        light: '#ffffff'
      }
    }).then(setQrDataUrl);
  }, [scanUrl]);

  useEffect(() => {
    if (date && startTime && isTodaySelected && startTime < currentTime) {
      setStartTimeError("Start time can't be earlier than the current time.");
      return;
    }

    setStartTimeError('');
  }, [date, startTime, isTodaySelected, currentTime]);

  useEffect(() => {
    if (startTime && endTime && endTime <= startTime) {
      setEndTimeError('End time must be after start time.');
      return;
    }

    setEndTimeError('');
  }, [startTime, endTime]);

  async function handleSubmit(formData: FormData) {
    if (startTimeError || endTimeError) {
      return;
    }

    setMessage('');

    startTransition(async () => {
      const result = await createSessionAction(formData);
      setMessage(result.message);

      if (result.ok && result.session) {
        setConfirmedSession(result.session);
      }
    });
  }

  async function handleShare() {
    if (!scanUrl) {
      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: `${confirmedSession?.session_name} attendance QR`,
        text: 'Scan this QR to log attendance.',
        url: scanUrl
      });
      return;
    }

    await navigator.clipboard.writeText(scanUrl);
    alert('Scan link copied to clipboard.');
  }

  async function handleCopyLink() {
    if (!scanUrl) {
      return;
    }

    await navigator.clipboard.writeText(scanUrl);
    alert('Scan link copied to clipboard.');
  }

  function handleSave() {
    if (!qrDataUrl || !confirmedSession) {
      return;
    }

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${confirmedSession.session_name.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    link.click();
  }

  return (
    <Card className="p-6">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Create Session</h2>
          <p className="mt-1 text-sm text-slate-500">
            {confirmedSession ? 'Session confirmed. QR is now active.' : 'Fill in the details and confirm to generate a live QR code.'}
          </p>

          {!confirmedSession ? (
            <form
              action={handleSubmit}
              className="mt-6 space-y-4"
              onSubmit={(event) => {
                if (hasValidationErrors) {
                  event.preventDefault();
                }
              }}
            >
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Session Name</label>
                <input
                  required
                  name="session_name"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Instructor</label>
                <input
                  required
                  name="instructor"
                  defaultValue={instructorName}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Class</label>
                <input
                  required
                  name="class"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Start Time</label>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="time"
                      name="start_time"
                      value={startTime}
                      min={startTimeMin}
                      onChange={(event) => {
                        const nextStartTime = event.target.value;
                        setStartTime(nextStartTime);

                        if (endTime && nextStartTime && nextStartTime >= endTime) {
                          setEndTime('');
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-9 text-sm shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                    />
                  </div>
                  {startTimeError ? <p className="mt-1 text-xs text-red-600">{startTimeError}</p> : null}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">End Time</label>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      required
                      type="time"
                      name="end_time"
                      value={endTime}
                      min={endTimeMin}
                      onChange={(event) => setEndTime(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-9 text-sm shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                    />
                  </div>
                  {endTimeError ? <p className="mt-1 text-xs text-red-600">{endTimeError}</p> : null}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Date</label>
                  <input
                    required
                    type="date"
                    name="date"
                    value={date}
                    min={todayDate}
                    onChange={(event) => setDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                  <ImagePlus className="h-4 w-4 text-brand-600" />
                  Attach cover picture (optional)
                  <input
                    type="file"
                    accept="image/*"
                    name="cover_image"
                    className="hidden"
                    onChange={(event) => setCoverFileName(event.target.files?.[0]?.name ?? '')}
                  />
                </label>
                {coverFileName ? <p className="text-xs text-slate-500">{coverFileName}</p> : null}
              </div>

              {message ? (
                <p
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm',
                    message.includes('active') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  )}
                >
                  {message}
                </p>
              ) : null}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="danger" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={pending || hasValidationErrors}>
                  {pending ? 'Confirming...' : 'Confirm'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-6 space-y-3 text-sm text-slate-700">
              <p>
                <span className="font-bold text-slate-900">Session Name:</span> {confirmedSession.session_name}
              </p>
              <p>
                <span className="font-bold text-slate-900">Instructor:</span> {confirmedSession.instructor}
              </p>
              <p>
                <span className="font-bold text-slate-900">Class:</span> {confirmedSession.class}
              </p>
              <p>
                <span className="font-bold text-slate-900">Schedule:</span> {confirmedSession.start_time} - {confirmedSession.end_time} |{' '}
                {confirmedSession.date}
              </p>

              <Button type="button" variant="secondary" className="mt-4 gap-2" onClick={() => onComplete('Session created. QR is now active.')}>
                <ArrowLeft className="h-4 w-4" />
                Return
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-center text-3xl font-extrabold text-brand-600">
            QR{' '}
            <span className={cn(confirmedSession ? 'text-emerald-500' : 'text-slate-400')}>
              {confirmedSession ? 'CONFIRMED' : ''}
            </span>
          </p>

          <div className="mt-4 flex justify-center rounded-2xl bg-white p-3 shadow-sm">
            {confirmedSession && qrDataUrl ? (
              <Image src={qrDataUrl} alt="Session QR" width={208} height={208} className="h-52 w-52" unoptimized />
            ) : (
              <div className="flex h-52 w-52 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-400">
                QR pending
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="gap-2 text-xs"
              onClick={handleSave}
              disabled={!confirmedSession || !qrDataUrl}
            >
              <Download className="h-4 w-4" />
              Save QR Code
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="gap-2 text-xs"
              onClick={() => void handleShare()}
              disabled={!confirmedSession}
            >
              <Share2 className="h-4 w-4" />
              Share QR Code
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="gap-2 text-xs"
              onClick={() => void handleCopyLink()}
              disabled={!confirmedSession}
            >
              <Copy className="h-4 w-4" />
              Copy Link
            </Button>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
            <p>
              <span className="font-bold">SESSION NAME:</span> {confirmedSession?.session_name ?? ''}
            </p>
            <p className="mt-1">
              <span className="font-bold">INSTRUCTOR:</span> {confirmedSession?.instructor ?? ''}
            </p>
            <p className="mt-1">
              <span className="font-bold">CLASS:</span> {confirmedSession?.class ?? ''}
            </p>
            <p className="mt-1">
              <span className="font-bold">SCHEDULE:</span>{' '}
              {confirmedSession
                ? `${confirmedSession.start_time} - ${confirmedSession.end_time} | ${confirmedSession.date}`
                : ''}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
