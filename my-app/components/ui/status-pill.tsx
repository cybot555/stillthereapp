import { cn } from '@/lib/utils';

type StatusPillProps = {
  active: boolean;
};

export function StatusPill({ active }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex min-w-[108px] items-center justify-center rounded-full px-3 py-1 text-xs font-bold tracking-wide text-center',
        active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
      )}
    >
      {active ? 'QR ACTIVE' : 'QR INACTIVE'}
    </span>
  );
}
