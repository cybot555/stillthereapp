import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ActionTileProps = {
  title: string;
  icon: LucideIcon;
  onClick?: () => void;
  href?: string;
};

export function ActionTile({ title, icon: Icon, onClick, href }: ActionTileProps) {
  const content = (
    <Card className="flex items-center gap-4 p-5 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg transition">
      <span className="rounded-2xl bg-blue-500 p-3 text-white">
        <Icon className="h-7 w-7" />
      </span>
      <span className="text-lg font-semibold text-slate-700">{title}</span>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className={cn('block')}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}
