import { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
};

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700',
        variant === 'secondary' && 'bg-white text-slate-700 border border-slate-200 hover:border-brand-200 hover:text-brand-700',
        variant === 'danger' && 'bg-rose-500 text-white hover:bg-rose-600',
        variant === 'ghost' && 'text-brand-700 hover:bg-brand-50',
        className
      )}
      {...props}
    />
  );
}
