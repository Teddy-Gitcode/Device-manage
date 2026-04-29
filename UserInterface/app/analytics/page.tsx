import { IconChevronRight }  from '@/components/ui/Icons'
import { api, type SreSignals } from '@/lib/api'
import { normalizeDevices }  from '@/lib/normalize'
import { Sparkline }         from '@/components/ui/Sparkline'
import { AnimatedNumber }    from '@/components/ui/AnimatedNumber'

const EMPTY_SRE: SreSignals = {
  traffic:    { pages_per_hour: 0 },
  errors:     { current_error_rate: 0, error_count: 0, total_active: 0 },
  saturation: { low_toner_count: 0 },
  latency:    { network_latency_avg: 0 },
}

export default async function AnalyticsPage() {
  const [rawPrinters, sre] = await Promise.all([
    api.printers().catch(() => []),
    api.sreSignals().catch(() => EMPTY_SRE),
  ])
  const devices = normalizeDevices(rawPrinters as Parameters<typeof normalizeDevices>[0])

  const totalPages   = devices.reduce((s, d) => s + d.pages30d, 0)
  const activeCount  = devices.filter(d => d.status === 'ok').length
  const criticalCount = devices.filter(d => d.status === 'danger').length
  const warnCount    = devices.filter(d => d.status === 'warn').length

  return (
    <div className="page-fade">
      <div className="breadcrumb">
        Monitor <IconChevronRight size={10} /> Analytics
      </div>
      <div className="page-head">
        <h1 className="page-title">Analytics</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary">Export PDF</button>
        </div>
      </div>

      {/* SRE Four Golden Signals */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 500, marginBottom: 10 }}>
          SRE Four Golden Signals
        </div>
        <div className="kpi-grid">
          <div className="card kpi">
            <div className="kpi-label">Traffic</div>
            <div className="kpi-num"><AnimatedNumber value={Math.round(sre.traffic.pages_per_hour)} /></div>
            <div className="kpi-sub">Pages / hour</div>
            <Sparkline points={[80, 95, 88, 102, 110, 98, sre.traffic.pages_per_hour]} />
          </div>
          <div className="card kpi">
            <div className="kpi-label">Error rate</div>
            <div className="kpi-num" style={{ color: sre.errors.current_error_rate > 10 ? 'var(--status-danger-fg)' : 'inherit' }}>
              <AnimatedNumber value={Math.round(sre.errors.current_error_rate)} suffix="%" />
            </div>
            <div className="kpi-sub">Printers with health ≥ Warning</div>
            <Sparkline points={[2, 3, 2, 4, 5, 3, sre.errors.current_error_rate]} color="var(--status-danger-fg)" />
          </div>
          <div className="card kpi">
            <div className="kpi-label">Saturation</div>
            <div className="kpi-num" style={{ color: sre.saturation.low_toner_count > 0 ? 'var(--status-warning-fg)' : 'inherit' }}>
              <AnimatedNumber value={sre.saturation.low_toner_count} />
            </div>
            <div className="kpi-sub">Supplies below 10%</div>
            <Sparkline points={[1, 1, 2, 2, 3, 2, sre.saturation.low_toner_count]} color="var(--status-warning-fg)" />
          </div>
          <div className="card kpi">
            <div className="kpi-label">Latency</div>
            <div className="kpi-num"><AnimatedNumber value={Math.round(sre.latency.network_latency_avg)} suffix="ms" /></div>
            <div className="kpi-sub">Avg SNMP response</div>
            <Sparkline points={[12, 14, 11, 13, 15, 12, sre.latency.network_latency_avg]} />
          </div>
        </div>
      </div>

      {/* Fleet health overview */}
      <div className="dash-grid" style={{ marginTop: 20 }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div className="card-head"><div className="card-title">Fleet health breakdown</div></div>
          {[
            { label: 'Online',       count: activeCount,   total: devices.length, color: 'var(--status-success-fg)' },
            { label: 'Warning',      count: warnCount,     total: devices.length, color: 'var(--status-warning-fg)' },
            { label: 'Critical',     count: criticalCount, total: devices.length, color: 'var(--status-danger-fg)' },
            { label: 'Idle / Sleep', count: devices.filter(d => d.status === 'neutral').length, total: devices.length, color: 'var(--neutral-fg-disabled)' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0', fontSize: 13 }}>
              <span style={{ width: 90, color: 'var(--neutral-fg-2)' }}>{row.label}</span>
              <div style={{ flex: 1, height: 10, background: 'var(--neutral-bg-3)', borderRadius: 5, overflow: 'hidden' }}>
                <div className="bar-fill" style={{ width: devices.length > 0 ? `${(row.count / devices.length) * 100}%` : '0%', background: row.color }} />
              </div>
              <span style={{ width: 60, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                {row.count} / {row.total}
              </span>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div className="card-head"><div className="card-title">Volume summary</div></div>
          {[
            { label: 'Total pages (30d)',  value: totalPages.toLocaleString() },
            { label: 'Active devices',     value: `${activeCount} / ${devices.length}` },
            { label: 'Avg utilization',    value: devices.length > 0 ? `${Math.round(devices.reduce((s, d) => s + d.utilization, 0) / devices.length)}%` : '—' },
            { label: 'Total jams (30d)',   value: devices.reduce((s, d) => s + d.jams30d, 0).toString() },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, borderBottom: '1px solid var(--neutral-stroke-divider)' }}>
              <span style={{ color: 'var(--neutral-fg-3)' }}>{row.label}</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-device utilization table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
        <div className="card-head" style={{ padding: '14px 16px', marginBottom: 0 }}>
          <div className="card-title">Device performance</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Device</th>
              <th>Location</th>
              <th style={{ width: 160 }}>Utilization</th>
              <th style={{ textAlign: 'right' }}>Pages 30d</th>
              <th style={{ textAlign: 'right' }}>Jams 30d</th>
              <th>Health score</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => {
              const utilColor = d.utilization > 85 ? 'var(--status-danger-fg)' : d.utilization < 20 ? 'var(--neutral-fg-disabled)' : 'var(--m365-brand)'
              return (
                <tr key={d.id} style={{ cursor: 'default' }}>
                  <td><div style={{ fontWeight: 500 }}>{d.name}</div><div style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>{d.id}</div></td>
                  <td style={{ color: 'var(--neutral-fg-2)' }}>{d.location}</td>
                  <td>
                    <div className="util"><div style={{ width: `${d.utilization}%`, background: utilColor }} /></div>
                    <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginTop: 2 }}>{d.utilization}%</div>
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{d.pages30d.toLocaleString()}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: d.jams30d > 5 ? 'var(--status-danger-fg)' : 'inherit' }}>{d.jams30d}</td>
                  <td>
                    <span className={'badge ' + d.status}><span className="dot" />{d.status}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
