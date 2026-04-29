import type { TopUser } from '@/lib/types'

export function TopUsers({ users }: { users: TopUser[] }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="card-head">
        <div className="card-title">Top users · 30 days</div>
      </div>

      {users.map(u => {
        const ratio = u.quota > 0 ? u.pages / u.quota : 0
        const barColor = ratio > 1
          ? 'var(--status-danger-fg)'
          : ratio > 0.8
            ? 'var(--status-warning-fg)'
            : 'var(--m365-brand)'

        return (
          <div key={u.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--neutral-stroke-divider)' }}>
            <div className="avatar" style={{ background: u.color, width: 28, height: 28 }}>{u.initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
              <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>
                {u.dept} · {u.pages.toLocaleString()} pp · KES {u.cost.toLocaleString()}
              </div>
            </div>
            <div style={{ width: 100 }}>
              <div style={{ height: 4, background: 'var(--neutral-bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(ratio, 1.2) * 83}%`, background: barColor }} />
              </div>
              <div style={{ fontSize: 10, color: ratio > 1 ? 'var(--status-danger-fg)' : 'var(--neutral-fg-3)', marginTop: 2, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(ratio * 100)}%
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
