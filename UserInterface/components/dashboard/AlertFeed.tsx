'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrinterEventsCtx } from '@/components/providers/WebSocketProvider'
import { formatRelativeTime } from '@/lib/utils'
import { IconArrowRight } from '@/components/ui/Icons'
import type { EventLevel } from '@/lib/types'

type Filter = 'all' | EventLevel

const SEV_COLOR: Record<EventLevel, string> = {
  critical: 'var(--status-danger-fg)',
  warning:  'var(--status-warning-fg)',
  ok:       'var(--status-success-fg)',
  info:     'var(--m365-brand)',
}
const SEV_BG: Record<EventLevel, string> = {
  critical: 'var(--status-danger-bg)',
  warning:  'var(--status-warning-bg)',
  ok:       'var(--status-success-bg)',
  info:     'var(--status-info-bg)',
}
const SEV_LABEL: Record<EventLevel, string> = {
  critical: 'Critical',
  warning:  'Warning',
  ok:       'OK',
  info:     'Info',
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'warning',  label: 'Warning' },
  { key: 'info',     label: 'Info' },
  { key: 'ok',       label: 'OK' },
]

export function AlertFeed({ limit = 50 }: { limit?: number }) {
  const { events, connected } = usePrinterEventsCtx()
  const [filter, setFilter] = useState<Filter>('all')

  const counts: Record<Filter, number> = {
    all:      events.length,
    critical: events.filter(e => e.level === 'critical').length,
    warning:  events.filter(e => e.level === 'warning').length,
    info:     events.filter(e => e.level === 'info').length,
    ok:       events.filter(e => e.level === 'ok').length,
  }

  const rows = (filter === 'all' ? events : events.filter(e => e.level === filter)).slice(0, limit)

  return (
    <div className="card event-log-card">

      {/* ── Header ─────────────────────────────────────── */}
      <div className="event-log-header">
        <span className="card-title" style={{ fontSize: 14 }}>Live events</span>
        <span className="event-log-conn">
          <span className={'conn-dot' + (connected ? '' : ' warn')} />
          {connected ? 'Connected' : 'Reconnecting'}
        </span>
      </div>

      {/* ── Filter tabs ────────────────────────────────── */}
      <div className="event-log-filters">
        {FILTERS.map(f => {
          const active = filter === f.key
          const isDanger  = f.key === 'critical'
          const isWarning = f.key === 'warning'
          const activeBg  = isDanger ? SEV_BG.critical : isWarning ? SEV_BG.warning : f.key === 'ok' ? SEV_BG.ok : f.key === 'info' ? SEV_BG.info : 'var(--m365-brand)'
          const activeCol = isDanger ? SEV_COLOR.critical : isWarning ? SEV_COLOR.warning : f.key === 'ok' ? SEV_COLOR.ok : f.key === 'info' ? SEV_COLOR.info : '#fff'
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={'event-log-tab' + (active ? ' active' : '')}
              style={active ? { background: activeBg, color: activeCol } : undefined}
            >
              {f.label}
              {counts[f.key] > 0 && (
                <span className="event-log-tab-count">{counts[f.key]}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Column header ──────────────────────────────── */}
      <div className="event-log-cols">
        <span style={{ width: 68 }}>Severity</span>
        <span style={{ width: 130 }}>Device</span>
        <span style={{ flex: 1 }}>Event</span>
        <span style={{ width: 60, textAlign: 'right' }}>Time</span>
      </div>

      {/* ── Rows ───────────────────────────────────────── */}
      <div className="event-log-body">
        {rows.length === 0 ? (
          <div className="event-log-empty">
            {filter === 'all' ? 'Waiting for events…' : `No ${filter} events`}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {rows.map(e => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{    opacity: 0, height: 0 }}
                transition={{ duration: 0.14 }}
                style={{ overflow: 'hidden' }}
              >
                <Link href={`/devices/${e.deviceId}`} className="event-log-row">
                  {/* Severity pill */}
                  <span
                    className="event-log-sev"
                    style={{ color: SEV_COLOR[e.level], background: SEV_BG[e.level] }}
                  >
                    <span className="event-log-dot" style={{ background: SEV_COLOR[e.level] }} />
                    {SEV_LABEL[e.level]}
                  </span>
                  {/* Device */}
                  <span className="event-log-device">{e.deviceName}</span>
                  {/* Message */}
                  <span className="event-log-msg">{e.message}</span>
                  {/* Time */}
                  <span className="event-log-time">{formatRelativeTime(e.timestamp)}</span>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <div className="event-log-footer">
        <Link href="/alerts" className="event-log-viewall">
          View all events <IconArrowRight size={12} />
        </Link>
        {events.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>
            {rows.length} of {counts[filter]} shown
          </span>
        )}
      </div>

    </div>
  )
}
