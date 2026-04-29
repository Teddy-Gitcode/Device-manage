import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeft,
  TriangleAlert,
  Wrench,
  ClipboardList,
  BarChart3,
  Droplets,
  Activity,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusDot, healthTone } from '@/components/status-indicator';
import { SupplyBar } from '@/components/supply-bar';
import { HealthRing } from '@/components/health-ring';
import { printersApi } from '@/features/printers/api';
import { logsApi, statsApi } from '@/features/logs/api';
import { cn, formatNumber, formatRelativeTime } from '@/lib/utils';
import {
  HEALTH_LABEL,
  STATUS_LABEL,
  type Consumable,
  type EventType,
  type PrinterLog,
} from '@/types/api';

const EVENT_VARIANT: Record<
  EventType,
  'default' | 'secondary' | 'destructive' | 'warning' | 'success'
> = {
  STATUS_CHECK: 'secondary',
  PAPER_JAM: 'destructive',
  LOW_TONER: 'warning',
  OFFLINE: 'destructive',
  MAINTENANCE: 'default',
};

export function PrinterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const printerId = Number(id);

  const printerQuery = useQuery({
    queryKey: ['printer', printerId],
    queryFn: () => printersApi.retrieve(printerId),
    enabled: Number.isFinite(printerId) && printerId > 0,
  });

  const logsQuery = useQuery({
    queryKey: ['logs', { printer: printerId }],
    queryFn: () => logsApi.list({ printer: printerId }),
    enabled: Number.isFinite(printerId) && printerId > 0,
  });

  const statsQuery = useQuery({
    queryKey: ['daily-stats', { printer: printerId }],
    queryFn: () => statsApi.list({ printer: printerId }),
    enabled: Number.isFinite(printerId) && printerId > 0,
  });

  if (!Number.isFinite(printerId) || printerId <= 0) {
    return <p className="text-sm text-destructive">Invalid printer id.</p>;
  }

  if (printerQuery.isLoading) return <DetailSkeleton />;

  if (printerQuery.isError || !printerQuery.data) {
    return (
      <Alert variant="destructive">
        <TriangleAlert className="h-4 w-4" />
        <AlertTitle>Failed to load printer</AlertTitle>
        <AlertDescription>
          <Link to="/printers" className="underline">
            ← Back to printers
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  const p = printerQuery.data;
  const tone = healthTone(p.device_health);
  const lastLog = logsQuery.data?.results?.[0];
  const svc = p.predicted_service_info;
  const score = p.health_score ?? 0;

  const statsSorted = [...(statsQuery.data?.results ?? [])]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/printers" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Printers
        </Link>
        <span>/</span>
        <span className="text-foreground">{p.name || p.ip_address}</span>
      </nav>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-bold tracking-tight">
                {p.name || p.ip_address}
              </h1>
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
                {HEALTH_LABEL[p.device_health ?? 0] ?? 'Unknown'}
              </Badge>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <StatusDot tone={tone} pulse={p.device_health === 5} />
                {STATUS_LABEL[p.current_status ?? 0] ?? '—'}
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.ip_address}
              {p.model_name ? ` · ${p.model_name}` : ''}
              {p.location ? ` · ${p.location}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {p.is_in_alert_state && (
              <Badge variant="destructive" className="gap-1">
                <TriangleAlert className="h-3.5 w-3.5" />
                Alert Active
              </Badge>
            )}
            <HealthRing score={score} label={svc?.health_label ?? 'Health'} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KV label="Last Polled" value={p.last_polled_at ? formatRelativeTime(p.last_polled_at) : 'Never'} />
          <KV label="Latency" value={p.last_latency_ms != null ? `${p.last_latency_ms}ms` : '—'} />
          <KV label="Firmware" value={p.firmware_version || '—'} />
          <KV label="Serial" value={p.serial_number || '—'} mono />
        </div>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="consumables">
            <Droplets className="h-4 w-4" />
            Consumables
          </TabsTrigger>
          <TabsTrigger value="logs">
            <ClipboardList className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="h-4 w-4" />
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="p-4">
              <h3 className="mb-2 text-sm font-semibold">Console Display</h3>
              <p className="rounded-md bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
                {lastLog?.console_display || '—'}
              </p>
            </Card>
            <Card className="p-4">
              <h3 className="mb-2 text-sm font-semibold">Active Alerts</h3>
              {lastLog?.active_alerts?.length ? (
                <ul className="space-y-1 text-sm">
                  {lastLog.active_alerts.map((a, i) => (
                    <li key={i} className="flex items-center gap-2 text-destructive">
                      <TriangleAlert className="h-3.5 w-3.5" />
                      {a}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No active alerts</p>
              )}
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">Tray Status</h3>
            {Array.isArray(lastLog?.tray_status) && lastLog.tray_status.length ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
                {(lastLog.tray_status as Array<Record<string, unknown>>).map((t, i) => (
                  <div key={i} className="rounded-md bg-muted/30 p-3 text-xs">
                    <p className="font-medium">{String(t.name ?? t.source ?? `Tray ${i}`)}</p>
                    {t.current !== undefined && (
                      <p className="mt-1 text-muted-foreground">
                        {String(t.current)} / {String(t.capacity ?? '?')} sheets
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tray data available</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Predictive Maintenance</h3>
            </div>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MaintRow
                label="Health Score"
                value={
                  <span className="font-semibold">
                    {score}/100 · {svc?.health_label ?? '—'}
                  </span>
                }
              />
              <MaintRow
                label="Next Service Reason"
                value={
                  svc?.next_service_reason ? (
                    <span className="text-amber-500">{svc.next_service_reason}</span>
                  ) : (
                    <span className="text-emerald-500">No immediate service needed</span>
                  )
                }
              />
              <MaintRow
                label="Drum Days Remaining"
                value={svc?.drum_days_remaining != null ? `~${Math.round(svc.drum_days_remaining)} days` : '—'}
              />
              <MaintRow
                label="Drum Pages Remaining"
                value={
                  svc?.drum_pages_remaining != null
                    ? `~${formatNumber(svc.drum_pages_remaining)} pages`
                    : '—'
                }
              />
              <MaintRow
                label="Jam Rate (30 days)"
                value={svc?.jam_rate_30d != null ? `${svc.jam_rate_30d} / 1000 pages` : '—'}
              />
              <MaintRow
                label="Total Jams (30 days)"
                value={String(svc?.total_jams_30d ?? 0)}
              />
            </dl>
          </Card>
        </TabsContent>

        <TabsContent value="consumables" className="space-y-4">
          {p.consumables.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {p.consumables.map((c) => (
                <ConsumableCard key={c.id} c={c} />
              ))}
            </div>
          ) : p.latest_supply_levels.length > 0 ? (
            <Card className="p-4">
              <h3 className="mb-4 text-sm font-semibold">Latest Supply Levels</h3>
              <div className="space-y-2">
                {p.latest_supply_levels.map((s) => (
                  <SupplyBar key={s.id} name={s.name} category={s.category} pct={s.level_percent} />
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-10 text-center text-muted-foreground">No consumable data</Card>
          )}
        </TabsContent>

        <TabsContent value="logs">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Pages</TableHead>
                  <TableHead className="hidden lg:table-cell">Console</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : !logsQuery.data?.results?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No logs yet
                    </TableCell>
                  </TableRow>
                ) : (
                  logsQuery.data.results.slice(0, 25).map((l: PrinterLog) => (
                    <TableRow key={l.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(l.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={EVENT_VARIANT[l.event_type]}>{l.event_type}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {l.status}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs tabular-nums text-muted-foreground">
                        {formatNumber(l.total_pages)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[300px] truncate text-xs font-mono text-muted-foreground">
                        {l.console_display || '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card className="p-5">
            <h3 className="mb-4 text-sm font-semibold">30-Day Print Volume & Jams</h3>
            {statsQuery.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : statsSorted.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No historical data yet
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsSorted.map((s) => ({
                    date: s.date.slice(5),
                    pages: s.pages_printed_today,
                    jams: s.jams_today,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="pages" name="Pages" fill="hsl(var(--primary))" />
                    <Bar dataKey="jams" name="Jams" fill="hsl(var(--destructive))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-sm font-medium', mono && 'font-mono')}>{value}</p>
    </div>
  );
}

function MaintRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

function ConsumableCard({ c }: { c: Consumable }) {
  const border =
    c.level_percent <= 10
      ? 'border-t-red-500'
      : c.level_percent <= 25
        ? 'border-t-amber-400'
        : 'border-t-emerald-500';
  return (
    <Card className={cn('border-t-[3px] p-4', border)}>
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold">{c.name}</h4>
          <p className="text-xs text-muted-foreground">
            {c.category}
            {c.color ? ` · ${c.color}` : ''}
          </p>
        </div>
        <Badge
          variant={
            c.status === 'OK'
              ? 'success'
              : c.status === 'LOW'
                ? 'warning'
                : 'destructive'
          }
        >
          {c.status}
        </Badge>
      </div>
      <div className="mb-2">
        <SupplyBar name={c.name} category={c.category} pct={c.level_percent} />
      </div>
      <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
        {c.estimated_days_remaining != null && (
          <div>~{Math.round(c.estimated_days_remaining)} days remaining</div>
        )}
        {c.estimated_pages_remaining != null && (
          <div>~{formatNumber(c.estimated_pages_remaining)} pages remaining</div>
        )}
        {c.cost_per_unit && <div>Cost: {c.cost_per_unit}</div>}
      </dl>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-10 w-96" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
