import Link from 'next/link'
import { notFound }             from 'next/navigation'
import { IconChevronRight, IconAlertCircle, IconPrinter } from '@/components/ui/Icons'
import { api }                   from '@/lib/api'
import { normalizeConsumables, normalizeDevices } from '@/lib/normalize'
import { groupByTonerSeries, CHANNEL_LABEL, CHANNEL_COLOR } from '@/lib/toner'
import type { Device } from '@/lib/types'

interface PageProps {
  params: { model: string }
}

export default async function TonerSeriesDetailPage({ params }: PageProps) {
  // Series keys preserve case (e.g. "CARTRIDGE HP W222xA" — lowercase 'x' merges KCMY variants).
  // Don't uppercase here, or the lookup misses HP-style series.
  const seriesName = decodeURIComponent(params.model)

  const [rawConsumables, rawPrinters] = await Promise.all([
    api.consumables().catch(() => []),
    api.printers().catch(() => []),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stock   = normalizeConsumables(rawConsumables as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const devices = normalizeDevices(rawPrinters as any)

  const groups = groupByTonerSeries(stock)
  const group  = groups.find(g => g.series === seriesName)

  if (!group) notFound()

  // Build printerId → { device, channels: Record<channel, pct> }
  const printerMap = new Map<string, {
    printerId: string
    device:    Device | undefined
    channels:  Record<string, number>
    minPct:    number
  }>()

  for (const ch of group.channels) {
    for (const item of ch.items) {
      const pid = item.printerId ?? 'unknown'
      if (!printerMap.has(pid)) {
        printerMap.set(pid, {
          printerId: pid,
          device:    devices.find(d => d.id === pid),
          channels:  {},
          minPct:    100,
        })
      }
      const pct = item.cap > 0 ? Math.round((item.qty / item.cap) * 100) : 0
      const entry = printerMap.get(pid)!
      entry.channels[ch.channel] = pct
      entry.minPct = Math.min(entry.minPct, pct)
    }
  }

  const printers = Array.from(printerMap.values()).sort((a, b) => a.minPct - b.minPct)
  const criticalCount = printers.filter(p => p.minPct < 20).length

  return (
    <div className="page-fade">
      <div className="breadcrumb">
        Monitor <IconChevronRight size={10} /> Consumables{' '}
        <IconChevronRight size={10} />
        <Link href="/consumables/groups" style={{ color: 'inherit' }}>Toner groups</Link>
        {' '}<IconChevronRight size={10} /> {group.series}
      </div>

      <div className="page-head">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {group.series}
            {group.isMono && (
              <span style={{
                fontSize: 12, fontWeight: 400, color: 'var(--neutral-fg-3)',
                padding: '2px 8px', border: '1px solid var(--neutral-stroke-1)', borderRadius: 6,
              }}>
                Mono
              </span>
            )}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)', marginTop: 4 }}>
            {printers.length} printer{printers.length !== 1 ? 's' : ''} using this toner series
          </p>
        </div>
        <Link href="/consumables/groups" className="btn secondary">← Back to groups</Link>
      </div>

      {/* Summary */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <div className="card kpi">
          <div className="kpi-label">Printers</div>
          <div className="kpi-num">{printers.length}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Channels</div>
          <div className="kpi-num">{group.channels.length}</div>
          <div className="kpi-sub">{group.isMono ? 'Monochrome' : 'Colour (KCMY)'}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Critical printers</div>
          <div className="kpi-num" style={{ color: criticalCount > 0 ? 'var(--status-danger-fg)' : 'inherit' }}>
            {criticalCount}
          </div>
          <div className="kpi-sub">Any channel &lt; 20%</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Avg min level</div>
          <div className="kpi-num">
            {printers.length
              ? Math.round(printers.reduce((s, p) => s + p.minPct, 0) / printers.length)
              : 0}%
          </div>
        </div>
      </div>

      {/* Channel summary bars */}
      <div className="card" style={{ padding: '16px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--neutral-fg-3)', marginBottom: 12 }}>
          Fleet-wide channel levels
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {group.channels.map((ch, ci) => (
            <div key={ch.channel}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: CHANNEL_COLOR[ch.channel], fontFamily: 'monospace' }}>
                  {ch.fullName}
                  <span style={{ fontWeight: 400, fontFamily: 'inherit', color: 'var(--neutral-fg-3)', marginLeft: 6 }}>
                    {CHANNEL_LABEL[ch.channel]}
                  </span>
                </span>
                <span style={{
                  fontVariantNumeric: 'tabular-nums',
                  color: ch.isCritical ? 'var(--status-danger-fg)' : 'var(--neutral-fg-3)',
                }}>
                  avg {ch.avgPct}% · min {ch.minPct}%
                  {ch.isCritical && ' ⚠'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ flex: 1, height: 10, background: 'var(--neutral-bg-3)', borderRadius: 999, overflow: 'hidden' }}>
                  <div
                    className="bar-fill"
                    style={{
                      width: `${ch.avgPct}%`,
                      background: ch.isCritical ? 'var(--status-danger-fg)' : CHANNEL_COLOR[ch.channel],
                      animationDelay: `${ci * 0.08}s`,
                    }}
                  />
                </div>
                <div style={{ height: 10, background: 'var(--neutral-bg-3)', borderRadius: 999, overflow: 'hidden', width: `${ch.minPct}%`, maxWidth: '30%', flexShrink: 0 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-printer breakdown */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          Printer-by-printer stock
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {printers.map((p, pi) => {
            const isCritical = p.minPct < 20
            const href = p.device ? `/devices/${p.device.id}` : '#'

            return (
              <Link
                key={p.printerId}
                href={href}
                className="toner-printer-row stagger"
                style={{ '--i': pi } as React.CSSProperties}
              >
                {/* Printer icon + name */}
                <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: 'var(--neutral-bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconPrinter size={18} style={{ color: 'var(--neutral-fg-3)' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    {isCritical && (
                      <IconAlertCircle size={12} style={{ color: 'var(--status-danger-fg)', flexShrink: 0 }} />
                    )}
                    <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.device?.name ?? `Printer ${p.printerId}`}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>
                    {p.device?.location ?? '—'}{p.device?.ip ? ` · ${p.device.ip}` : ''}
                  </div>

                  {/* Channel bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
                    {group.channels.map((ch, ci) => {
                      const pct = p.channels[ch.channel] ?? 0
                      const low = pct < 20
                      return (
                        <div key={ch.channel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: CHANNEL_COLOR[ch.channel], minWidth: 64, flexShrink: 0 }}>
                            {ch.fullName}
                          </span>
                          <div style={{ flex: 1, height: 5, background: 'var(--neutral-bg-3)', borderRadius: 999, overflow: 'hidden' }}>
                            <div
                              className="bar-fill"
                              style={{
                                width: `${pct}%`,
                                background: low ? 'var(--status-danger-fg)' : CHANNEL_COLOR[ch.channel],
                                animationDelay: `${(pi * group.channels.length + ci) * 0.02}s`,
                              }}
                            />
                          </div>
                          <span style={{
                            width: 30, textAlign: 'right', fontSize: 11, fontVariantNumeric: 'tabular-nums',
                            color: low ? 'var(--status-danger-fg)' : 'var(--neutral-fg-3)',
                          }}>
                            {pct}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span className={`badge ${p.device?.status ?? 'neutral'}`} style={{ fontSize: 10 }}>
                    <span className="dot" />
                    {p.device?.status === 'ok' ? 'Online'
                      : p.device?.status === 'warn' ? 'Warning'
                      : p.device?.status === 'danger' ? 'Service'
                      : 'Idle'}
                  </span>
                  <IconChevronRight size={14} style={{ color: 'var(--neutral-fg-3)' }} />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
