'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import DatePicker from 'react-datepicker';
import { format as formatDate } from 'date-fns';
import { ImagePlus, Share2, Download, ArrowLeft, Clock3, Copy, CalendarDays, FileUp } from 'lucide-react';
import { createSessionAction, importSessionPresetsAction } from '@/lib/actions/dashboard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SessionPreset } from '@/lib/types/app';
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
  presets: SessionPreset[];
  onCancel: () => void;
  onComplete: (message: string) => void;
};

function toTimeString(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function toDateString(value: Date) {
  return formatDate(value, 'yyyy-MM-dd');
}

function parseDateInput(value: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function parseTimeInput(value: string, baseDate: Date) {
  if (!value) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

type ParsedPresetRow = {
  session_name: string;
  instructor: string;
  class: string;
  start_time: string;
  end_time: string;
  row_number: number;
};

function normalizeHeader(value: string) {
  return value.toLowerCase().trim().replace(/[\s-]+/g, '_');
}

function getCellValue(row: Record<string, unknown>, aliases: string[]) {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));

  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliases.has(normalizeHeader(key))) {
      return String(value ?? '').trim();
    }
  }

  return '';
}

async function parsePresetFile(file: File): Promise<ParsedPresetRow[]> {
  const xlsx = await import('xlsx');
  const fileBuffer = await file.arrayBuffer();
  const workbook = xlsx.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  const records = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  return records.map((record, index) => ({
    session_name: getCellValue(record, ['session_name', 'session', 'session name']),
    instructor: getCellValue(record, ['instructor', 'teacher', 'professor']),
    class: getCellValue(record, ['class', 'class_name', 'section']),
    start_time: getCellValue(record, ['start_time', 'start time', 'start']),
    end_time: getCellValue(record, ['end_time', 'end time', 'end']),
    row_number: index + 2
  }));
}

export function CreateSessionPanel({ presets, onCancel, onComplete }: CreateSessionPanelProps) {
  const presetFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [importing, startImportTransition] = useTransition();
  const [message, setMessage] = useState<string>('');
  const [importMessage, setImportMessage] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [baseUrl, setBaseUrl] = useState(process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  const [coverFileName, setCoverFileName] = useState('');
  const [confirmedSession, setConfirmedSession] = useState<ConfirmedSession | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [className, setClassName] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetOptions, setPresetOptions] = useState<SessionPreset[]>(presets);
  const [useCustomTimes, setUseCustomTimes] = useState(false);
  const [startTimeError, setStartTimeError] = useState('');
  const [endTimeError, setEndTimeError] = useState('');

  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset();
  const localNow = new Date(now.getTime() - timezoneOffset * 60_000);
  const todayDate = localNow.toISOString().slice(0, 10);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const isTodaySelected = date === todayDate;
  const hasValidationErrors = Boolean(startTimeError || endTimeError);
  const hasMissingRequiredFields = !sessionName.trim() || !instructorName.trim() || !className.trim() || !date || !startTime || !endTime;
  const selectedDate = parseDateInput(date) ?? localNow;
  const selectedStartDate = parseTimeInput(startTime, selectedDate);
  const selectedEndDate = parseTimeInput(endTime, selectedDate);
  const todayMinDate = parseDateInput(todayDate) ?? new Date();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date();
  dayEnd.setHours(23, 59, 59, 999);
  const minStartTime = parseTimeInput(currentTime, localNow) ?? dayStart;
  const minEndTime = selectedStartDate ?? dayStart;
  const startTimeMin = isTodaySelected ? currentTime : undefined;
  const endTimeMin = startTime || undefined;

  useEffect(() => {
    setBaseUrl(process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin);
  }, []);

  useEffect(() => {
    setPresetOptions(presets);
  }, [presets]);

  useEffect(() => {
    if (!selectedPresetId) {
      return;
    }

    const selectedPreset = presetOptions.find((preset) => preset.id === selectedPresetId);

    if (!selectedPreset) {
      return;
    }

    setSessionName(selectedPreset.session_name);
    setInstructorName(selectedPreset.instructor);
    setClassName(selectedPreset.class);
    setStartTime(selectedPreset.start_time.slice(0, 5));
    setEndTime(selectedPreset.end_time.slice(0, 5));
  }, [presetOptions, selectedPresetId]);

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

    if (!sessionName.trim() || !instructorName.trim() || !className.trim() || !date || !startTime || !endTime) {
      setMessage('Please fill out all required fields.');
      return;
    }

    formData.set('session_name', sessionName.trim());
    formData.set('instructor', instructorName.trim());
    formData.set('class', className.trim());
    formData.set('date', date);
    formData.set('start_time', startTime);
    formData.set('end_time', endTime);

    setMessage('');

    startTransition(async () => {
      const result = await createSessionAction(formData);
      setMessage(result.message);

      if (result.ok && result.session) {
        setConfirmedSession(result.session);
      }
    });
  }

  function handleImportPresets(file: File | null) {
    if (!file) {
      return;
    }

    setImportMessage('');
    setImportErrors([]);

    startImportTransition(async () => {
      try {
        const rows = await parsePresetFile(file);
        const result = await importSessionPresetsAction(rows);
        setImportMessage(result.message);
        setImportErrors(result.errors);

        if (result.ok && result.presets) {
          setPresetOptions(result.presets as SessionPreset[]);
        }
      } catch (error) {
        setImportMessage(error instanceof Error ? error.message : 'Failed to parse file.');
        setImportErrors([]);
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
                if (hasValidationErrors || hasMissingRequiredFields) {
                  event.preventDefault();
                }
              }}
            >
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Import Presets</label>
                    <input
                      ref={presetFileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={(event) => {
                        handleImportPresets(event.target.files?.[0] ?? null);
                        event.target.value = '';
                      }}
                    />
                    <Button type="button" variant="secondary" className="gap-2" onClick={() => presetFileInputRef.current?.click()}>
                      <FileUp className="h-4 w-4" />
                      {importing ? 'Importing...' : 'Upload CSV/XLSX'}
                    </Button>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Use Preset</label>
                    <select
                      value={selectedPresetId}
                      onChange={(event) => setSelectedPresetId(event.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-brand-400"
                    >
                      <option value="">Select a preset</option>
                      {presetOptions.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.session_name} • {preset.class} • {preset.start_time.slice(0, 5)}-{preset.end_time.slice(0, 5)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {importMessage ? (
                  <p className={cn('mt-2 text-xs font-medium', importErrors.length ? 'text-amber-700' : 'text-emerald-700')}>{importMessage}</p>
                ) : null}
                {importErrors.length ? <p className="mt-1 text-xs text-rose-600">{importErrors.slice(0, 3).join(' ')}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Session Name</label>
                <input
                  required
                  name="session_name"
                  value={sessionName}
                  onChange={(event) => setSessionName(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Instructor</label>
                <input
                  required
                  name="instructor"
                  value={instructorName}
                  onChange={(event) => setInstructorName(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Class</label>
                <input
                  required
                  name="class"
                  value={className}
                  onChange={(event) => setClassName(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Start Time</label>
                    <button
                      type="button"
                      onClick={() => setUseCustomTimes((current) => !current)}
                      className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 hover:text-blue-700"
                    >
                      {useCustomTimes ? 'Use Picker' : 'Custom'}
                    </button>
                  </div>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    {useCustomTimes ? (
                      <input
                        type="time"
                        value={startTime}
                        min={startTimeMin}
                        onChange={(event) => {
                          const nextStartTime = event.target.value;
                          setStartTime(nextStartTime);

                          if (endTime && nextStartTime && nextStartTime >= endTime) {
                            setEndTime('');
                          }
                        }}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-center text-sm shadow-sm outline-none transition-all duration-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                      />
                    ) : (
                      <DatePicker
                        selected={selectedStartDate}
                        onChange={(value: Date | null) => {
                          if (!value) {
                            setStartTime('');
                            return;
                          }

                          const nextStartTime = toTimeString(value);
                          setStartTime(nextStartTime);

                          if (endTime && nextStartTime && nextStartTime >= endTime) {
                            setEndTime('');
                          }
                        }}
                        showTimeSelect
                        showTimeSelectOnly
                        showTimeInput
                        timeIntervals={15}
                        dateFormat="hh:mm aa"
                        minTime={isTodaySelected ? minStartTime : dayStart}
                        maxTime={dayEnd}
                        placeholderText="Select start time"
                        wrapperClassName="!block w-full"
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-center text-sm shadow-sm outline-none transition-all duration-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                        calendarClassName="tailwind-datepicker-calendar"
                        popperClassName="tailwind-datepicker-popper"
                      />
                    )}
                  </div>
                  <input type="hidden" name="start_time" value={startTime} />
                  {startTimeError ? <p className="mt-1 text-xs text-red-600">{startTimeError}</p> : null}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">End Time</label>
                  <div className="relative">
                    <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    {useCustomTimes ? (
                      <input
                        type="time"
                        value={endTime}
                        min={endTimeMin}
                        onChange={(event) => setEndTime(event.target.value)}
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-center text-sm shadow-sm outline-none transition-all duration-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                      />
                    ) : (
                      <DatePicker
                        selected={selectedEndDate}
                        onChange={(value: Date | null) => {
                          if (!value) {
                            setEndTime('');
                            return;
                          }

                          setEndTime(toTimeString(value));
                        }}
                        showTimeSelect
                        showTimeSelectOnly
                        showTimeInput
                        timeIntervals={15}
                        dateFormat="hh:mm aa"
                        minTime={minEndTime}
                        maxTime={dayEnd}
                        placeholderText="Select end time"
                        wrapperClassName="!block w-full"
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-center text-sm shadow-sm outline-none transition-all duration-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                        calendarClassName="tailwind-datepicker-calendar"
                        popperClassName="tailwind-datepicker-popper"
                      />
                    )}
                  </div>
                  <input type="hidden" name="end_time" value={endTime} />
                  {endTimeError ? <p className="mt-1 text-xs text-red-600">{endTimeError}</p> : null}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Date</label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <DatePicker
                      selected={parseDateInput(date)}
                      onChange={(value: Date | null) => setDate(value ? toDateString(value) : '')}
                      minDate={todayMinDate}
                      dateFormat="MM/dd/yyyy"
                      placeholderText="Select date"
                      wrapperClassName="!block w-full"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-center text-sm shadow-sm outline-none transition-all duration-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-200"
                      calendarClassName="tailwind-datepicker-calendar"
                      popperClassName="tailwind-datepicker-popper"
                    />
                  </div>
                  <input type="hidden" name="date" value={date} />
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
                <Button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600"
                  disabled={pending || hasValidationErrors || hasMissingRequiredFields}
                >
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
