'use client'
import { useState, useEffect } from 'react'
import { api }                  from '@/lib/api'
import type { PrintJob }        from '@/lib/types'

type Period = '24h' | '7d' | '30d'

const PERIOD_LABELS: Record<Period, string> = {
  '24h': 'Last 24 h',
  '7d':  'Last 7 days',
  '30d': 'Last 30 days',
}

function withinPeriod(iso: string, period: Period): boolean {
  const ms = { '24h': 86_400_000, '7d': 604_800_000, '30d': 2_592_000_000 }[period]
  return Date.now() - new Date(iso).getTime() <= ms
}

export function JobsClient({ initialJobs }: { initialJobs: PrintJob[] }) {
  const [jobs,   setJobs]   = useState(initialJobs)
  const [period, setPeriod] = useState<Period>('7d')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const id = setInterval(async () => {
      try { setJobs(await api.jobs()) } catch { /* keep existing */ }
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  const filtered = jobs.filter(j => {
    if (!withinPeriod(j.printedAt, period)) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        j.username.toLowerCase().includes(q) ||
        j.computer.toLowerCase().includes(q) ||
        j.printerDisplay.toLowerCase().includes(q) ||
        j.documentName.toLowerCase().includes(q)
      )
    }
    return true
  })

  const totalPages = filtered.reduce((s, j) => s + j.pages, 0)
  const totalJobs  = filtered.length
  const uniqueUsers = new Set(filtered.map(j => j.username)).size

  return (
    <>
      {/* KPI strip */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="card kpi">
          <div className="kpi-label">Jobs</div>
          <div className="kpi-num">{totalJobs.toLocaleString()}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Pages printed</div>
          <div className="kpi-num">{totalPages.toLocaleString()}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Unique users</div>
          <div className="kpi-num">{uniqueUsers}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Est. cost (KES)</div>
          <div className="kpi-num">{(totalPages * 0.30).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['24h', '7d', '30d'] as Period[]).map(p => (
            <button
              key={p}
              className={'btn small' + (period === p ? ' primary' : ' secondary')}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search user, computer, printer, document…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, maxWidth: 360,
            padding: '5px 10px', fontSize: 12,
            border: '1px solid var(--neutral-stroke-2)',
            borderRadius: 4, background: 'var(--neutral-bg-1)',
            color: 'var(--neutral-fg-1)', outline: 'none',
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginLeft: 'auto' }}>
          {filtered.length} {filtered.length === 1 ? 'job' : 'jobs'}
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--neutral-fg-3)', fontSize: 13 }}>
            {jobs.length === 0
              ? 'No print jobs received yet — deploy the agent to domain PCs to start collecting data.'
              : 'No jobs match the current filter.'}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Computer</th>
                <th>Printer</th>
                <th>Document</th>
                <th style={{ textAlign: 'right' }}>Pages</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(j => {
                const ts = new Date(j.printedAt)
                return (
                  <tr key={j.id} style={{ cursor: 'default' }}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 11, color: 'var(--neutral-fg-3)' }}>
                      {ts.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      {' '}
                      {ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ fontWeight: 500 }}>{j.username.split('\\').pop()}</td>
                    <td style={{ color: 'var(--neutral-fg-3)', fontSize: 12 }}>{j.computer || '—'}</td>
                    <td style={{ fontSize: 12 }}>{j.printerDisplay}</td>
                    <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                      {j.documentName || '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                      {j.pages.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
