'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const message = searchParams.get('message');
  const next = searchParams.get('next');

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (signInError) {
      setError(signInError.message);
      setPending(false);
      return;
    }

    const redirectTo = next && next.startsWith('/') ? next : '/dashboard';
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex items-center justify-center px-6 py-10 lg:px-16">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
          <div className="mb-8">
            <Image
              src="/icons/stilltherelogo.png"
              alt="Still There logo"
              width={420}
              height={120}
              className="mx-auto h-24 w-auto object-contain"
              priority
            />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Log in</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in with your email and password to open your instructor dashboard.</p>

          <form className="mt-6 space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none ring-brand-500 transition focus:border-brand-500 focus:ring-2"
                placeholder="you@school.edu"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none ring-brand-500 transition focus:border-brand-500 focus:ring-2"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Signing in...' : 'Sign in'}
            </button>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {!error && message ? <p className="text-sm text-red-600">{message}</p> : null}
          </form>

          <p className="mt-6 text-sm text-slate-600">
            New here?
            <Link
              href={next && next.startsWith('/') ? `/signup?next=${encodeURIComponent(next)}` : '/signup'}
              className="ml-1 font-semibold text-brand-700 hover:text-brand-800"
            >
              Create an account
            </Link>
          </p>

          {/* <p className="mt-8 text-xs text-slate-500">
            Scanning students do not need to log in. They can open direct links under the
            <Link href="/scan/demo" className="ml-1 font-semibold text-brand-700">
              
            </Link>
            .
          </p> */}
        </div>
      </section>

      <section className="hidden bg-gradient-to-br from-brand-500 via-brand-500 to-brand-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold leading-none">
            Welcome,
          </h2>
          <h2 className="-mt-2 text-8xl font-extrabold leading-none">
            still there?
          </h2>
        </div>

        {/* <div className="max-w-md rounded-3xl bg-white/10 p-6 backdrop-blur-sm">
          <p className="text-lg font-semibold">Live QR attendance for modern classrooms.</p>
          <p className="mt-2 text-sm text-white/85">
            Create one session, display one code, and track arrivals in real time.
          </p>
        </div> */}
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
