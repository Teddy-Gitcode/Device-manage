'use client'
import { useState } from 'react'

export interface BackendLog {
  id:              number
  timestamp:       string
  event_type:      string
  total_pages:     number
  console_display: string | null
  active_alerts:   string[] | null
  status:          string
}

type SevFilter = 'all' | 'danger' | 'warn' | 'info'

function eventLevel(t: string): 'danger' | 'warn' | 'info' {
  if (['PAPER_JAM', 'OFFLINE'].includes(t)) return 'danger'
  if (['LOW_TONER', 'MAINTENANCE', 'COVER_OPEN'].includes(t)) return 'warn'
  return 'info'
}

const SEV_COLOR: Record<string, string> = {
  danger: 'var(--status-danger-fg)',
  warn:   'var(--status-warning-fg)',
  info:   'var(--m365-brand)',
}
const SEV_BG: Record<string, string> = {
  danger: 'var(--status-danger-bg)',
  warn:   'var(--status-warning-bg)',
  info:   'var(--status-info-bg)',
}
const SEV_LABEL: Record<string, string> = {
  danger: 'Critical',
  warn:   'Warning',
  info:   'Info',
}
const EVENT_LABEL: Record<string, string> = {
  STATUS_CHECK: 'Status check',
  PAPER_JAM:    'Paper jam',
  LOW_TONER:    'Low toner',
  OFFLINE:      'Offline',
  MAINTENANCE:  'Maintenance',
  COVER_OPEN:   'Cover open',
}

const FILTERS: { key: SevFilter; label: string }[] = [
  { key: 'all',    label: 'All'      },
  { key: 'danger', label: 'Critical' },
  { key: 'warn',   label: 'Warning'  },
  { key: 'info',   label: 'Info'     },
]

export function DeviceEventLog({ logs }: { logs: BackendLog[] }) {
  const [filter,   setFilter]   = useState<SevFilter>('all')
  const [expanded, setExpanded] = useState(false)

  const counts: Record<SevFilter, number> = {
    all:    logs.length,
    danger: logs.filter(l => eventLevel(l.event_type) === 'danger').length,
    warn:   logs.filter(l => eventLevel(l.event_type) === 'warn').length,
    info:   logs.filter(l => eventLevel(l.event_type) === 'info').length,
  }

  const filtered = filter === 'all' ? logs : logs.filter(l => eventLevel(l.event_type) === filter)
  const PAGE     = 20
  const visible  = expanded ? filtered : filtered.slice(0, PAGE)

  return (
    <div className="card event-log-card">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="event-log-header">
        <span className="card-title" style={{ fontSize: 14 }}>Event log</span>
        <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>{logs.length} entries</span>
      </div>

      {/* ── Filter tabs ─────────────────────────────────── */}
      <div className="event-log-filters">
        {FILTERS.map(f => {
          const active = filter === f.key
          const bg  = f.key === 'all' ? 'var(--m365-brand)' : SEV_BG[f.key]
          const col = f.key === 'all' ? '#fff'              : SEV_COLOR[f.key]
          return (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setExpanded(false) }}
              className={'event-log-tab' + (active ? ' active' : '')}
              style={active ? { background: bg, color: col } : undefined}
            >
              {f.label}
              {counts[f.key] > 0 && (
                <span className="event-log-tab-count">{counts[f.key]}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Column header ───────────────────────────────── */}
      <div className="event-log-cols">
        <span style={{ width: 120 }}>Time</span>
        <span style={{ width: 68  }}>Severity</span>
        <span style={{ width: 110 }}>Event</span>
        <span style={{ flex: 1   }}>Detail</span>
        <span style={{ width: 72, textAlign: 'right' }}>Pages</span>
      </div>

      {/* ── Rows ────────────────────────────────────────── */}
      <div className="event-log-body" style={{ maxHeight: expanded ? 480 : 320 }}>
        {visible.length === 0 ? (
          <div className="event-log-empty">
            No {filter === 'all' ? '' : SEV_LABEL[filter].toLowerCase() + ' '}events recorded
          </div>
        ) : (
          visible.map(log => {
            const level  = eventLevel(log.event_type)
            const alerts = log.active_alerts ?? []
            const detail = alerts[0] || log.console_display || log.status || '—'
            const ts     = new Date(log.timestamp)
            return (
              <div key={log.id} className="event-log-row" style={{ cursor: 'default' }}>

                {/* Time */}
                <span className="event-log-time" style={{ width: 120, textAlign: 'left' }}>
                  {ts.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  {' '}
                  {ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>

                {/* Severity pill */}
                <span
                  className="event-log-sev"
                  style={{ color: SEV_COLOR[level], background: SEV_BG[level] }}
                >
                  <span className="event-log-dot" style={{ background: SEV_COLOR[level] }} />
                  {SEV_LABEL[level]}
                </span>

                {/* Event type */}
                <span style={{
                  width: 110, flexShrink: 0,
                  fontSize: 12, fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {EVENT_LABEL[log.event_type] ?? log.event_type}
                </span>

                {/* Detail */}
                <span
                  className="event-log-msg"
                  style={{ color: alerts[0] ? 'var(--status-danger-fg)' : undefined }}
                >
                  {detail}
                </span>

                {/* Pages */}
                <span className="event-log-time" style={{ width: 72 }}>
                  {log.total_pages != null ? log.total_pages.toLocaleString() : '—'}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <div className="event-log-footer">
        {filtered.length > PAGE ? (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--m365-brand)', padding: 0 }}
          >
            {expanded ? 'Show less' : `Show all ${filtered.length} entries`}
          </button>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>
            {visible.length} {visible.length === 1 ? 'entry' : 'entries'}
          </span>
        )}
        {filter !== 'all' && (
          <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>
            {counts[filter]} of {logs.length} total
          </span>
        )}
      </div>

    </div>
  )
}
