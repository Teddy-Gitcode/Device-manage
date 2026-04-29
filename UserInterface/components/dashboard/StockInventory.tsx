import type { StockItem } from '@/lib/types'

export function StockInventory({ stock }: { stock: StockItem[] }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="card-head">
        <div className="card-title">Consumable stock</div>
        <button className="btn subtle small">Order</button>
      </div>

      {stock.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)' }}>No consumable data.</p>
      )}

      {stock.map((s, i) => {
        const pct = s.cap > 0 ? s.qty / s.cap : 0
        const color = pct < 0.2
          ? 'var(--status-danger-fg)'
          : pct < 0.4
            ? 'var(--status-warning-fg)'
            : 'var(--status-success-fg)'

        return (
          <div className="stock-row stagger" key={s.sku} style={{ '--i': i } as React.CSSProperties}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>{s.sku}</div>
            </div>
            <div className="stock-bar">
              <div
                className="bar-fill"
                style={{
                  width: `${(pct * 100).toFixed(0)}%`,
                  background: color,
                  animationDelay: `${i * 0.04}s`,
                }}
              />
            </div>
            <div style={{ width: 32, textAlign: 'right', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {s.qty}
            </div>
          </div>
        )
      })}
    </div>
  )
}
