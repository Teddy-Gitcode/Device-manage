import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  BarChart3,
  Loader2,
  Radar,
  RefreshCw,
  Search,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PrinterCard } from '@/components/printer-card';
import { printersApi } from '@/features/printers/api';
import { queryKeys } from '@/lib/query';
import { canDo } from '@/lib/auth';
import { cn } from '@/lib/utils';

type SignalTone = 'default' | 'destructive' | 'warning' | 'info';

const SIGNAL_TONE: Record<SignalTone, string> = {
  default: 'from-primary/15 to-transparent text-primary',
  destructive: 'from-red-500/15 to-transparent text-red-500',
  warning: 'from-amber-500/15 to-transparent text-amber-500',
  info: 'from-violet-500/15 to-transparent text-violet-500',
};

function SignalCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'default',
  loading,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone?: SignalTone;
  loading?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70',
          SIGNAL_TONE[tone]
        )}
      />
      <div className="relative flex items-start justify-between">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md bg-card/80 backdrop-blur',
            SIGNAL_TONE[tone].split(' ').pop()
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="relative mt-5">
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="text-3xl font-bold tabular-nums">{value}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </div>
    </Card>
  );
}

function FleetHealthBar({
  running,
  warning,
  down,
  total,
}: {
  running: number;
  warning: number;
  down: number;
  total: number;
}) {
  if (total === 0)
    return <div className="h-2 w-full rounded-full bg-muted" />;
  const unknown = total - running - warning - down;
  const pct = (n: number) => (n / total) * 100;
  const seg = (n: number, cls: string, title: string) =>
    n > 0 && (
      <div
        key={title}
        className={cn('h-full transition-all', cls)}
        style={{ width: `${pct(n).toFixed(2)}%` }}
        title={`${title}: ${n}`}
      />
    );
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full gap-0.5">
      {seg(running, 'bg-emerald-500', 'Running')}
      {seg(warning, 'bg-amber-400', 'Warning')}
      {seg(down, 'bg-red-500', 'Down')}
      {seg(unknown, 'bg-muted-foreground/30', 'Unknown')}
    </div>
  );
}

function HealthStat({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: 'muted' | 'success' | 'warning' | 'destructive';
}) {
  const borderTone =
    tone === 'success'
      ? 'border-emerald-500/30 bg-emerald-500/5'
      : tone === 'warning'
        ? 'border-amber-500/30 bg-amber-500/5'
        : tone === 'destructive'
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-border bg-muted/30';
  const textTone =
    tone === 'success'
      ? 'text-emerald-500'
      : tone === 'warning'
        ? 'text-amber-500'
        : tone === 'destructive'
          ? 'text-red-500'
          : 'text-foreground';
  return (
    <div className={cn('flex flex-col items-center rounded-lg border p-3', borderTone)}>
      <p className={cn('text-2xl font-bold tabular-nums', textTone)}>{count}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function DashboardPage() {
  const qc = useQueryClient();

  const printers = useQuery({
    queryKey: queryKeys.printers({ active: 'true', ordering: 'name' }),
    queryFn: () => printersApi.list({ active: 'true', ordering: 'name' }),
  });
  const sre = useQuery({
    queryKey: queryKeys.sre,
    queryFn: () => printersApi.sre(),
    refetchInterval: 30_000,
  });

  const pollMutation = useMutation({
    mutationFn: printersApi.poll,
    onSuccess: () => {
      toast.success('Polling queued — fleet will refresh shortly');
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['printers'] });
        qc.invalidateQueries({ queryKey: ['sre-signals'] });
      }, 3000);
    },
    onError: () => toast.error('Failed to trigger poll'),
  });

  const discoverMutation = useMutation({
    mutationFn: printersApi.discover,
    onSuccess: () => toast.success('Network scan started — new devices will appear shortly'),
    onError: () => toast.error('Failed to trigger discovery'),
  });

  const list = printers.data?.results ?? [];
  const running = list.filter((p) => p.device_health === 2).length;
  const warning = list.filter((p) => p.device_health === 3).length;
  const down = list.filter((p) => p.device_health === 5).length;

  const sorted = [...list].sort((a, b) => {
    const order = (h: number | null) => (h === 5 ? 0 : h === 3 ? 1 : 2);
    return order(a.device_health) - order(b.device_health);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fleet Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time status across the printer fleet.
          </p>
        </div>
        {canDo('operator') && (
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              onClick={() => pollMutation.mutate()}
              disabled={pollMutation.isPending}
            >
              {pollMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Poll All
            </Button>
            <Button
              variant="outline"
              onClick={() => discoverMutation.mutate()}
              disabled={discoverMutation.isPending}
            >
              {discoverMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Discover
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SignalCard
          icon={BarChart3}
          label="Traffic"
          tone="default"
          loading={sre.isLoading}
          value={sre.data ? sre.data.traffic.pages_per_hour.toLocaleString() : '—'}
          sub="pages / hour"
        />
        <SignalCard
          icon={TriangleAlert}
          label="Errors"
          tone="destructive"
          loading={sre.isLoading}
          value={sre.data ? `${sre.data.errors.current_error_rate}%` : '—'}
          sub={`${sre.data?.errors.error_count ?? 0} of ${sre.data?.errors.total_active ?? 0} affected`}
        />
        <SignalCard
          icon={Zap}
          label="Saturation"
          tone="warning"
          loading={sre.isLoading}
          value={sre.data ? String(sre.data.saturation.low_toner_count) : '—'}
          sub="low supply devices"
        />
        <SignalCard
          icon={Radar}
          label="Latency"
          tone="info"
          loading={sre.isLoading}
          value={sre.data ? `${sre.data.latency.network_latency_avg}ms` : '—'}
          sub="avg SNMP response"
        />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Fleet Health
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">{list.length} active</span>
        </div>
        <div className="mb-4 grid grid-cols-4 gap-3">
          <HealthStat label="Total" count={list.length} tone="muted" />
          <HealthStat label="Running" count={running} tone="success" />
          <HealthStat label="Warning" count={warning} tone="warning" />
          <HealthStat label="Down" count={down} tone="destructive" />
        </div>
        <FleetHealthBar
          running={running}
          warning={warning}
          down={down}
          total={list.length}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Running
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Warning
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" /> Down
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/30" /> Unknown
          </span>
        </div>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Active Devices
          </h2>
        </div>

        {printers.isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : printers.isError ? (
          <Card className="p-10 text-center">
            <TriangleAlert className="mx-auto mb-3 h-8 w-8 text-destructive" />
            <p className="font-medium text-destructive">Failed to load fleet data</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Is the backend running on port 8000?
            </p>
          </Card>
        ) : list.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="font-medium">No printers yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Click <strong>Discover</strong> to scan the network, or add one manually from the
              Printers page.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((p) => (
              <PrinterCard key={p.id} printer={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
