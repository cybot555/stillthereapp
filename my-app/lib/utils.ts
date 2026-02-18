import { type ClassValue, clsx } from 'clsx';
import { format } from 'date-fns';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDisplayName(value: string | null | undefined) {
  if (!value) {
    return 'Sir Cyrus';
  }

  return value;
}

export function formatTimeIn(isoTime: string) {
  return format(new Date(isoTime), 'HH:mm:ss');
}

export function formatSchedule(date: string, start: string, end: string) {
  return `${date} | ${start} - ${end}`;
}
