'use client'
import { useState } from 'react'
import { IconRefresh, IconPlus, IconX } from '@/components/ui/Icons'

function Field({
  label, value, onChange, placeholder, required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-fg-2)' }}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          height: 34, padding: '0 10px', fontSize: 13,
          border: '1px solid var(--neutral-stroke-1)',
          borderRadius: 'var(--radius-control)',
          background: '#fff', color: 'var(--neutral-fg-1)',
          outline: 'none', width: '100%', boxSizing: 'border-box',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = 'var(--m365-brand)')}
        onBlur={e  => (e.currentTarget.style.borderColor = 'var(--neutral-stroke-1)')}
      />
    </label>
  )
}

export function AddDeviceModal({
  onClose, onSuccess,
}: {
  onClose: () => void
  onSuccess: (label: string) => void
}) {
  const [form, setForm] = useState({ ip_address: '', name: '', location: '', model_name: '', mac_address: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.ip_address.trim()) { setError('IP address is required'); return }
    setSubmitting(true)
    setError('')

    const body: Record<string, string> = { ip_address: form.ip_address.trim() }
    if (form.name)        body.name        = form.name.trim()
    if (form.location)    body.location    = form.location.trim()
    if (form.model_name)  body.model_name  = form.model_name.trim()
    if (form.mac_address) body.mac_address = form.mac_address.trim()

    try {
      const res = await fetch('/api/devices/add', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (res.ok || res.status === 201) {
        onSuccess(form.name || form.ip_address)
        onClose()
        return
      }
      const d = await res.json().catch(() => ({}))
      const msg = typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Failed to add device'
      setError(msg)
    } catch {
      setError('Network error — check your connection')
    }
    setSubmitting(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--neutral-fg-1)' }}>Add device</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neutral-fg-3)', display: 'flex', padding: 4, borderRadius: 4 }}>
            <IconX size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="IP Address *" value={form.ip_address} onChange={v => set('ip_address', v)} placeholder="e.g. 192.168.1.50" required />
            <Field label="Name"          value={form.name}       onChange={v => set('name', v)}       placeholder="e.g. HP LaserJet HQ Floor" />
            <Field label="Location"      value={form.location}   onChange={v => set('location', v)}   placeholder="e.g. Kericho · Admin" />
            <Field label="Model"         value={form.model_name} onChange={v => set('model_name', v)} placeholder="e.g. KYOCERA ECOSYS M5526cdw" />
            <Field label="MAC Address"   value={form.mac_address} onChange={v => set('mac_address', v)} placeholder="e.g. AA:BB:CC:DD:EE:FF" />
          </div>

          {error && <p style={{ fontSize: 12, color: 'var(--status-danger-fg)', marginTop: 12, marginBottom: 0, lineHeight: 1.4 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, marginTop: 22, justifyContent: 'flex-end' }}>
            <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 110 }}>
              {submitting ? <IconRefresh size={13} style={{ animation: 'spin 0.75s linear infinite' }} /> : <IconPlus size={13} />}
              {submitting ? 'Adding…' : 'Add device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
