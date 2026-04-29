import { IconChevronRight }     from '@/components/ui/Icons'
import { AnimatedNumber }        from '@/components/ui/AnimatedNumber'
import { api }                   from '@/lib/api'
import { normalizeConsumables }  from '@/lib/normalize'

export default async function ConsumablesPage() {
  const raw   = await api.consumables().catch(() => [])
  const stock = normalizeConsumables(raw as Parameters<typeof normalizeConsumables>[0])

  const critical = stock.filter(s => s.cap > 0 && s.qty / s.cap < 0.2)
  const low      = stock.filter(s => s.cap > 0 && s.qty / s.cap >= 0.2 && s.qty / s.cap < 0.4)

  function levelColor(qty: number, cap: number) {
    const pct = cap > 0 ? qty / cap : 1
    if (pct < 0.2) return 'var(--status-danger-fg)'
    if (pct < 0.4) return 'var(--status-warning-fg)'
    return 'var(--status-success-fg)'
  }

  return (
    <div className="page-fade">
      <div className="breadcrumb">
        Monitor <IconChevronRight size={10} /> Consumables
      </div>
      <div className="page-head">
        <h1 className="page-title">Consumables</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary">Export</button>
          <button className="btn primary">Order supplies</button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="card kpi">
          <div className="kpi-label">Total SKUs</div>
          <div className="kpi-num"><AnimatedNumber value={stock.length} /></div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Critical stock</div>
          <div className="kpi-num" style={{ color: critical.length > 0 ? 'var(--status-danger-fg)' : 'inherit' }}>
            <AnimatedNumber value={critical.length} />
          </div>
          <div className="kpi-sub">Below 20%</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Low stock</div>
          <div className="kpi-num" style={{ color: low.length > 0 ? 'var(--status-warning-fg)' : 'inherit' }}>
            <AnimatedNumber value={low.length} />
          </div>
          <div className="kpi-sub">20–40%</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">OK stock</div>
          <div className="kpi-num" style={{ color: 'var(--status-success-fg)' }}>
            <AnimatedNumber value={stock.length - critical.length - low.length} />
          </div>
          <div className="kpi-sub">Above 40%</div>
        </div>
      </div>

      {/* Full table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-head" style={{ padding: '14px 16px', marginBottom: 0 }}>
          <div className="card-title">Stock levels</div>
        </div>
        {stock.length === 0 ? (
          <p style={{ padding: 16, fontSize: 13, color: 'var(--neutral-fg-3)' }}>No consumables data. Ensure the backend is running.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU / Part #</th>
                <th style={{ width: 200 }}>Stock level</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Capacity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stock.map(s => {
                const pct = s.cap > 0 ? (s.qty / s.cap) * 100 : 100
                const color = levelColor(s.qty, s.cap)
                const label = pct < 20 ? 'Critical' : pct < 40 ? 'Low' : 'OK'
                const badgeClass = pct < 20 ? 'danger' : pct < 40 ? 'warn' : 'ok'

                return (
                  <tr key={s.sku} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--neutral-fg-3)' }}>{s.sku}</td>
                    <td>
                      <div style={{ height: 6, background: 'var(--neutral-bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                        <div className="bar-fill" style={{ width: `${pct.toFixed(0)}%`, background: color }} />
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{s.qty}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--neutral-fg-3)' }}>{s.cap}</td>
                    <td>
                      <span className={'badge ' + badgeClass}>
                        <span className="dot" />{label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
