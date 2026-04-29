'use client'
import Link from 'next/link'
import { useDeviceStatus } from '@/hooks/useDeviceStatus'
import type { Device, DeviceStatus, TonerAlert } from '@/lib/types'

const STATUS_LABELS: Record<DeviceStatus, string> = {
  ok:      'Online',
  warn:    'Warning',
  danger:  'Offline',
  neutral: 'Sleeping',
}

const TONER_ALERT_LABEL: Record<TonerAlert, string | null> = {
  none:  null,
  low:   'Low Toner',
  empty: 'Replace Toner',
}

const TONER_ALERT_CLASS: Record<TonerAlert, string> = {
  none:  '',
  low:   'warn',
  empty: 'danger',
}

const TONER_COLORS = ['var(--toner-k)', 'var(--toner-c)', 'var(--toner-m)', 'var(--toner-y)']
const TONER_KEYS   = ['K', 'C', 'M', 'Y']

interface Props {
  device:   Device
  onSelect: (d: Device) => void
  index?:   number
}

export function DeviceGridCard({ device, onSelect, index = 0 }: Props) {
  const liveStatuses = useDeviceStatus()
  const status = liveStatuses.get(device.id) ?? device.status

  const utilColor = device.utilization > 85
    ? 'var(--status-danger-fg)'
    : device.utilization < 20
      ? 'var(--neutral-fg-disabled)'
      : 'var(--m365-brand)'

  const toners = device.mono
    ? [{ key: 'K', pct: device.toner[0], color: TONER_COLORS[0], name: device.tonerNames[0] || 'K' }]
    : TONER_KEYS.map((k, i) => ({ key: k, pct: device.toner[i], color: TONER_COLORS[i], name: device.tonerNames[i] || k }))

  const tonerLabel = TONER_ALERT_LABEL[device.tonerAlert]

  return (
    <div
      className="device-card stagger"
      style={{ '--i': index } as React.CSSProperties}
      onClick={() => onSelect(device)}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div className="device-card-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {device.name}
          </div>
          <div className="device-card-sub">{device.location} · {device.ip}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span className={'badge ' + status}>
            <span className="dot" />{STATUS_LABELS[status]}
          </span>
          {tonerLabel && (
            <span className={'badge ' + TONER_ALERT_CLASS[device.tonerAlert]}>
              <span className="dot" />{tonerLabel}
            </span>
          )}
        </div>
      </div>

      {/* Toner levels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {toners.map((t, i) => (
          <div key={t.key} className="device-card-toner-row">
            <span className="label" title={t.name} style={{
              width: 64, fontSize: 9, fontFamily: 'monospace',
              color: t.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {t.name}
            </span>
            <div className="track">
              <div
                className="bar-fill"
                style={{
                  width: `${t.pct}%`,
                  background: t.pct < 20 ? 'var(--status-danger-fg)' : t.color,
                  animationDelay: `${i * 0.07}s`,
                }}
              />
            </div>
            <span style={{ width: 32, textAlign: 'right', fontSize: 11, fontVariantNumeric: 'tabular-nums', color: t.pct < 20 ? 'var(--status-danger-fg)' : 'var(--neutral-fg-3)' }}>
              {t.pct}%
            </span>
          </div>
        ))}
      </div>

      {/* Utilization */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--neutral-fg-3)', marginBottom: 4 }}>
          <span>Utilization</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{device.utilization}%</span>
        </div>
        <div className="util">
          <div className="bar-fill" style={{ width: `${device.utilization}%`, background: utilColor }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <span className={'chip ' + device.recommendation} style={{ fontSize: 11 }}>
          {device.recommendation[0].toUpperCase() + device.recommendation.slice(1)}
        </span>
        <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginLeft: 'auto' }}>
          {device.pages30d.toLocaleString()} pp
        </span>
        <button
          className="btn subtle small"
          onClick={e => { e.stopPropagation(); onSelect(device) }}
          style={{ fontSize: 11, padding: '2px 8px' }}
        >
          Quick view
        </button>
        <Link
          href={`/devices/${device.id}`}
          className="btn secondary small"
          style={{ fontSize: 11, padding: '2px 8px' }}
          onClick={e => e.stopPropagation()}
        >
          Details →
        </Link>
      </div>
    </div>
  )
}
