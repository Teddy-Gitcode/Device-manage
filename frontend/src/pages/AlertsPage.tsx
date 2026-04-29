import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Radio, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusDot } from '@/components/status-indicator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { printersApi } from '@/features/printers/api';
import { logsApi, type LogFilters } from '@/features/logs/api';
import { onPrinterUpdate } from '@/lib/ws';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { EventType, PrinterLog, WSMessage } from '@/types/api';

const PAGE_SIZE = 50;

const EVENT_META: Record<
  EventType,
  { label: string; tone: 'destructive' | 'warning' | 'default' | 'secondary'; pulse: boolean }
> = {
  STATUS_CHECK: { label: 'Status Check', tone: 'secondary', pulse: false },
  PAPER_JAM: { label: 'Paper Jam', tone: 'destructive', pulse: true },
  LOW_TONER: { label: 'Low Toner', tone: 'warning', pulse: false },
  OFFLINE: { label: 'Offline', tone: 'destructive', pulse: true },
  MAINTENANCE: { label: 'Maintenance', tone: 'default', pulse: false },
};

export function AlertsPage() {
  const [printerFilter, setPrinterFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [livePrepends, setLivePrepends] = useState<PrinterLog[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    const h = (e: Event) => {
      setWsConnected((e as CustomEvent<'connected' | 'disconnected'>).detail === 'connected');
    };
    window.addEventListener('ws-status', h);
    return () => window.removeEventListener('ws-status', h);
  }, []);

  const printersQuery = useQuery({
    queryKey: ['printers', 'dropdown'],
    queryFn: () => printersApi.list({ ordering: 'name' }),
    staleTime: 60_000,
  });

  const activeAlertsQuery = useQuery({
    queryKey: ['printers', { device_health: '5' }],
    queryFn: () => printersApi.list({ device_health: '5' }),
    refetchInterval: 30_000,
  });

  const filters: LogFilters = {
    printer: printerFilter === 'all' ? undefined : Number(printerFilter),
    event_type: eventFilter === 'all' ? undefined : (eventFilter as EventType),
    page,
  };
  const logsQuery = useQuery({
    queryKey: ['logs', filters],
    queryFn: () => logsApi.list(filters),
  });

  const printerNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of printersQuery.data?.results ?? []) {
      map.set(p.id, p.name || p.ip_address);
    }
    return map;
  }, [printersQuery.data]);

  useEffect(() => {
    setLivePrepends([]);
  }, [filters.printer, filters.event_type, page]);

  useEffect(() => {
    const unsub = onPrinterUpdate((msg: WSMessage) => {
      if (!msg.event) return;
      const alertish = ['paper_jam', 'low_toner', 'offline', 'critical_down'];
      if (!alertish.some((k) => msg.event?.includes(k))) return;
      const eventType: EventType =
        msg.event.includes('offline') || msg.event.includes('critical_down')
          ? 'OFFLINE'
          : msg.event.includes('paper_jam')
            ? 'PAPER_JAM'
            : msg.event.includes('low_toner')
              ? 'LOW_TONER'
              : 'STATUS_CHECK';
      const temp: PrinterLog = {
        id: Date.now(),
        printer: msg.printer_id,
        timestamp: new Date().toISOString(),
        total_pages: null,
        status: msg.event_label ?? msg.event,
        console_display: null,
        tray_status: [],
        active_alerts: [],
        system_uptime_seconds: null,
        event_type: eventType,
        error_code: null,
      };
      setLivePrepends((prev) => [temp, ...prev].slice(0, 10));
    });
    return unsub;
  }, []);

  const total = logsQuery.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const results = [...livePrepends, ...(logsQuery.data?.results ?? [])];
  const downPrinters = activeAlertsQuery.data?.results ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts & Logs</h1>
          <p className="text-sm text-muted-foreground">
            Live event feed and historical printer logs.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs">
          <StatusDot tone={wsConnected ? 'success' : 'muted'} pulse={wsConnected} />
          <span className={cn('font-medium', wsConnected ? 'text-emerald-500' : 'text-muted-foreground')}>
            {wsConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {downPrinters.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-destructive">
              Active Alerts ({downPrinters.length})
            </h2>
          </div>
          <div className="space-y-2">
            {downPrinters.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3"
              >
                <StatusDot tone="destructive" pulse />
                <Link to={`/printers/${p.id}`} className="font-semibold hover:underline">
                  {p.name || p.ip_address}
                </Link>
                <span className="text-xs text-muted-foreground">{p.ip_address}</span>
                {p.location && (
                  <span className="hidden text-xs text-muted-foreground md:inline">· {p.location}</span>
                )}
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatRelativeTime(p.last_polled_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          <Select value={printerFilter} onValueChange={(v) => { setPage(1); setPrinterFilter(v); }}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All Printers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Printers</SelectItem>
              {printersQuery.data?.results.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.name || p.ip_address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={eventFilter} onValueChange={(v) => { setPage(1); setEventFilter(v); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Event Types</SelectItem>
              <SelectItem value="PAPER_JAM">Paper Jam</SelectItem>
              <SelectItem value="LOW_TONER">Low Toner</SelectItem>
              <SelectItem value="OFFLINE">Offline</SelectItem>
              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              <SelectItem value="STATUS_CHECK">Status Check</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => logsQuery.refetch()}>
            <Radio className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        {logsQuery.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : results.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">No logs found</Card>
        ) : (
          results.map((log, idx) => (
            <LogRow
              key={`${log.id}-${idx}`}
              log={log}
              printerName={printerNames.get(log.printer) ?? `Printer #${log.printer}`}
              isLive={idx < livePrepends.length}
            />
          ))
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {total.toLocaleString()} log{total !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || !logsQuery.data?.previous}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={!logsQuery.data?.next}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function LogRow({
  log,
  printerName,
  isLive,
}: {
  log: PrinterLog;
  printerName: string;
  isLive: boolean;
}) {
  const meta = EVENT_META[log.event_type];
  const ts = new Date(log.timestamp);
  const tone =
    meta.tone === 'destructive' ? 'destructive' : meta.tone === 'warning' ? 'warning' : 'muted';

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border bg-card p-3.5 shadow-sm transition',
        isLive && 'ring-2 ring-primary/60 animate-in fade-in'
      )}
    >
      <StatusDot tone={tone} pulse={meta.pulse} className="mt-2" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/printers/${log.printer}`}
            className="text-sm font-semibold hover:text-primary"
          >
            {printerName}
          </Link>
          <Badge variant={meta.tone}>{meta.label}</Badge>
          {log.error_code && (
            <Badge variant="destructive" className="font-mono">
              {log.error_code}
            </Badge>
          )}
          {isLive && <Badge variant="default">LIVE</Badge>}
        </div>
        {log.status && (
          <p className="mt-1 truncate text-xs text-muted-foreground">{log.status}</p>
        )}
        {log.console_display && (
          <p className="mt-1 truncate rounded bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground">
            {log.console_display}
          </p>
        )}
        {log.active_alerts?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {log.active_alerts.map((a, i) => (
              <Badge key={i} variant="destructive" className="text-[10px]">
                {a}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right text-xs text-muted-foreground">
        <p>{ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        <p className="mt-0.5 text-[10px]">
          {ts.toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
}
