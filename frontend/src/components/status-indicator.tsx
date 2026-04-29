import { cn } from '@/lib/utils';

type Tone = 'success' | 'warning' | 'destructive' | 'muted' | 'info';

const TONE: Record<Tone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-400',
  destructive: 'bg-red-500',
  muted: 'bg-muted-foreground/40',
  info: 'bg-sky-500',
};

export function StatusDot({
  tone = 'muted',
  pulse = false,
  className,
}: {
  tone?: Tone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative inline-block h-2 w-2 rounded-full',
        TONE[tone],
        className
      )}
    >
      {pulse && (
        <span
          className={cn(
            'absolute inset-0 animate-ping rounded-full opacity-60',
            TONE[tone]
          )}
        />
      )}
    </span>
  );
}

export function healthTone(h: number | null | undefined): Tone {
  if (h === 2) return 'success';
  if (h === 3) return 'warning';
  if (h === 5) return 'destructive';
  return 'muted';
}
