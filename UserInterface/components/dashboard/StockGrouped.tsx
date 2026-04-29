import Link from 'next/link'
import { groupByTonerSeries, CHANNEL_COLOR } from '@/lib/toner'
import type { StockItem } from '@/lib/types'

export function StockGrouped({ stock, limit }: { stock: StockItem[]; limit?: number }) {
  const all    = groupByTonerSeries(stock)
  const groups = limit ? all.slice(0, limit) : all

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="card-head">
        <div className="card-title">Consumable stock</div>
        <Link href="/consumables/groups" className="btn subtle small" style={{ fontSize: 11 }}>
          View all →
        </Link>
      </div>

      {groups.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)' }}>No toner data.</p>
      )}

      {groups.map((g, gi) => (
        <Link
          key={g.series}
          href={`/consumables/groups/${encodeURIComponent(g.series)}`}
          style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
          <div
            className="toner-series-row stagger"
            style={{ '--i': gi, padding: '8px 6px' } as React.CSSProperties}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {g.isCritical && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--status-danger-fg)', flexShrink: 0,
                    display: 'inline-block',
                  }} />
                )}
                <span style={{ fontSize: 13, fontWeight: 600 }}>{g.series}</span>
                {g.isMono && (
                  <span style={{ fontSize: 10, color: 'var(--neutral-fg-3)', padding: '1px 5px', border: '1px solid var(--neutral-stroke-1)', borderRadius: 4 }}>
                    Mono
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>
                {g.printers} printer{g.printers !== 1 ? 's' : ''}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {g.channels.map((ch, ci) => (
                <div key={ch.channel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Full model code e.g. TK-5270K, shown in channel colour */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, fontFamily: 'monospace',
                    color: CHANNEL_COLOR[ch.channel],
                    minWidth: 68, flexShrink: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {ch.fullName}
                  </span>
                  <div style={{ flex: 1, height: 5, background: 'var(--neutral-bg-3)', borderRadius: 999, overflow: 'hidden' }}>
                    <div
                      className="bar-fill"
                      style={{
                        width: `${ch.avgPct}%`,
                        background: ch.isCritical ? 'var(--status-danger-fg)' : CHANNEL_COLOR[ch.channel],
                        animationDelay: `${(gi * 4 + ci) * 0.03}s`,
                      }}
                    />
                  </div>
                  <span style={{
                    width: 30, textAlign: 'right', fontSize: 11,
                    fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                    color: ch.isCritical ? 'var(--status-danger-fg)' : 'var(--neutral-fg-3)',
                    fontWeight: ch.isCritical ? 600 : 400,
                  }}>
                    {ch.avgPct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
