'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconRefresh, IconEdit, IconTrash, IconCheck, IconX } from '@/components/ui/Icons'
import { EditDeviceModal } from './EditDeviceModal'
import type { Device } from '@/lib/types'

type Toast = { msg: string; ok: boolean } | null

export function DeviceDetailActions({ device }: { device: Device }) {
  const router = useRouter()

  const [editOpen,    setEditOpen]    = useState(false)
  const [polling,     setPolling]     = useState(false)
  const [toast,       setToast]       = useState<Toast>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function handlePoll() {
    if (polling) return
    setPolling(true)
    try {
      const res = await fetch('/api/devices/poll', { method: 'POST' })
      if (res.ok) {
        showToast('Polling started — page will refresh in a moment', true)
        setTimeout(() => router.refresh(), 4000)
      } else {
        showToast('Poll failed — check backend logs', false)
      }
    } catch {
      showToast('Network error', false)
    }
    setPolling(false)
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          className="btn secondary small"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          onClick={handlePoll}
          disabled={polling}
        >
          <IconRefresh size={13} style={{ animation: polling ? 'spin 0.75s linear infinite' : undefined }} />
          {polling ? 'Polling…' : 'Poll now'}
        </button>
        <button
          className="btn secondary small"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
          onClick={() => setEditOpen(true)}
        >
          <IconEdit size={13} /> Edit
        </button>
      </div>

      {editOpen && (
        <EditDeviceModal
          device={device}
          onClose={() => setEditOpen(false)}
          onSuccess={label => {
            showToast(`"${label}" updated`, true)
            router.refresh()
          }}
          onDeleted={() => {
            showToast('Device deleted', true)
            router.push('/devices')
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
