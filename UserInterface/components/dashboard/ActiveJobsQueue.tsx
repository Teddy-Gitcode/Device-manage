'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils'
import { IconPrinter, IconClock, IconPauseCircle } from '@/components/ui/Icons'
import type { PrintJob } from '@/lib/types'

const STATE_BADGE: Record<string, string> = { printing: 'ok', queued: 'info', held: 'warn' }
const STATE_LABEL: Record<string, string> = { printing: 'Printing', queued: 'Queued', held: 'Held' }
const STATE_ICON: Record<string, React.ElementType> = {
  printing: IconPrinter,
  queued:   IconClock,
  held:     IconPauseCircle,
}

export function ActiveJobsQueue({ initialJobs }: { initialJobs: PrintJob[] }) {
  const [jobs, setJobs] = useState(initialJobs)

  useEffect(() => {
    const id = setInterval(async () => {
      try { setJobs(await api.jobs()) } catch { /* preserve existing */ }
    }, 15_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="card-head">
        <div className="card-title">Active jobs</div>
        <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>
          {jobs.filter(j => j.state === 'printing').length} printing
        </span>
      </div>

      {jobs.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)' }}>No active jobs.</p>
      )}

      {jobs.map((j, i) => {
        const Icon = STATE_ICON[j.state] ?? IconClock
        return (
          <div
            key={j.id}
            className="stagger"
            style={{
              '--i': i,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0', borderBottom: '1px solid var(--neutral-stroke-divider)',
            } as React.CSSProperties}
          >
            <span style={{ color: 'var(--neutral-fg-3)', flexShrink: 0 }}>
              <Icon size={14} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{j.title}</div>
              <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>
                {j.userName} · {j.dept} · {j.pages} pp · {formatRelativeTime(j.submittedAt)}
              </div>
            </div>
            <span className={'badge ' + STATE_BADGE[j.state]}>
              <span className="dot" />
              {STATE_LABEL[j.state]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
