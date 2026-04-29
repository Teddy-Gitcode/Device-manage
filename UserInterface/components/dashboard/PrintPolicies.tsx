'use client'
import { useState } from 'react'
import type { PrintPolicy } from '@/lib/types'

export function PrintPolicies({ initialPolicies }: { initialPolicies: PrintPolicy[] }) {
  const [policies, setPolicies] = useState(initialPolicies)

  function toggle(id: string) {
    setPolicies(ps => ps.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p))
  }

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="card-head">
        <div className="card-title">Print policies</div>
      </div>

      {policies.map(p => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--neutral-stroke-divider)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>{p.desc}</div>
          </div>
          <button
            className={'toggle' + (p.enabled ? ' on' : '')}
            onClick={() => toggle(p.id)}
            aria-label={`Toggle ${p.name}`}
          />
        </div>
      ))}
    </div>
  )
}
