import { IconChevronRight } from '@/components/ui/Icons'
import { AlertFeed }         from '@/components/dashboard/AlertFeed'
import { api }               from '@/lib/api'
import { levelToClass }      from '@/lib/utils'

interface BackendLog {
  id: number
  printer: number
  timestamp: string
  status: string
  event_type: string
  total_pages: number
  console_display: string | null
  active_alerts: string[] | null
  error_code: string | null
}

export default async function AlertsPage() {
  const logs: BackendLog[] = await api.logs().catch(() => []) as BackendLog[]

  function eventTypeToLevel(t: string): string {
    if (['PAPER_JAM', 'OFFLINE'].includes(t)) return 'danger'
    if (['LOW_TONER'].includes(t))            return 'warn'
    if (['MAINTENANCE'].includes(t))          return 'info'
    return 'ok'
  }

  function eventTypeLabel(t: string): string {
    const map: Record<string, string> = {
      STATUS_CHECK: 'Status check',
      PAPER_JAM:   'Paper jam',
      LOW_TONER:   'Low toner',
      OFFLINE:     'Offline',
      MAINTENANCE: 'Maintenance',
    }
    return map[t] ?? t
  }

  return (
    <div className="page-fade">
      <div className="breadcrumb">
        Monitor <IconChevronRight size={10} /> Alerts
      </div>
      <div className="page-head">
        <h1 className="page-title">Alerts</h1>
        <button className="btn secondary">Clear all</button>
      </div>

      <div className="dash-grid">
        {/* Live feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AlertFeed />

          {/* Historical log from backend */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-head" style={{ padding: '14px 16px', marginBottom: 0 }}>
              <div className="card-title">Event log</div>
              <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>{logs.length} events</span>
            </div>
            {logs.length === 0 ? (
              <p style={{ padding: 16, fontSize: 13, color: 'var(--neutral-fg-3)' }}>No log events found.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Level</th>
                    <th style={{ textAlign: 'right' }}>Pages</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 50).map(log => {
                    const level = eventTypeToLevel(log.event_type)
                    return (
                      <tr key={log.id} style={{ cursor: 'default' }}>
                        <td style={{ color: 'var(--neutral-fg-3)', fontVariantNumeric: 'tabular-nums', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 500 }}>{eventTypeLabel(log.event_type)}</td>
                        <td style={{ color: 'var(--neutral-fg-2)' }}>{log.status || '—'}</td>
                        <td>
                          <span className={'badge ' + level}>
                            <span className="dot" />{level}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {log.total_pages?.toLocaleString() ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { label: 'Paper jams',  type: 'PAPER_JAM',   color: 'var(--status-danger-fg)' },
            { label: 'Low toner',   type: 'LOW_TONER',   color: 'var(--status-warning-fg)' },
            { label: 'Offline',     type: 'OFFLINE',     color: 'var(--status-danger-fg)' },
            { label: 'Maintenance', type: 'MAINTENANCE', color: 'var(--status-info-fg)' },
          ].map(row => {
            const count = logs.filter(l => l.event_type === row.type).length
            return (
              <div className="card kpi" key={row.type}>
                <div className="kpi-label">{row.label}</div>
                <div className="kpi-num" style={{ color: count > 0 ? row.color : 'inherit' }}>{count}</div>
                <div className="kpi-sub">Last 90 days</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
