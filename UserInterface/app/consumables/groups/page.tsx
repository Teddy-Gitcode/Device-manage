import Link from 'next/link'
import { IconChevronRight, IconAlertCircle } from '@/components/ui/Icons'
import { AnimatedNumber }       from '@/components/ui/AnimatedNumber'
import { api }                  from '@/lib/api'
import { normalizeConsumables } from '@/lib/normalize'
import { groupByTonerSeries, CHANNEL_LABEL, CHANNEL_COLOR } from '@/lib/toner'

export default async function TonerGroupsPage() {
  const raw   = await api.consumables().catch(() => [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stock = normalizeConsumables(raw as any)
  const groups = groupByTonerSeries(stock)

  const criticalCount = groups.filter(g => g.isCritical).length
  const totalPrinters = new Set(stock.map(s => s.printerId)).size

  return (
    <div className="page-fade">
      <div className="breadcrumb">
        Monitor <IconChevronRight size={10} /> Consumables{' '}
        <IconChevronRight size={10} /> Toner groups
      </div>
      <div className="page-head">
        <h1 className="page-title">Toner groups</h1>
        <Link href="/consumables" className="btn secondary">← All consumables</Link>
      </div>

      {/* KPI row */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="card kpi">
          <div className="kpi-label">Toner series</div>
          <div className="kpi-num"><AnimatedNumber value={groups.length} /></div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Critical series</div>
          <div className="kpi-num" style={{ color: criticalCount > 0 ? 'var(--status-danger-fg)' : 'inherit' }}>
            <AnimatedNumber value={criticalCount} />
          </div>
          <div className="kpi-sub">Any channel &lt; 20%</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Printers tracked</div>
          <div className="kpi-num"><AnimatedNumber value={totalPrinters} /></div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Total SKUs</div>
          <div className="kpi-num"><AnimatedNumber value={stock.length} /></div>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--neutral-fg-3)', fontSize: 13 }}>
          No toner data available. Check backend connection.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {groups.map((g, gi) => (
            <Link
              key={g.series}
              href={`/consumables/groups/${encodeURIComponent(g.series)}`}
              className="toner-series-card stagger"
              style={{ '--i': gi } as React.CSSProperties}
            >
              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {g.isCritical && (
                      <IconAlertCircle size={14} style={{ color: 'var(--status-danger-fg)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{g.series}</span>
                    {g.isMono && (
                      <span style={{
                        fontSize: 10, color: 'var(--neutral-fg-3)', padding: '1px 5px',
                        border: '1px solid var(--neutral-stroke-1)', borderRadius: 4,
                      }}>
                        Mono
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginTop: 2 }}>
                    {g.printers} printer{g.printers !== 1 ? 's' : ''}
                    {' · '}{g.channels.length} channel{g.channels.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <IconChevronRight size={16} style={{ color: 'var(--neutral-fg-3)', flexShrink: 0, marginTop: 2 }} />
              </div>

              {/* Channel bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {g.channels.map((ch, ci) => (
                  <div key={ch.channel}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: CHANNEL_COLOR[ch.channel], fontWeight: 700, fontFamily: 'monospace' }}>
                        {ch.fullName}
                        <span style={{ fontWeight: 400, fontFamily: 'inherit', color: 'var(--neutral-fg-3)', marginLeft: 4 }}>
                          ({CHANNEL_LABEL[ch.channel] ?? ch.channel})
                        </span>
                      </span>
                      <span style={{
                        fontVariantNumeric: 'tabular-nums',
                        color: ch.isCritical ? 'var(--status-danger-fg)' : 'var(--neutral-fg-3)',
                      }}>
                        avg {ch.avgPct}% · min {ch.minPct}%
                      </span>
                    </div>
                    <div style={{ height: 7, background: 'var(--neutral-bg-3)', borderRadius: 999, overflow: 'hidden' }}>
                      <div
                        className="bar-fill"
                        style={{
                          width: `${ch.avgPct}%`,
                          background: ch.isCritical ? 'var(--status-danger-fg)' : CHANNEL_COLOR[ch.channel],
                          animationDelay: `${(gi * 4 + ci) * 0.04}s`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
