'use client'
import { useState } from 'react'
import Link from 'next/link'
import { KpiTiles }         from './KpiTiles'
import { AlertFeed }         from './AlertFeed'
import { StockGrouped }      from './StockGrouped'
import { ServiceTickets }    from './ServiceTickets'
import { ActiveJobsQueue }   from './ActiveJobsQueue'
import { DeviceGridCard }    from '@/components/devices/DeviceGridCard'
import { DeviceDetailPanel } from '@/components/detail/DeviceDetailPanel'
import { IconPrinter, IconArrowRight } from '@/components/ui/Icons'
import type {
  Device, StockItem, ReallocSuggestion, ServiceTicket,
  PrintPolicy, TopUser, DeptCost, PrintJob,
} from '@/lib/types'

interface Props {
  devices:   Device[]
  stock:     StockItem[]
  realloc:   ReallocSuggestion[]
  tickets:   ServiceTicket[]
  policies:  PrintPolicy[]
  topUsers:  TopUser[]
  deptCosts: DeptCost[]
  jobs:      PrintJob[]
}

// Health priority for the dashboard preview: 5 (critical) → 3 (warn) → 2 (ok) → 0 (idle)
const HEALTH_PRIORITY: Record<string, number> = { danger: 0, warn: 1, neutral: 2, ok: 3 }

export function DashboardShell(props: Props) {
  const [selected, setSelected] = useState<Device | null>(null)

  // Sort by problem severity so the snapshot surfaces what needs attention
  const previewDevices = [...props.devices]
    .sort((a, b) => (HEALTH_PRIORITY[a.status] ?? 9) - (HEALTH_PRIORITY[b.status] ?? 9))
    .slice(0, 3)
  const previewJobs    = props.jobs.slice(0, 3)
  const previewTickets = props.tickets.slice(0, 2)

  return (
    <div className="page-fade">
      {/* ── 1. KPI strip — fleet at a glance ── */}
      <KpiTiles devices={props.devices} />

      {/* ── 2. Priority row: alerts + stock (what's broken / what to order) ── */}
      <div className="dash-priority-row">
        <AlertFeed limit={5} />
        <StockGrouped stock={props.stock} limit={4} />
      </div>

      {/* ── 3. Devices needing attention ── */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div className="card-head">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconPrinter size={14} />
            Devices needing attention
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--neutral-fg-3)' }}>
              · {props.devices.length} total
            </span>
          </div>
          <Link href="/devices" className="btn subtle small" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            View all <IconArrowRight size={11} />
          </Link>
        </div>

        {previewDevices.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)', padding: '8px 0' }}>
            No devices found. Check backend connection.
          </p>
        ) : (
          <div className="device-grid-3" style={{ marginTop: 8 }}>
            {previewDevices.map((d, i) => (
              <DeviceGridCard key={d.id} device={d} onSelect={setSelected} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Operational row: active jobs + tickets ── */}
      <div className="dash-ops-row">
        <ActiveJobsQueue initialJobs={previewJobs} />
        <ServiceTickets tickets={previewTickets} />
      </div>

      <DeviceDetailPanel device={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
