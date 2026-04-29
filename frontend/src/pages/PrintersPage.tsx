import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusDot, healthTone } from '@/components/status-indicator';
import { SupplyBar } from '@/components/supply-bar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { printersApi, type PrinterFilters } from '@/features/printers/api';
import { canDo } from '@/lib/auth';
import { cn, formatRelativeTime } from '@/lib/utils';
import { HEALTH_LABEL, STATUS_LABEL, type Printer } from '@/types/api';

const PAGE_SIZE = 50;

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

type DialogState =
  | { mode: 'closed' }
  | { mode: 'add' }
  | { mode: 'edit'; printer: Printer }
  | { mode: 'delete'; printer: Printer };

export function PrintersPage() {
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [health, setHealth] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('true');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>({ mode: 'closed' });

  const filters: PrinterFilters = {
    search: debouncedSearch || undefined,
    device_health: health === 'all' ? undefined : health,
    active: activeFilter === 'all' ? undefined : activeFilter,
    ordering: 'name',
    page,
  };

  const query = useQuery({
    queryKey: ['printers', filters],
    queryFn: () => printersApi.list(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => printersApi.destroy(id),
    onSuccess: () => {
      toast.success('Printer deleted');
      qc.invalidateQueries({ queryKey: ['printers'] });
      setDialog({ mode: 'closed' });
    },
    onError: () => toast.error('Failed to delete printer'),
  });

  const total = query.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const results = query.data?.results ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Printers</h1>
          <p className="text-sm text-muted-foreground">Manage and monitor every device.</p>
        </div>
        {canDo('operator') && (
          <Button onClick={() => setDialog({ mode: 'add' })}>
            <Plus className="h-4 w-4" />
            Add Printer
          </Button>
        )}
      </div>

      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search name, IP, model…"
              className="pl-9"
            />
          </div>
          <Select
            value={health}
            onValueChange={(v) => {
              setPage(1);
              setHealth(v);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All health</SelectItem>
              <SelectItem value="2">Running</SelectItem>
              <SelectItem value="3">Warning</SelectItem>
              <SelectItem value="5">Down</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={activeFilter}
            onValueChange={(v) => {
              setPage(1);
              setActiveFilter(v);
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Active only</SelectItem>
              <SelectItem value="false">Inactive only</SelectItem>
              <SelectItem value="all">All devices</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead>
              <TableHead className="hidden lg:table-cell">Model</TableHead>
              <TableHead className="hidden md:table-cell">Location</TableHead>
              <TableHead>Health</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Supply</TableHead>
              <TableHead className="hidden md:table-cell">Last Polled</TableHead>
              <TableHead className="w-[130px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : query.isError ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-destructive">
                  Failed to load printers. Check backend connection.
                </TableCell>
              </TableRow>
            ) : results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No printers found
                </TableCell>
              </TableRow>
            ) : (
              results.map((p) => {
                const tone = healthTone(p.device_health);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        to={`/printers/${p.id}`}
                        className="font-semibold hover:text-primary"
                      >
                        {p.name || '—'}
                      </Link>
                      <div className="mt-0.5 text-xs font-mono text-muted-foreground">
                        {p.ip_address}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {p.model_name || '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {p.location || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusDot tone={tone} pulse={p.device_health === 5} />
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
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {STATUS_LABEL[p.current_status ?? 0] ?? '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell min-w-[180px]">
                      {p.min_supply_percent != null ? (
                        <SupplyBar
                          name="Toner"
                          category="Toner"
                          pct={p.min_supply_percent}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {p.last_polled_at ? formatRelativeTime(p.last_polled_at) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {canDo('operator') && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDialog({ mode: 'edit', printer: p })}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDo('admin') && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDialog({ mode: 'delete', printer: p })}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {total.toLocaleString()} printer{total !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || !query.data?.previous}
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
              disabled={!query.data?.next}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {dialog.mode === 'add' && (
        <PrinterFormDialog
          mode="add"
          onClose={() => setDialog({ mode: 'closed' })}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['printers'] });
            setDialog({ mode: 'closed' });
          }}
        />
      )}
      {dialog.mode === 'edit' && (
        <PrinterFormDialog
          mode="edit"
          printer={dialog.printer}
          onClose={() => setDialog({ mode: 'closed' })}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['printers'] });
            setDialog({ mode: 'closed' });
          }}
        />
      )}
      {dialog.mode === 'delete' && (
        <Dialog open onOpenChange={() => setDialog({ mode: 'closed' })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete printer?</DialogTitle>
              <DialogDescription>
                This will remove <span className="font-semibold">{dialog.printer.name || dialog.printer.ip_address}</span> and all its historical data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDialog({ mode: 'closed' })}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate(dialog.printer.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function PrinterFormDialog({
  mode,
  printer,
  onClose,
  onSaved,
}: {
  mode: 'add' | 'edit';
  printer?: Printer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [ip, setIp] = useState(printer?.ip_address ?? '');
  const [name, setName] = useState(printer?.name ?? '');
  const [location, setLocation] = useState(printer?.location ?? '');
  const [active, setActive] = useState(printer?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'add') {
        await printersApi.create({ ip_address: ip, name, location, active });
        toast.success('Printer added');
      } else if (printer) {
        await printersApi.update(printer.id, { ip_address: ip, name, location, active });
        toast.success('Printer updated');
      }
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add Printer' : 'Edit Printer'}</DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Enter the device IP and display name. Additional metadata is populated on first SNMP poll.'
              : 'Update the device’s display name or deactivate polling.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ip_address">
              IP Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ip_address"
              required
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="192.168.1.100"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Finance Printer"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Floor 2, Room 201"
            />
          </div>
          <label className="flex items-center gap-2 rounded-md border border-border bg-muted/20 p-3">
            <Checkbox
              id="active"
              checked={active}
              onCheckedChange={(v) => setActive(v === true)}
            />
            <span className="text-sm">
              Active
              <span className="ml-2 text-xs text-muted-foreground">
                (uncheck to stop polling this device)
              </span>
            </span>
          </label>
          {error && (
            <div className={cn('rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive')}>
              {error}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'add' ? 'Add Printer' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
