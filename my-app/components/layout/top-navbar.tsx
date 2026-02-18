'use client';

import { LogOut, UserCircle2 } from 'lucide-react';
import { signOutAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';

type TopNavbarProps = {
  fullName: string;
};

export function TopNavbar({ fullName }: TopNavbarProps) {
  return (
    <header className="rounded-2xl bg-gradient-to-r from-brand-500 via-brand-500 to-fuchsia-500 px-5 py-4 text-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserCircle2 className="h-7 w-7" />
          <p className="text-sm font-bold md:text-lg">Welcome, {fullName}</p>
        </div>

        <form action={signOutAction}>
          <Button type="submit" variant="danger" className="gap-2 rounded-lg px-3 py-1.5 text-xs md:text-sm">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </form>
      </div>
    </header>
  );
}
