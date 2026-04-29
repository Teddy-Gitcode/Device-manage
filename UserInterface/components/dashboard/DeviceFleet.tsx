'use client'
import { useState } from 'react'
import { DeviceGridCard } from '@/components/devices/DeviceGridCard'
import { DeviceRow }      from './DeviceRow'
import { IconList, IconGrid } from '@/components/ui/Icons'
import type { Device } from '@/lib/types'

interface Props {
  devices:  Device[]
  onSelect: (d: Device) => void
}

export function DeviceFleet({ devices, onSelect }: Props) {
  const [view, setView] = useState<'grid' | 'list'>('grid')

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
      <div className="card-head" style={{ padding: '14px 16px', marginBottom: 0 }}>
        <div className="card-title">
          Device fleet
          <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--neutral-fg-3)' }}>
            {devices.length} device{devices.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="view-toggle">
          <button
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
            aria-label="List view"
            title="List view"
          >
            <IconList size={14} />
          </button>
          <button
            className={view === 'grid' ? 'active' : ''}
            onClick={() => setView('grid')}
            aria-label="Grid view"
            title="Grid view"
          >
            <IconGrid size={14} />
          </button>
        </div>
      </div>

      {devices.length === 0 ? (
        <p style={{ padding: '16px', fontSize: 13, color: 'var(--neutral-fg-3)' }}>
          No devices found. Check backend connection.
        </p>
      ) : view === 'grid' ? (
        <div style={{ padding: 16 }}>
          <div className="device-grid-3">
            {devices.map((d, i) => (
              <DeviceGridCard key={d.id} device={d} onSelect={onSelect} index={i} />
            ))}
          </div>
        </div>
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
