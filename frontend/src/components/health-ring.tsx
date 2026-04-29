import { cn } from '@/lib/utils';

export function HealthRing({
  score,
  label,
  className,
}: {
  score: number;
  label?: string;
  className?: string;
}) {
  const stroke =
    score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative h-16 w-16">
        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            stroke={stroke}
            strokeWidth="3"
            strokeDasharray={`${score} ${100 - score}`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">
          {score}
        </span>
      </div>
      {label && (
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  );
}
