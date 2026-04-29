import type { DeptCost } from '@/lib/types'

export function CostByDept({ costs }: { costs: DeptCost[] }) {
  const max = Math.max(...costs.map(c => c.mono + c.color), 1)
  const month = new Date().toLocaleString('en-US', { month: 'long' })

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="card-head">
        <div className="card-title">Cost by department · {month}</div>
      </div>

      {costs.map(c => {
        const total = c.mono + c.color
        const monoW  = (c.mono  / max) * 100
        const colorW = (c.color / max) * 100

        return (
          <div key={c.dept} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0', fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
            <span style={{ width: 80, color: 'var(--neutral-fg-2)' }}>{c.dept}</span>
            <div style={{ flex: 1, height: 14, display: 'flex', background: 'var(--neutral-bg-3)', borderRadius: 3, overflow: 'hidden' }}>
              <span style={{ width: `${monoW}%`, background: 'var(--m365-brand)' }} />
              <span style={{ width: `${colorW}%`, background: 'var(--m365-brand-tint-40)' }} />
            </div>
            <span style={{ width: 90, textAlign: 'right', fontWeight: 500 }}>KES {total.toLocaleString()}</span>
          </div>
        )
      })}

      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--neutral-fg-3)', marginTop: 8 }}>
        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ width: 10, height: 10, background: 'var(--m365-brand)', display: 'inline-block' }} />
          Mono
        </span>
        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ width: 10, height: 10, background: 'var(--m365-brand-tint-40)', display: 'inline-block' }} />
          Color
        </span>
      </div>
    </div>
  )
}
