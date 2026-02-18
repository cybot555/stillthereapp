import Link from 'next/link';
import Image from 'next/image';
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
  const iconSrc = title === 'Create Session' ? '/icons/createsessionlogo.png' : title === 'View History' ? '/icons/viewhistorylogo.png' : null;

  const content = (
    <Card className="flex items-center gap-4 p-5 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg transition">
      <span className={iconSrc ? 'inline-flex h-14 w-14 items-center justify-center' : 'rounded-2xl bg-blue-500 p-3 text-white'}>
        {iconSrc ? (
          <Image
            src={iconSrc}
            alt={`${title} icon`}
            width={56}
            height={56}
            className={cn('h-14 w-14 object-contain', title === 'View History' && 'translate-y-1')}
          />
        ) : (
          <Icon className="h-7 w-7" />
        )}
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
