import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Printer,
  BellRing,
  Droplets,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MONITOR = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/printers', label: 'Printers', icon: Printer },
  { to: '/alerts', label: 'Alerts & Logs', icon: BellRing },
];

const SUPPLIES = [
  { to: '/consumables', label: 'Consumables', icon: Droplets },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

const ACCOUNT = [{ to: '/settings', label: 'Settings', icon: Settings }];

function Section({ title, items }: { title: string; items: typeof MONITOR }) {
  return (
    <div>
      <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-20 h-full w-60 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Printer className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">PrinterFleet</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">NOC Console</p>
        </div>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <Section title="Monitor" items={MONITOR} />
        <Section title="Supplies" items={SUPPLIES} />
        <Section title="Account" items={ACCOUNT} />
      </nav>
    </aside>
  );
}
