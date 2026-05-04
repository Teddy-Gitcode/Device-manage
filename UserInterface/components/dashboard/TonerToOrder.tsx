import Link from 'next/link'
import type { Device } from '@/lib/types'

const TONER_COLORS = ['var(--toner-k)', 'var(--toner-c)', 'var(--toner-m)', 'var(--toner-y)']

interface LowChannel {
  deviceId:  string
  device:    string
  location:  string
  model:     string
  level:     number
  color:     string
}

function buildOrderList(devices: Device[]): LowChannel[] {
  const rows: LowChannel[] = []
  for (const d of devices) {
    const channels = d.mono ? [0] : [0, 1, 2, 3]
    for (const i of channels) {
      const level = d.toner[i]
      const model = d.tonerNames[i]
      if (!model || level >= 30) continue
      rows.push({
        deviceId: d.id,
        device:   d.name,
        location: d.location,
        model,
        level,
        color: TONER_COLORS[i],
      })
    }
  }
  return rows.sort((a, b) => a.level - b.level).slice(0, 10)
}

export function TonerToOrder({ devices }: { devices: Device[] }) {
  const rows = buildOrderList(devices)

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="card-head">
        <div className="card-title">Toner to order</div>
        <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>
          {rows.length > 0 ? `${rows.length} cartridge${rows.length !== 1 ? 's' : ''} < 30%` : 'All stocked'}
        </span>
      </div>

      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)', padding: '8px 0' }}>
          All toner levels are above 30%.
        </p>
      ) : (
        <div>
          {rows.map((row, i) => {
            const urgentColor = row.level <= 5
              ? 'var(--status-danger-fg)'
              : row.level < 20
                ? 'var(--status-warning-fg)'
                : 'var(--neutral-fg-3)'
            return (
              <Link
                key={`${row.deviceId}-${row.model}-${i}`}
                href={`/devices/${row.deviceId}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  className="stagger"
                  style={{
                    '--i': i,
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 0',
                    borderBottom: i < rows.length - 1 ? '1px solid var(--neutral-stroke-divider)' : 'none',
                    cursor: 'pointer',
                  } as React.CSSProperties}
                >
                  {/* Color swatch */}
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: row.color, flexShrink: 0 }} />

                  {/* Model + device */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: row.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.model}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--neutral-fg-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.device}
                    </div>
                  </div>

                  {/* Mini bar */}
                  <div style={{ width: 48, height: 5, background: 'var(--neutral-bg-3)', borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.max(row.level, 2)}%`,
                        background: urgentColor,
                        animationDelay: `${i * 0.04}s`,
                      }}
                    />
                  </div>

                  {/* Level */}
                  <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: urgentColor, width: 32, textAlign: 'right', flexShrink: 0 }}>
                    {row.level}%
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
