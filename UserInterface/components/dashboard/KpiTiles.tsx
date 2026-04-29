import { Sparkline }       from '@/components/ui/Sparkline'
import { AnimatedNumber }  from '@/components/ui/AnimatedNumber'
import { deriveKpis }      from '@/lib/utils'
import type { Device }     from '@/lib/types'

export function KpiTiles({ devices }: { devices: Device[] }) {
  const { active, total, pages, avgUtil, alerts } = deriveKpis(devices)

  return (
    <div className="kpi-grid">
      <div className="card kpi">
        <div className="kpi-label">Active devices</div>
        <div className="kpi-num">
          <AnimatedNumber value={active} />
          <span style={{ fontSize: 16, color: 'var(--neutral-fg-3)', fontWeight: 500 }}>
            {' '}/ {total}
          </span>
        </div>
        <Sparkline points={[22, 24, 23, 25, 24, 26, active]} />
      </div>

      <div className="card kpi">
        <div className="kpi-label">Pages (30d)</div>
        <div className="kpi-num">
          {pages > 0
            ? <AnimatedNumber value={Math.round(pages / 1000)} suffix="k" />
            : '—'}
        </div>
        <Sparkline points={[110, 120, 128, 135, 142, 150, Math.max(pages / 1000, 1)]} />
      </div>

      <div className="card kpi">
        <div className="kpi-label">Avg utilization</div>
        <div className="kpi-num">
          <AnimatedNumber value={avgUtil} suffix="%" />
        </div>
        <Sparkline points={[62, 65, 61, 64, 67, 63, avgUtil]} />
      </div>

      <div className="card kpi">
        <div className="kpi-label">Open alerts</div>
        <div className="kpi-num" style={{ color: alerts > 0 ? 'var(--status-danger-fg)' : 'inherit' }}>
          <AnimatedNumber value={alerts} />
        </div>
        <Sparkline points={[1, 2, 2, 3, 4, 5, alerts]} color="var(--status-danger-fg)" />
      </div>
    </div>
  )
}
