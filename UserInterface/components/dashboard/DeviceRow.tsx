'use client'
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

function TonerBars({ values, names, mono }: {
  values: [number, number, number, number]
  names:  [string, string, string, string]
  mono:   boolean
}) {
  const bars = mono ? [{ v: values[0], n: names[0] }] : values.map((v, i) => ({ v, n: names[i] }))
  const tip  = bars.map(b => b.n ? `${b.n}: ${b.v}%` : `${b.v}%`).join(' · ')
  return (
    <span className="toner-bars" title={tip}>
      {bars.map(({ v, n }, i) => (
        <span className="bar" key={i} title={n || undefined}>
          <span
            className="bar-fill"
            style={{
              height: `${v}%`,
              background: TONER_COLORS[i],
              position: 'absolute',
              left: 0, right: 0, bottom: 0,
              animationDelay: `${i * 0.07}s`,
              transformOrigin: 'bottom center',
            }}
          />
        </span>
      ))}
    </span>
  )
}

export function DeviceRow({ device, onSelect }: { device: Device; onSelect: (d: Device) => void }) {
  const liveStatuses = useDeviceStatus()
  const status = liveStatuses.get(device.id) ?? device.status

  const utilColor = device.utilization > 85
    ? 'var(--status-danger-fg)'
    : device.utilization < 20
      ? 'var(--neutral-fg-disabled)'
      : 'var(--m365-brand)'

  const tonerLabel = TONER_ALERT_LABEL[device.tonerAlert]

  return (
    <tr onClick={() => onSelect(device)} className="fleet-row">
      <td>
        <div style={{ fontWeight: 500 }}>{device.name}</div>
        <div style={{ color: 'var(--neutral-fg-3)', fontSize: 11 }}>{device.id} · {device.location}</div>
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
          <span className={'badge ' + status}>
            <span className="dot" />{STATUS_LABELS[status]}
          </span>
          {tonerLabel && (
            <span className={'badge ' + TONER_ALERT_CLASS[device.tonerAlert]}>
              <span className="dot" />{tonerLabel}
            </span>
          )}
        </div>
      </td>
      <td><TonerBars values={device.toner} names={device.tonerNames} mono={device.mono} /></td>
      <td style={{ width: 150 }}>
        <div className="util">
          <div className="bar-fill" style={{ width: `${device.utilization}%`, background: utilColor }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          {device.utilization}%
        </div>
      </td>
      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {device.pages30d.toLocaleString()}
      </td>
      <td>
        <span className={'chip ' + device.recommendation}>
          {device.recommendation[0].toUpperCase() + device.recommendation.slice(1)}
        </span>
      </td>
    </tr>
  )
}
