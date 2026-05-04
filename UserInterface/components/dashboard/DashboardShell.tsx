'use client'
import { useState } from 'react'
import Link from 'next/link'
import { KpiTiles }         from './KpiTiles'
import { AlertFeed }         from './AlertFeed'
import { ActionItems }       from './ActionItems'
import { TonerToOrder }      from './TonerToOrder'
import { FleetByLocation }   from './FleetByLocation'
import { DeviceGridCard }    from '@/components/devices/DeviceGridCard'
import { DeviceDetailPanel } from '@/components/detail/DeviceDetailPanel'
import { IconPrinter, IconArrowRight, IconCheckCircle } from '@/components/ui/Icons'
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

const HEALTH_PRIORITY: Record<string, number> = { danger: 0, warn: 1, neutral: 2, ok: 3 }

export function DashboardShell(props: Props) {
  const [selected, setSelected] = useState<Device | null>(null)

  // Devices that have an actual problem — offline, active alerts, or toner critical
  const problemDevices = [...props.devices]
    .filter(d => d.status === 'danger' || d.status === 'warn' || d.tonerAlert !== 'none' || d.activeAlerts.length > 0)
    .sort((a, b) => (HEALTH_PRIORITY[a.status] ?? 9) - (HEALTH_PRIORITY[b.status] ?? 9))
    .slice(0, 3)

  return (
    <div className="page-fade">

      {/* ── 1. KPI strip ── */}
      <KpiTiles devices={props.devices} />

      {/* ── 2. Action items + toner to order ── */}
      <div className="dash-priority-row" style={{ marginBottom: 16 }}>
        <ActionItems devices={props.devices} />
        <TonerToOrder devices={props.devices} />
      </div>

      {/* ── 3. Fleet by location ── */}
      <FleetByLocation devices={props.devices} />

      {/* ── 4. Problem devices + live events ── */}
      <div className="dash-ops-row">

        {/* Problem devices — only show if there are issues */}
        <div className="card" style={{ padding: '14px 16px' }}>
          <div className="card-head">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconPrinter size={14} />
              {problemDevices.length > 0 ? 'Devices needing attention' : 'Device fleet'}
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--neutral-fg-3)' }}>
                · {props.devices.length} total
              </span>
            </div>
            <Link href="/devices" className="btn subtle small" style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              View all <IconArrowRight size={11} />
            </Link>
          </div>

          {problemDevices.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0', color: 'var(--status-success-fg)' }}>
              <IconCheckCircle size={24} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Fleet is healthy</div>
                <div style={{ fontSize: 12, color: 'var(--neutral-fg-3)', marginTop: 2 }}>
                  All {props.devices.length} devices are online with no active alerts
                </div>
              </div>
            </div>
          ) : (
            <div className="device-grid-3" style={{ marginTop: 8 }}>
              {problemDevices.map((d, i) => (
                <DeviceGridCard key={d.id} device={d} onSelect={setSelected} index={i} />
              ))}
            </div>
          )}
        </div>

        {/* Live events feed */}
        <AlertFeed limit={6} />
      </div>

      <DeviceDetailPanel device={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
