import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';

export function EmptyQrCard() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-800">No Active Session</h3>
        <StatusPill active={false} />
      </div>

      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
        <p className="font-semibold">QR display disabled</p>
        <p className="mt-2 text-sm">Create and confirm a session to activate attendance scanning.</p>
      </div>
    </Card>
  );
}
