'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Copy, Download, Share2 } from 'lucide-react';
import { Session } from '@/lib/types/app';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { formatSchedule } from '@/lib/utils';

type QrPanelProps = {
  session: Session;
  active: boolean;
  paused?: boolean;
  updatingPause?: boolean;
  onTogglePause?: () => void;
};

export function QrPanel({ session, active, paused = false, updatingPause = false, onTogglePause }: QrPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState(process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');

  useEffect(() => {
    setBaseUrl(process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin);
  }, []);

  const normalizedBaseUrl = useMemo(() => baseUrl.replace(/\/$/, ''), [baseUrl]);
  const scanUrl = useMemo(() => `${normalizedBaseUrl}/scan/${session.id}`, [normalizedBaseUrl, session.id]);

  useEffect(() => {
    if (!active) {
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
  }, [active, scanUrl]);

  async function handleShare() {
    if (!active) {
      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: `${session.session_name} attendance QR`,
        text: 'Scan this QR to log attendance.',
        url: scanUrl
      });
      return;
    }

    await navigator.clipboard.writeText(scanUrl);
    alert('Scan link copied to clipboard.');
  }

  async function handleCopyLink() {
    if (!active) {
      return;
    }

    await navigator.clipboard.writeText(scanUrl);
    alert('Scan link copied to clipboard.');
  }

  function handleSave() {
    if (!active || !qrDataUrl) {
      return;
    }

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${session.session_name.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    link.click();
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-slate-800">QR</h3>
        <div className="flex items-center gap-2">
          <StatusPill active={active && !paused} />

          <Button
            type="button"
            variant={paused ? 'secondary' : 'danger'}
            onClick={onTogglePause}
            disabled={!active || updatingPause}
            className="transition-all duration-300 ease-in-out"
          >
            {updatingPause ? (paused ? 'Resuming...' : 'Pausing...') : paused ? 'Resume Attendance' : 'Pause Attendance'}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <div className={`rounded-2xl border border-slate-200 bg-white p-3 transition-all duration-300 ease-in-out ${paused ? 'grayscale' : ''}`}>
          {active && qrDataUrl ? (
            <Image src={qrDataUrl} alt="Attendance QR" width={208} height={208} className="h-52 w-52" unoptimized />
          ) : (
            <div className="flex h-52 w-52 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-400">
              QR Disabled
            </div>
          )}
        </div>
      </div>

      {paused ? (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-center text-xs font-semibold text-rose-700 transition-all duration-300 ease-in-out">
          ⚠ Attendance is paused by the instructor.
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button type="button" variant="ghost" className="flex-1 gap-2" onClick={handleSave} disabled={!active || !qrDataUrl}>
          <Download className="h-4 w-4" />
          Save QR
        </Button>
        <Button type="button" variant="ghost" className="flex-1 gap-2" onClick={() => void handleShare()} disabled={!active}>
          <Share2 className="h-4 w-4" />
          Share QR
        </Button>
        <Button type="button" variant="ghost" className="flex-1 gap-2" onClick={() => void handleCopyLink()} disabled={!active}>
          <Copy className="h-4 w-4" />
          Copy Link
        </Button>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <p>
          <span className="font-bold text-slate-700">SESSION NAME:</span> {session.session_name}
        </p>
        <p className="mt-1">
          <span className="font-bold text-slate-700">INSTRUCTOR:</span> {session.instructor}
        </p>
        <p className="mt-1">
          <span className="font-bold text-slate-700">CLASS:</span> {session.class}
        </p>
        <p className="mt-1">
          <span className="font-bold text-slate-700">SCHEDULE:</span>{' '}
          {formatSchedule(session.date, session.start_time, session.end_time)}
        </p>
      </div>
    </Card>
  );
}
