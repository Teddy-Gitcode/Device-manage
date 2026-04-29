import { DeviceRow } from './DeviceRow'
import { IconMore } from '@/components/ui/Icons'
import type { Device } from '@/lib/types'

export function DeviceTable({ devices, onSelect }: { devices: Device[]; onSelect: (d: Device) => void }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="card-head" style={{ padding: '14px 16px', marginBottom: 0 }}>
        <div className="card-title">Device fleet</div>
        <button className="btn subtle small"><IconMore size={14} /></button>
      </div>

      {devices.length === 0 ? (
        <p style={{ padding: '16px', fontSize: 13, color: 'var(--neutral-fg-3)' }}>
          No devices found. Check backend connection.
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Device</th>
              <th>Status</th>
              <th>Toner</th>
              <th>Util</th>
              <th style={{ textAlign: 'right' }}>Pages 30d</th>
              <th>Rec.</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => (
              <DeviceRow key={d.id} device={d} onSelect={onSelect} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
