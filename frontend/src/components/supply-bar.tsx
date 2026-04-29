import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

function supplyColor(name: string, category: string) {
  const n = name.toLowerCase();
  if (n.includes('black') || n.includes(' bk') || n.endsWith(' k')) return 'bg-zinc-950 dark:bg-zinc-300';
  if (n.includes('cyan')) return 'bg-cyan-500';
  if (n.includes('magenta')) return 'bg-pink-500';
  if (n.includes('yellow')) return 'bg-yellow-400';
  if (category === 'Drum Unit') return 'bg-violet-500';
  if (category === 'Waste Bin') return 'bg-zinc-500';
  if (category === 'Maintenance') return 'bg-orange-500';
  return 'bg-primary';
}

function supplyLabel(name: string) {
  const n = name.toLowerCase();
  if (n.includes('black') || n.includes('bk')) return 'K';
  if (n.includes('cyan')) return 'C';
  if (n.includes('magenta')) return 'M';
  if (n.includes('yellow')) return 'Y';
  return name.slice(0, 2).toUpperCase();
}

export function SupplyBar({
  name,
  category,
  pct,
}: {
  name: string;
  category: string;
  pct: number;
}) {
  const color = supplyColor(name, category);
  const label = supplyLabel(name);
  const isLow = pct <= 10;
  const isWarn = !isLow && pct <= 25;
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white',
          color
        )}
        title={name}
      >
        {label}
      </span>
      <Progress
        value={Math.max(pct, 2)}
        className="h-2 flex-1"
        indicatorClassName={color}
      />
      <span
        className={cn(
          'w-8 text-right text-[11px] font-semibold tabular-nums',
          isLow && 'text-destructive',
          isWarn && 'text-amber-500',
          !isLow && !isWarn && 'text-muted-foreground'
        )}
      >
        {pct}%
      </span>
    </div>
  );
}
