'use client'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils'
import { IconPrinter } from '@/components/ui/Icons'
import type { PrintJob } from '@/lib/types'

export function ActiveJobsQueue({ initialJobs }: { initialJobs: PrintJob[] }) {
  const [jobs, setJobs] = useState(initialJobs)

  useEffect(() => {
    const id = setInterval(async () => {
      try { setJobs(await api.jobs()) } catch { /* preserve existing */ }
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  // Show last 10 completed jobs
  const recent = jobs.slice(0, 10)

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="card-head">
        <div className="card-title">Recent print jobs</div>
        <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>
          {jobs.length.toLocaleString()} total
        </span>
      </div>

      {recent.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)', padding: '12px 0' }}>
          No jobs yet — deploy the agent to start capturing data.
        </p>
      )}

      {recent.map((j, i) => (
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
            <IconPrinter size={14} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {j.documentName || '(untitled)'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>
              {j.username.split('\\').pop()} · {j.printerDisplay} · {j.pages} pp
            </div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)', flexShrink: 0 }}>
            {formatRelativeTime(j.printedAt)}
          </span>
        </div>
      ))}
    </div>
  )
}
