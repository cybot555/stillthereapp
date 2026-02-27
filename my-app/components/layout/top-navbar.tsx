'use client';

import Image from 'next/image';
import Link from 'next/link';
import { BookCheck, LogOut, UserCircle2 } from 'lucide-react';
import { signOutAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';

type TopNavbarProps = {
  email: string;
  avatarUrl?: string | null;
};

export function TopNavbar({ email, avatarUrl = null }: TopNavbarProps) {
  return (
    <header className="w-full bg-gradient-to-r from-brand-500 via-brand-500 to-brand-500 text-white shadow-card">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/30 bg-white/20">
            <Image src={avatarUrl ?? '/icons/pfplogo.png'} alt="Profile" fill className="object-cover" unoptimized={Boolean(avatarUrl)} />
          </div>
          <p className="text-sm font-bold md:text-lg">Welcome, {email}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/30 md:text-sm"
          >
            <UserCircle2 className="h-4 w-4" />
            Profile
          </Link>
          <Link
            href="/attended"
            className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/30 md:text-sm"
          >
            <BookCheck className="h-4 w-4" />
            View Attended Sessions
          </Link>

          <form action={signOutAction}>
            <Button type="submit" variant="danger" className="gap-2 rounded-lg px-3 py-1.5 text-xs md:text-sm">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
