import { Link } from 'react-router-dom';
import { Clock, Printer as PrinterIcon, FileText, TriangleAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SupplyBar } from '@/components/supply-bar';
import { StatusDot, healthTone } from '@/components/status-indicator';
import { HEALTH_LABEL, STATUS_LABEL, type Printer } from '@/types/api';
import { cn, formatNumber, formatRelativeTime } from '@/lib/utils';

function healthAccent(h: number | null | undefined) {
  if (h === 2) return 'border-t-emerald-500';
  if (h === 3) return 'border-t-amber-400';
  if (h === 5) return 'border-t-red-500';
  return 'border-t-muted-foreground/30';
}

export function PrinterCard({ printer }: { printer: Printer }) {
  const tone = healthTone(printer.device_health);
  const isDown = printer.device_health === 5;

  return (
    <Link
      to={`/printers/${printer.id}`}
      data-printer-id={printer.id}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border border-t-[3px] bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg',
        healthAccent(printer.device_health)
      )}
    >
      {printer.is_in_alert_state && (
        <Badge
          variant="destructive"
          className="absolute right-3 top-3 gap-1 px-2 py-0.5 text-[10px] uppercase tracking-wider"
        >
          <TriangleAlert className="h-3 w-3" />
          Alert
        </Badge>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-md',
              isDown ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'
            )}
          >
            <PrinterIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pr-10">
            <p className="truncate text-sm font-semibold group-hover:text-primary">
              {printer.name || printer.ip_address}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {printer.ip_address}
              {printer.location ? ` · ${printer.location}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusDot tone={tone} pulse={isDown} />
            <span className="text-xs text-muted-foreground">
              {STATUS_LABEL[printer.current_status ?? 0] ?? '—'}
            </span>
          </div>
          <Badge
            variant={
              tone === 'success'
                ? 'success'
                : tone === 'warning'
                  ? 'warning'
                  : tone === 'destructive'
                    ? 'destructive'
                    : 'secondary'
            }
          >
            {HEALTH_LABEL[printer.device_health ?? 0] ?? 'Unknown'}
          </Badge>
        </div>

        {(printer.model_name || printer.last_latency_ms) && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate">{printer.model_name || ''}</span>
            {printer.last_latency_ms != null && (
              <span
                className={cn(
                  'font-medium tabular-nums',
                  printer.last_latency_ms > 500 && 'text-amber-500'
                )}
              >
                {printer.last_latency_ms}ms
              </span>
            )}
          </div>
        )}

        {printer.latest_supply_levels.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">No supply data</p>
        ) : (
          <div className="space-y-1.5">
            {printer.latest_supply_levels.slice(0, 5).map((s) => (
              <SupplyBar key={s.id} name={s.name} category={s.category} pct={s.level_percent} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(printer.last_polled_at)}
        </span>
        {printer.total_page_count != null && (
          <span className="flex items-center gap-1 tabular-nums">
            <FileText className="h-3 w-3" />
            {formatNumber(printer.total_page_count)}
          </span>
        )}
      </div>
    </Link>
  );
}
