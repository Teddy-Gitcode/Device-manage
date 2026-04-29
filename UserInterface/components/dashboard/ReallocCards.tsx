import { IconReallocate } from '@/components/ui/Icons'
import type { ReallocSuggestion } from '@/lib/types'

export function ReallocCards({ suggestions }: { suggestions: ReallocSuggestion[] }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="card-head">
        <div className="card-title">Reallocation suggestions</div>
      </div>

      {suggestions.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)' }}>No reallocation recommendations.</p>
      )}

      {suggestions.map((r, i) => (
        <div className="realloc" key={i}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: 'var(--neutral-fg-3)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 500 }}>From</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.from.name}</div>
              <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>{r.from.location} · {r.from.utilLabel}</div>
            </div>
            <span style={{ color: 'var(--neutral-fg-3)' }}><IconReallocate size={18} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: 'var(--neutral-fg-3)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 500 }}>To</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.to.name}</div>
              <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>{r.to.location} · {r.to.utilLabel}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--neutral-stroke-divider)' }}>
            <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)', flex: 1 }}>{r.reason}</span>
            <button className="btn primary small">Approve</button>
            <button className="btn subtle small">Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  )
}
