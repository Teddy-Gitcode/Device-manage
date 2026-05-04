import Link from 'next/link'
import { IconAlertCircle, IconAlert, IconCheckCircle } from '@/components/ui/Icons'
import type { Device } from '@/lib/types'

interface ActionItem {
  deviceId:  string
  device:    string
  location:  string
  message:   string
  severity:  'danger' | 'warn'
}

function buildActions(devices: Device[]): ActionItem[] {
  const items: ActionItem[] = []

  for (const d of devices) {
    // Devices with real active alerts (filter out noise like sleep mode)
    const realAlerts = d.activeAlerts.filter(
      a => !a.toLowerCase().includes('sleep'),
    )
    for (const alert of realAlerts) {
      items.push({ deviceId: d.id, device: d.name, location: d.location, message: alert, severity: 'danger' })
    }

    // Offline with no specific alert — show as generic offline
    if (d.status === 'danger' && realAlerts.length === 0) {
      items.push({ deviceId: d.id, device: d.name, location: d.location, message: 'Device offline', severity: 'danger' })
    }

    // Toner needs replacement (but no alert already shown above)
    if (d.tonerAlert === 'empty' && realAlerts.length === 0 && d.status !== 'danger') {
      items.push({ deviceId: d.id, device: d.name, location: d.location, message: 'Toner empty — replace cartridge', severity: 'warn' })
    }
  }

  // Sort: danger before warn, then alphabetically by device name
  return items
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'danger' ? -1 : 1
      return a.device.localeCompare(b.device)
    })
    .slice(0, 8)
}

export function ActionItems({ devices }: { devices: Device[] }) {
  const items = buildActions(devices)

  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div className="card-head">
        <div className="card-title">Action items</div>
        <span style={{ fontSize: 11, color: items.length > 0 ? 'var(--status-danger-fg)' : 'var(--status-success-fg)', fontWeight: 600 }}>
          {items.length > 0 ? `${items.length} open` : 'All clear'}
        </span>
      </div>

      {items.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0', color: 'var(--status-success-fg)' }}>
          <IconCheckCircle size={20} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Fleet is healthy</div>
            <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginTop: 2 }}>No devices need attention right now</div>
          </div>
        </div>
      ) : (
        <div>
          {items.map((item, i) => {
            const Icon = item.severity === 'danger' ? IconAlertCircle : IconAlert
            const color = item.severity === 'danger' ? 'var(--status-danger-fg)' : 'var(--status-warning-fg)'
            const bg    = item.severity === 'danger' ? 'var(--status-danger-bg)'  : 'var(--status-warning-bg)'
            return (
              <Link
                key={`${item.deviceId}-${i}`}
                href={`/devices/${item.deviceId}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  className="stagger"
                  style={{
                    '--i': i,
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '9px 0',
                    borderBottom: i < items.length - 1 ? '1px solid var(--neutral-stroke-divider)' : 'none',
                    cursor: 'pointer',
                  } as React.CSSProperties}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: 999,
                    background: bg, color, border: `1px solid ${color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--neutral-fg-1)' }}>
                      {item.message}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.device}
                      {item.location && <> · {item.location}</>}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--m365-brand)', flexShrink: 0, alignSelf: 'center' }}>View →</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
