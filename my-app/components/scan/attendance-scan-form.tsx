'use client';

import { useState, useTransition } from 'react';
import { submitAttendanceAction } from '@/lib/actions/attendance';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AttendanceScanFormProps = {
  sessionToken: string;
  active: boolean;
};

export function AttendanceScanForm({ sessionToken, active }: AttendanceScanFormProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  async function handleSubmit(formData: FormData) {
    setMessage('');

    startTransition(async () => {
      const result = await submitAttendanceAction(sessionToken, formData);
      setMessage(result.message);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="student_name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Student Name
        </label>
        <input
          id="student_name"
          name="student_name"
          required
          disabled={!active || pending}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-brand-400 disabled:cursor-not-allowed disabled:bg-slate-100"
          placeholder="Enter your full name"
        />
      </div>

      <div>
        <label htmlFor="proof_image" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Proof Image (Optional)
        </label>
        <input
          id="proof_image"
          name="proof_image"
          type="file"
          accept="image/*"
          disabled={!active || pending}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-brand-700 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </div>

      <Button type="submit" disabled={!active || pending} className="w-full">
        {pending ? 'Submitting...' : 'Submit Attendance'}
      </Button>

      {message ? (
        <p
          className={cn(
            'rounded-lg px-3 py-2 text-sm',
            message.includes('successfully') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          )}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
