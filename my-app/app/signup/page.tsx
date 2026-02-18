'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setPending(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password
    });

    if (signUpError) {
      setError(signUpError.message);
      setPending(false);
      return;
    }

    if (data.session) {
      router.push('/dashboard');
      router.refresh();
      return;
    }

    setSuccess('Account created. Check your email to confirm your account before logging in.');
    setPending(false);
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

          <h1 className="text-2xl font-bold text-slate-900">Create account</h1>
          <p className="mt-2 text-sm text-slate-600">Sign up with email and password to access your instructor dashboard.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSignup}>
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
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none ring-brand-500 transition focus:border-brand-500 focus:ring-2"
                placeholder="Choose a strong password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none ring-brand-500 transition focus:border-brand-500 focus:ring-2"
                placeholder="Re-enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Creating account...' : 'Create account'}
            </button>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {!error && success ? <p className="text-sm text-emerald-700">{success}</p> : null}
          </form>

          <p className="mt-6 text-sm text-slate-600">
            Already have an account?
            <Link href="/login" className="ml-1 font-semibold text-brand-700 hover:text-brand-800">
              Log in
            </Link>
          </p>
        </div>
      </section>

      <section className="hidden bg-gradient-to-br from-brand-500 via-brand-500 to-brand-500 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold leading-none">
            Will you be,
          </h2>
          <h2 className="-mt-2 text-8xl font-extrabold leading-none">
            still there?
          </h2>
        </div>

        {/* <div className="max-w-md rounded-3xl bg-white/10 p-6 backdrop-blur-sm">
          <p className="text-lg font-semibold">Set up once and track attendance instantly.</p>
          <p className="mt-2 text-sm text-white/85">Start with secure email authentication backed by Supabase.</p>
        </div> */}
      </section>
    </main>
  );
}
