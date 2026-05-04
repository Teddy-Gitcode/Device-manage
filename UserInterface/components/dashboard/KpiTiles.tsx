import { AnimatedNumber } from '@/components/ui/AnimatedNumber'
import { deriveKpis }     from '@/lib/utils'
import type { Device }    from '@/lib/types'

function Tile({
  label, value, sub, accent, icon,
}: {
  label: string
  value: React.ReactNode
  sub?: string
  accent?: string
  icon?: string
}) {
  return (
    <div className="card kpi" style={{ borderTop: accent ? `3px solid ${accent}` : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="kpi-label">{label}</div>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      </div>
      <div className="kpi-num" style={{ color: accent ?? 'inherit' }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

export function KpiTiles({ devices }: { devices: Device[] }) {
  const { online, total, offline, withAlerts, lowToner, pagesToday } = deriveKpis(devices)

  return (
    <div className="kpi-grid">
      <Tile
        label="Online"
        value={<><AnimatedNumber value={online} /><span style={{ fontSize: 16, color: 'var(--neutral-fg-3)', fontWeight: 500 }}> / {total}</span></>}
        sub="devices reachable"
        accent={offline > 0 ? undefined : 'var(--status-success-fg)'}
      />
      <Tile
        label="Offline"
        value={<AnimatedNumber value={offline} />}
        sub={offline === 0 ? 'all devices up' : `device${offline !== 1 ? 's' : ''} unreachable`}
        accent={offline > 0 ? 'var(--status-danger-fg)' : undefined}
      />
      <Tile
        label="Active alerts"
        value={<AnimatedNumber value={withAlerts} />}
        sub={withAlerts === 0 ? 'no active issues' : `device${withAlerts !== 1 ? 's' : ''} need attention`}
        accent={withAlerts > 0 ? 'var(--status-danger-fg)' : undefined}
      />
      <Tile
        label="Low toner"
        value={<AnimatedNumber value={lowToner} />}
        sub={lowToner === 0 ? 'toner levels OK' : `device${lowToner !== 1 ? 's' : ''} need cartridges`}
        accent={lowToner > 0 ? 'var(--status-warning-fg)' : undefined}
      />
      <Tile
        label="Pages today"
        value={pagesToday > 0 ? <AnimatedNumber value={pagesToday} /> : '—'}
        sub="printed across fleet"
        accent="var(--m365-brand)"
      />
    </div>
  )
}
