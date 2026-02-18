import Image from 'next/image';
import { AttendanceRecord } from '@/lib/types/app';
import { formatTimeIn } from '@/lib/utils';

type AttendanceListProps = {
  records: AttendanceRecord[];
};

export function AttendanceList({ records }: AttendanceListProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Student</th>
            <th className="px-4 py-3">Time-In</th>
            <th className="px-4 py-3 text-center">Proof</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {records.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-slate-500" colSpan={3}>
                No attendance logs yet.
              </td>
            </tr>
          ) : (
            records.map((record) => (
              <tr key={record.id}>
                <td className="px-4 py-3 font-semibold text-slate-700">{record.student_name}</td>
                <td className="px-4 py-3 text-slate-600">{formatTimeIn(record.time_in)}</td>
                <td className="px-4 py-3 text-center">
                  {record.proof_image ? (
                    <a
                      href={record.proof_image}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 font-medium text-brand-600 hover:text-brand-700"
                    >
                      <Image
                        src="/icons/viewprooflogo.png"
                        alt="View proof"
                        width={84}
                        height={16}
                        className="h-8 w-auto object-contain"
                      />
                    </a>
                  ) : (
                    <span className="text-slate-400">N/A</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
