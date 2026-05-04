import type { TopUser } from '@/lib/types'

export function TopUsers({ users }: { users: TopUser[] }) {
  if (users.length === 0) {
    return (
      <div className="card" style={{ padding: '14px 16px' }}>
        <div className="card-head">
          <div className="card-title">Top users · 30 days</div>
        </div>
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--neutral-fg-3)' }}>
          No print jobs recorded yet
        </div>
      </div>
    )
  }

  const maxPages = Math.max(...users.map(u => u.pages), 1)

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="card-head">
        <div className="card-title">Top users · 30 days</div>
      </div>

      {users.map(u => {
        const ratio     = u.pages / maxPages
        const barColor  = ratio > 0.9
          ? 'var(--status-danger-fg)'
          : ratio > 0.6
            ? 'var(--status-warning-fg)'
            : 'var(--m365-brand)'

        return (
          <div
            key={u.username}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0',
              borderBottom: '1px solid var(--neutral-stroke-divider)',
            }}
          >
            <div className="avatar" style={{ background: u.color, width: 28, height: 28, flexShrink: 0 }}>
              {u.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {u.displayName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>
                {u.pages.toLocaleString()} pp · {u.jobCount} jobs · KES {u.cost.toLocaleString()}
              </div>
            </div>
            <div style={{ width: 80, flexShrink: 0 }}>
              <div style={{ height: 4, background: 'var(--neutral-bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${ratio * 100}%`, background: barColor, borderRadius: 2 }} />
              </div>
              {u.topPrinter && (
                <div style={{ fontSize: 10, color: 'var(--neutral-fg-3)', marginTop: 2, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.topPrinter}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
