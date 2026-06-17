'use client';

interface SsdBadgeProps {
  eligible: boolean;
  reason?: string;
  className?: string;
}

export function SsdBadge({ eligible, reason, className = '' }: SsdBadgeProps) {
  if (eligible) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg ${className}`}
        title={reason || 'Eligible for SSD fast-track pathway'}
      >
        <svg
          className="w-4 h-4 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
          Fast-Track Eligible
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-lg ${className}`}
      title={reason || 'Standard permit pathway required'}
    >
      <svg
        className="w-4 h-4 text-amber-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
        Permit Required
      </span>
    </div>
  );
}
