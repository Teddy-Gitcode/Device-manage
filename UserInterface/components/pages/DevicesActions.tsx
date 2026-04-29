'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  IconRefresh, IconPlus, IconX, IconCheck, IconActivity,
} from '@/components/ui/Icons'
import { AddDeviceModal } from '@/components/devices/AddDeviceModal'

type BtnState = 'idle' | 'loading' | 'done' | 'error'
type Toast    = { msg: string; ok: boolean } | null

// ── Sub-components ────────────────────────────────────────────────────────────

function PollBtn({ state, onClick }: { state: BtnState; onClick: () => void }) {
  return (
    <button
      className="btn secondary"
      onClick={onClick}
      disabled={state === 'loading'}
      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <IconRefresh
        size={13}
        style={{
          animation:  state === 'loading' ? 'spin 0.75s linear infinite' : undefined,
          color:      state === 'done'  ? 'var(--status-success-fg)'
                    : state === 'error' ? 'var(--status-danger-fg)'
                    : undefined,
          transition: 'color 0.2s',
        }}
      />
      {state === 'loading' ? 'Polling…' : state === 'done' ? 'Done!' : 'Poll all'}
    </button>
  )
}

function DiscoverBtn({ state, onClick }: { state: BtnState; onClick: () => void }) {
  return (
    <button
      className="btn secondary"
      onClick={onClick}
      disabled={state === 'loading'}
      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <IconActivity
        size={13}
        style={{
          animation:  state === 'loading' ? 'pulse 1s ease-in-out infinite' : undefined,
          color:      state === 'done'  ? 'var(--status-success-fg)'
                    : state === 'error' ? 'var(--status-danger-fg)'
                    : undefined,
          transition: 'color 0.2s',
        }}
      />
      {state === 'loading' ? 'Scanning…' : state === 'done' ? 'Done!' : 'Discover'}
    </button>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function ActionToast({ toast }: { toast: Toast }) {
  if (!toast) return null
  return (
    <div className={'action-toast' + (toast.ok ? '' : ' error')}>
      {toast.ok
        ? <IconCheck  size={13} style={{ flexShrink: 0 }} />
        : <IconX      size={13} style={{ flexShrink: 0 }} />
      }
      {toast.msg}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function DevicesActions() {
  const router = useRouter()

  const [pollState,     setPollState]     = useState<BtnState>('idle')
  const [discoverState, setDiscoverState] = useState<BtnState>('idle')
  const [addOpen,       setAddOpen]       = useState(false)
  const [toast,         setToast]         = useState<Toast>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function handlePoll() {
    if (pollState === 'loading') return
    setPollState('loading')
    try {
      const res = await fetch('/api/devices/poll', { method: 'POST' })
      if (res.ok) {
        setPollState('done')
        showToast('Polling started — devices will update shortly', true)
      } else {
        setPollState('error')
        showToast('Poll failed — check backend logs', false)
      }
    } catch {
      setPollState('error')
      showToast('Network error', false)
    }
    setTimeout(() => setPollState('idle'), 2500)
  }

  async function handleDiscover() {
    if (discoverState === 'loading') return
    setDiscoverState('loading')
    try {
      const res = await fetch('/api/devices/discover', { method: 'POST' })
      if (res.ok) {
        setDiscoverState('done')
        showToast('Discovery scan started — new devices will appear when found', true)
      } else {
        setDiscoverState('error')
        showToast('Discovery failed — check backend logs', false)
      }
    } catch {
      setDiscoverState('error')
      showToast('Network error', false)
    }
    setTimeout(() => setDiscoverState('idle'), 2500)
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <DiscoverBtn state={discoverState} onClick={handleDiscover} />
        <PollBtn     state={pollState}     onClick={handlePoll} />
        <button
          className="btn primary"
          onClick={() => setAddOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <IconPlus size={13} /> Add device
        </button>
      </div>

      {addOpen && (
        <AddDeviceModal
          onClose={() => setAddOpen(false)}
          onSuccess={label => {
            showToast(`"${label}" added successfully`, true)
            router.refresh()
          }}
        />
      )}

      <ActionToast toast={toast} />
    </>
  )
}
