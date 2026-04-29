import { IconAlertCircle, IconAlert, IconInfo, IconWrench } from '@/components/ui/Icons'
import type { ServiceTicket } from '@/lib/types'

const PRIORITY_BADGE:  Record<string, string> = { high: 'danger', medium: 'warn', low: 'info' }
const PRIORITY_LABEL:  Record<string, string> = { high: 'High',   medium: 'Medium', low: 'Low' }
const PRIORITY_ICON:   Record<string, React.ElementType> = {
  high:   IconAlertCircle,
  medium: IconAlert,
  low:    IconInfo,
}

export function ServiceTickets({ tickets }: { tickets: ServiceTicket[] }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="card-head">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconWrench size={14} />
          Service tickets
        </div>
        <button className="btn subtle small">View all</button>
      </div>

      {tickets.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)' }}>No open tickets.</p>
      )}

      {tickets.map((t, i) => {
        const PIcon = PRIORITY_ICON[t.priority] ?? IconInfo
        return (
          <div className={'ticket stagger ' + t.priority} key={t.id} style={{ '--i': i } as React.CSSProperties}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span className={'badge ' + PRIORITY_BADGE[t.priority]} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <PIcon size={11} />
                {PRIORITY_LABEL[t.priority]}
              </span>
              <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)', fontVariantNumeric: 'tabular-nums' }}>{t.id}</span>
              <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginLeft: 'auto' }}>{t.age}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{t.title}</div>
            <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginTop: 2 }}>{t.device} · {t.assignee}</div>
          </div>
        )
      })}
    </div>
  )
}
