'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookCheck, LogOut, MoreHorizontal, UserCircle2 } from 'lucide-react';
import { signOutAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';

type TopNavbarProps = {
  email: string;
  avatarUrl?: string | null;
};

export function TopNavbar({ email, avatarUrl = null }: TopNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <header className="w-full bg-gradient-to-r from-brand-500 via-brand-500 to-brand-500 text-white shadow-card">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/30 bg-white/20">
            <Image src={avatarUrl ?? '/icons/pfplogo.png'} alt="Profile" fill className="object-cover" unoptimized={Boolean(avatarUrl)} />
          </div>
          <p className="text-sm font-bold md:text-lg">Welcome, {email}</p>
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/20 text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/30"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          <div
            className={`absolute right-0 top-12 z-50 w-56 origin-top-right rounded-xl border border-white/25 bg-white/95 p-1.5 text-slate-800 shadow-xl backdrop-blur-sm transition-all duration-200 ${
              menuOpen ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0'
            }`}
          >
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-slate-100"
            >
              <UserCircle2 className="h-4 w-4 text-slate-500" />
              Profile
            </Link>

            <Link
              href="/attended"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-slate-100"
            >
              <BookCheck className="h-4 w-4 text-slate-500" />
              View Attended Sessions
            </Link>

            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                className="mt-1 flex w-full justify-start gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
