'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DeviceTable }       from '@/components/dashboard/DeviceTable'
import { DeviceGridCard }    from '@/components/devices/DeviceGridCard'
import { DeviceDetailPanel } from '@/components/detail/DeviceDetailPanel'
import { EditDeviceModal }   from '@/components/devices/EditDeviceModal'
import { IconList, IconGrid, IconSearch, IconCheck, IconX } from '@/components/ui/Icons'
import type { Device } from '@/lib/types'

type Toast = { msg: string; ok: boolean } | null

type View   = 'list' | 'grid'
type Filter = 'all' | 'ok' | 'warn' | 'danger' | 'toner_low' | 'toner_empty'

const FILTER_LABELS: Record<Filter, string> = {
  all:         'All',
  ok:          'Online',
  warn:        'Warning',
  danger:      'Offline',
  toner_low:   'Low Toner',
  toner_empty: 'Replace Toner',
}

const FILTER_ORDER: Filter[] = ['all', 'ok', 'warn', 'danger', 'toner_low', 'toner_empty']

export function DevicesClient({ devices }: { devices: Device[] }) {
  const router = useRouter()

  const [selected, setSelected] = useState<Device | null>(null)
  const [editing,  setEditing]  = useState<Device | null>(null)
  const [query,    setQuery]    = useState('')
  const [filter,   setFilter]   = useState<Filter>('all')
  const [view,     setView]     = useState<View>('list')
  const [toast,    setToast]    = useState<Toast>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const counts: Record<Filter, number> = {
    all:         devices.length,
    ok:          devices.filter(d => d.status === 'ok').length,
    warn:        devices.filter(d => d.status === 'warn').length,
    danger:      devices.filter(d => d.status === 'danger').length,
    toner_low:   devices.filter(d => d.tonerAlert === 'low').length,
    toner_empty: devices.filter(d => d.tonerAlert === 'empty').length,
  }

  const filtered = devices.filter(d => {
    const q = query.toLowerCase()
    const matchQ = q === '' ||
      d.name.toLowerCase().includes(q) ||
      d.ip.includes(q) ||
      d.location.toLowerCase().includes(q)

    let matchF = true
    if (filter === 'toner_low')   matchF = d.tonerAlert === 'low'
    else if (filter === 'toner_empty') matchF = d.tonerAlert === 'empty'
    else if (filter !== 'all')    matchF = d.status === filter

    return matchQ && matchF
  })

  return (
    <>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '0 0 300px' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-fg-3)', pointerEvents: 'none' }}>
            <IconSearch size={13} />
          </span>
          <input
            type="text"
            placeholder="Search by name, IP or location…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              height: 32, padding: '0 12px 0 32px', fontSize: 13, width: '100%',
              border: '1px solid var(--neutral-stroke-1)', borderRadius: 'var(--radius-control)',
              background: '#fff', color: 'var(--neutral-fg-1)', outline: 'none',
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {FILTER_ORDER.map(f => (
            <button
              key={f}
              className={'btn' + (filter === f ? ' primary' : ' secondary') + ' small'}
              onClick={() => setFilter(f)}
            >
              {FILTER_LABELS[f]} ({counts[f]})
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <div className="view-toggle">
            <button
              className={view === 'list' ? 'active' : ''}
              onClick={() => setView('list')}
              title="List view"
              aria-label="List view"
            >
              <IconList size={14} />
            </button>
            <button
              className={view === 'grid' ? 'active' : ''}
              onClick={() => setView('grid')}
              title="Grid view"
              aria-label="Grid view"
            >
              <IconGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* List view */}
      {view === 'list' && (
        <DeviceTable devices={filtered} onSelect={setSelected} onEdit={setEditing} />
      )}

      {/* Grid view */}
      {view === 'grid' && (
        filtered.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--neutral-fg-3)', padding: '16px 0' }}>
            No devices match your filter.
          </p>
        ) : (
          <div className="device-grid">
            {filtered.map((d, i) => (
              <DeviceGridCard key={d.id} device={d} onSelect={setSelected} onEdit={setEditing} index={i} />
            ))}
          </div>
        )
      )}

      {/* Quick-view panel */}
      <DeviceDetailPanel device={selected} onClose={() => setSelected(null)} />

      {/* Edit modal */}
      {editing && (
        <EditDeviceModal
          device={editing}
          onClose={() => setEditing(null)}
          onSuccess={label => {
            showToast(`"${label}" updated`, true)
            setEditing(null)
            router.refresh()
          }}
          onDeleted={() => {
            showToast('Device deleted', true)
            setEditing(null)
            router.refresh()
          }}
        />
      )}

      {toast && (
        <div className={'action-toast' + (toast.ok ? '' : ' error')}>
          {toast.ok ? <IconCheck size={13} /> : <IconX size={13} />}
          {toast.msg}
        </div>
      )}
    </>
  )
}
