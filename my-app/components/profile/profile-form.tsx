'use client';

import { ChangeEvent, FormEvent, useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { Camera } from 'lucide-react';
import { updateProfileAction } from '@/lib/actions/profile';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type ProfileFormProps = {
  email: string;
  fullName: string;
  schoolId: string;
  avatarUrl: string | null;
};

export function ProfileForm({ email, fullName, schoolId, avatarUrl }: ProfileFormProps) {
  const [pending, startTransition] = useTransition();
  const [nameValue, setNameValue] = useState(fullName);
  const [schoolIdValue, setSchoolIdValue] = useState(schoolId);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [liveAvatarUrl, setLiveAvatarUrl] = useState<string | null>(avatarUrl);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    const formData = new FormData();
    formData.set('full_name', nameValue);
    formData.set('school_id', schoolIdValue);
    if (file) {
      formData.set('avatar_file', file);
    }

    startTransition(async () => {
      const result = await updateProfileAction(formData);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setMessage(result.message);
      if (result.profile?.avatar_url) {
        setLiveAvatarUrl(result.profile.avatar_url);
      }
      setFile(null);
    });
  }

  return (
    <Card className="mx-auto mt-6 w-full max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
      <p className="mt-1 text-sm text-slate-600">Update your display name, school ID, and avatar.</p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
            <Image
              src={previewUrl ?? liveAvatarUrl ?? '/icons/pfplogo.png'}
              alt="Profile photo"
              fill
              className="object-cover"
              unoptimized={Boolean(previewUrl || liveAvatarUrl)}
            />
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700">
            <Camera className="h-4 w-4" />
            Upload profile photo
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Email
          </label>
          <input
            id="email"
            value={email}
            disabled
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
          />
        </div>

        <div>
          <label htmlFor="full_name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Full Name
          </label>
          <input
            id="full_name"
            value={nameValue}
            onChange={(event) => setNameValue(event.target.value)}
            placeholder="Enter your full name"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
          />
        </div>

        <div>
          <label htmlFor="school_id" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            School ID
          </label>
          <input
            id="school_id"
            value={schoolIdValue}
            onChange={(event) => setSchoolIdValue(event.target.value)}
            placeholder="Enter your school ID"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
          />
        </div>

        {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p> : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
