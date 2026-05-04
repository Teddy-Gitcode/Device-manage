import Link from 'next/link'
import type { Device } from '@/lib/types'

const STATUS_COLOR: Record<string, string> = {
  ok:      'var(--status-success-fg)',
  warn:    'var(--status-warning-fg)',
  danger:  'var(--status-danger-fg)',
  neutral: 'var(--neutral-fg-disabled)',
}

export function FleetByLocation({ devices }: { devices: Device[] }) {
  // Group devices by location
  const groups = new Map<string, Device[]>()
  for (const d of devices) {
    const loc = d.location || 'Unknown'
    if (!groups.has(loc)) groups.set(loc, [])
    groups.get(loc)!.push(d)
  }

  // Sort groups: locations with problems first, then by device count desc
  const sorted = Array.from(groups.entries()).sort(([, a], [, b]) => {
    const hasProblem = (devs: Device[]) =>
      devs.some((d: Device) => d.status === 'danger' || d.status === 'warn' || d.activeAlerts.length > 0) ? 0 : 1
    const diff = hasProblem(a) - hasProblem(b)
    if (diff !== 0) return diff
    return b.length - a.length
  })

  return (
    <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
      <div className="card-head" style={{ marginBottom: 10 }}>
        <div className="card-title">Fleet by location</div>
        <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>{groups.size} sites · {devices.length} devices</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
        {sorted.map(([loc, devs]) => {
          const offline  = devs.filter(d => d.status === 'danger').length
          const warned   = devs.filter(d => d.status === 'warn').length
          const ok       = devs.filter(d => d.status === 'ok' || d.status === 'neutral').length
          const alerts   = devs.filter(d => d.activeAlerts.some(a => !a.toLowerCase().includes('sleep'))).length
          const pages    = devs.reduce((s, d) => s + d.pagesToday, 0)
          const hasIssue = offline > 0 || warned > 0 || alerts > 0

          return (
            <div
              key={loc}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-card)',
                border: `1px solid ${hasIssue ? 'var(--status-danger-border)' : 'var(--neutral-stroke-2)'}`,
                background: hasIssue ? 'var(--status-danger-bg)' : 'var(--neutral-bg-2)',
              }}
            >
              {/* Location name */}
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--neutral-fg-1)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={loc}>
                {loc}
              </div>

              {/* Status dots row */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
                {devs.map(d => (
                  <Link key={d.id} href={`/devices/${d.id}`} title={d.name} style={{ textDecoration: 'none' }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: 999,
                      background: STATUS_COLOR[d.status] ?? 'var(--neutral-fg-disabled)',
                      cursor: 'pointer',
                      border: d.activeAlerts.some(a => !a.toLowerCase().includes('sleep'))
                        ? '1.5px solid var(--status-danger-fg)'
                        : '1.5px solid transparent',
                      boxSizing: 'border-box',
                    }} />
                  </Link>
                ))}
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--neutral-fg-3)', flexWrap: 'wrap' }}>
                {ok > 0     && <span style={{ color: 'var(--status-success-fg)' }}>{ok} online</span>}
                {offline > 0 && <span style={{ color: 'var(--status-danger-fg)',  fontWeight: 600 }}>{offline} offline</span>}
                {warned > 0  && <span style={{ color: 'var(--status-warning-fg)', fontWeight: 600 }}>{warned} warning</span>}
                {alerts > 0  && <span style={{ color: 'var(--status-danger-fg)',  fontWeight: 600 }}>{alerts} alert{alerts !== 1 ? 's' : ''}</span>}
                {pages > 0   && <span style={{ marginLeft: 'auto' }}>{pages.toLocaleString()} pp today</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
