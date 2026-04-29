'use client'
import { useState, useEffect } from 'react'
import { api }                  from '@/lib/api'
import { formatRelativeTime }   from '@/lib/utils'
import type { PrintJob }        from '@/lib/types'

const STATE_BADGE: Record<string, string> = { printing: 'ok', queued: 'info', held: 'warn' }
const STATE_LABEL: Record<string, string> = { printing: 'Printing', queued: 'Queued', held: 'Held' }

export function JobsClient({ initialJobs }: { initialJobs: PrintJob[] }) {
  const [jobs,   setJobs]   = useState(initialJobs)
  const [filter, setFilter] = useState<'all' | 'printing' | 'queued' | 'held'>('all')

  useEffect(() => {
    const id = setInterval(async () => {
      try { setJobs(await api.jobs()) } catch { /* keep existing */ }
    }, 15_000)
    return () => clearInterval(id)
  }, [])

  const visible = filter === 'all' ? jobs : jobs.filter(j => j.state === filter)
  const counts = {
    all:      jobs.length,
    printing: jobs.filter(j => j.state === 'printing').length,
    queued:   jobs.filter(j => j.state === 'queued').length,
    held:     jobs.filter(j => j.state === 'held').length,
  }

  return (
    <>
      {/* KPI summary */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {(['printing', 'queued', 'held'] as const).map(s => (
          <div className="card kpi" key={s}>
            <div className="kpi-label">{STATE_LABEL[s]}</div>
            <div className="kpi-num" style={{ color: s === 'held' ? 'var(--status-warning-fg)' : 'inherit' }}>{counts[s]}</div>
          </div>
        ))}
        <div className="card kpi">
          <div className="kpi-label">Total pages queued</div>
          <div className="kpi-num">{jobs.filter(j => j.state !== 'held').reduce((s, j) => s + j.pages, 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['all', 'printing', 'queued', 'held'] as const).map(f => (
          <button key={f} className={'btn' + (filter === f ? ' primary' : ' secondary') + ' small'} onClick={() => setFilter(f)}>
            {f === 'all' ? `All (${counts.all})` : `${STATE_LABEL[f]} (${counts[f]})`}
          </button>
        ))}
      </div>

      {/* Jobs table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Job</th>
              <th>User</th>
              <th>Department</th>
              <th>Device</th>
              <th style={{ textAlign: 'right' }}>Pages</th>
              <th>Submitted</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(j => (
              <tr key={j.id} style={{ cursor: 'default' }}>
                <td><div style={{ fontWeight: 500 }}>{j.title}</div><div style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>{j.id}</div></td>
                <td>{j.userName}</td>
                <td style={{ color: 'var(--neutral-fg-3)' }}>{j.dept}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{j.deviceId}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{j.pages.toLocaleString()}</td>
                <td style={{ color: 'var(--neutral-fg-3)', fontSize: 11 }}>{formatRelativeTime(j.submittedAt)}</td>
                <td>
                  <span className={'badge ' + STATE_BADGE[j.state]}><span className="dot" />{STATE_LABEL[j.state]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
