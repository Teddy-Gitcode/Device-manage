'use client'
import { useState } from 'react'
import { IconRefresh, IconSave, IconX, IconTrash } from '@/components/ui/Icons'
import type { Device } from '@/lib/types'

function Field({
  label, value, onChange, placeholder, type = 'text', hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  hint?: string
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-fg-2)' }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
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
      {hint && <span style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>{hint}</span>}
    </label>
  )
}

function SectionHead({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--neutral-fg-3)', margin: '18px 0 10px', borderBottom: '1px solid var(--neutral-stroke-divider)', paddingBottom: 6 }}>
      {label}
    </div>
  )
}

interface FormState {
  name:                        string
  ip_address:                  string
  location:                    string
  model_name:                  string
  serial_number:               string
  mac_address:                 string
  cost_per_page_mono:          string
  cost_per_page_color:         string
  target_monthly_volume:       string
  last_serviced_date:          string
  next_servicing_date:         string
  purchase_date:               string
  warranty_expiry:             string
  energy_consumption_rate_watts: string
  maintenance_kit_capacity:    string
}

function toForm(d: Device): FormState {
  return {
    name:                          d.name,
    ip_address:                    d.ip   !== '—' ? d.ip   : '',
    location:                      d.location,
    model_name:                    '',
    serial_number:                 d.serial !== '—' ? d.serial : '',
    mac_address:                   d.mac    !== '—' ? d.mac    : '',
    cost_per_page_mono:            d.costPerPage.replace('KES ', ''),
    cost_per_page_color:           '',
    target_monthly_volume:         d.monthlyDuty.replace(' pp/mo', '').replace(/,/g, ''),
    last_serviced_date:            d.lastService !== '—' ? d.lastService : '',
    next_servicing_date:           '',
    purchase_date:                 '',
    warranty_expiry:               '',
    energy_consumption_rate_watts: '',
    maintenance_kit_capacity:      '',
  }
}

function clean(v: string): string | null {
  const s = v.trim()
  return s === '' ? null : s
}

export function EditDeviceModal({
  device, onClose, onSuccess, onDeleted,
}: {
  device:    Device
  onClose:   () => void
  onSuccess: (label: string) => void
  onDeleted: () => void
}) {
  const [form,        setForm]        = useState<FormState>(() => toForm(device))
  const [submitting,  setSubmitting]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [error,       setError]       = useState('')

  function set<K extends keyof FormState>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const body: Record<string, string | number | null> = {
      name:                          clean(form.name),
      ip_address:                    clean(form.ip_address),
      location:                      clean(form.location),
      serial_number:                 clean(form.serial_number),
      mac_address:                   clean(form.mac_address),
      cost_per_page_mono:            clean(form.cost_per_page_mono),
      cost_per_page_color:           clean(form.cost_per_page_color),
      last_serviced_date:            clean(form.last_serviced_date),
      next_servicing_date:           clean(form.next_servicing_date),
      purchase_date:                 clean(form.purchase_date),
      warranty_expiry:               clean(form.warranty_expiry),
      target_monthly_volume:         form.target_monthly_volume.trim() ? Number(form.target_monthly_volume) : null,
      energy_consumption_rate_watts: form.energy_consumption_rate_watts.trim() ? Number(form.energy_consumption_rate_watts) : null,
      maintenance_kit_capacity:      form.maintenance_kit_capacity.trim() ? Number(form.maintenance_kit_capacity) : null,
    }
    if (form.model_name.trim()) body.model_name = form.model_name.trim()

    try {
      const res = await fetch(`/api/devices/${device.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (res.ok) {
        onSuccess(form.name || device.name)
        onClose()
        return
      }
      const d = await res.json().catch(() => ({}))
      const msg = typeof d === 'object' ? Object.values(d).flat().join(' ') : 'Update failed'
      setError(msg)
    } catch {
      setError('Network error — check your connection')
    }
    setSubmitting(false)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/devices/${device.id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        onDeleted()
        onClose()
        return
      }
      setError('Delete failed — check backend logs')
    } catch {
      setError('Network error')
    }
    setDeleting(false)
    setConfirmDel(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 520, width: '100%' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Edit device</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--neutral-fg-3)', display: 'flex', padding: 4, borderRadius: 4 }}>
            <IconX size={18} />
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--neutral-fg-3)', marginBottom: 4 }}>
          ID #{device.id} · last seen {device.ip}
        </div>

        <form onSubmit={handleSave}>
          <SectionHead label="Identity" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Name"       value={form.name}       onChange={v => set('name', v)}       placeholder="e.g. HP LaserJet Finance" />
            <Field label="IP Address" value={form.ip_address} onChange={v => set('ip_address', v)} placeholder="192.168.1.50" />
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="Location"   value={form.location}   onChange={v => set('location', v)}   placeholder="e.g. Ground Floor, Maintenance Building" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <Field label="Model name" value={form.model_name}   onChange={v => set('model_name', v)}   placeholder="e.g. KYOCERA ECOSYS M5526cdw" />
            <Field label="Serial no." value={form.serial_number} onChange={v => set('serial_number', v)} placeholder="e.g. XYZ123456" />
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="MAC address" value={form.mac_address} onChange={v => set('mac_address', v)} placeholder="AA:BB:CC:DD:EE:FF" />
          </div>

          <SectionHead label="Service" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Last serviced"     value={form.last_serviced_date}  onChange={v => set('last_serviced_date', v)}  type="date" />
            <Field label="Next service due"  value={form.next_servicing_date} onChange={v => set('next_servicing_date', v)} type="date" />
            <Field label="Purchase date"     value={form.purchase_date}       onChange={v => set('purchase_date', v)}       type="date" />
            <Field label="Warranty expiry"   value={form.warranty_expiry}     onChange={v => set('warranty_expiry', v)}     type="date" />
          </div>

          <SectionHead label="Cost & Capacity" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Cost/page mono (KES)"  value={form.cost_per_page_mono}  onChange={v => set('cost_per_page_mono', v)}  placeholder="e.g. 2.50" />
            <Field label="Cost/page colour (KES)" value={form.cost_per_page_color} onChange={v => set('cost_per_page_color', v)} placeholder="e.g. 8.00" />
            <Field label="Target monthly volume (pages)" value={form.target_monthly_volume} onChange={v => set('target_monthly_volume', v)} placeholder="e.g. 5000" hint="Used to compute utilization %" />
            <Field label="Maintenance kit capacity" value={form.maintenance_kit_capacity} onChange={v => set('maintenance_kit_capacity', v)} placeholder="e.g. 300000" />
          </div>

          {error && <p style={{ fontSize: 12, color: 'var(--status-danger-fg)', marginTop: 12, marginBottom: 0, lineHeight: 1.4 }}>{error}</p>}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 22, justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Delete side */}
            {!confirmDel ? (
              <button
                type="button"
                className="btn subtle small"
                style={{ color: 'var(--status-danger-fg)', display: 'flex', alignItems: 'center', gap: 5 }}
                onClick={() => setConfirmDel(true)}
              >
                <IconTrash size={13} /> Delete device
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--status-danger-fg)', fontWeight: 500 }}>Are you sure?</span>
                <button
                  type="button"
                  className="btn small"
                  style={{ background: 'var(--status-danger-fg)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <IconRefresh size={11} style={{ animation: 'spin 0.75s linear infinite' }} /> : <IconTrash size={11} />}
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button type="button" className="btn secondary small" onClick={() => setConfirmDel(false)}>Cancel</button>
              </div>
            )}

            {/* Save side */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
              <button
                type="submit"
                className="btn primary"
                disabled={submitting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}
              >
                {submitting
                  ? <IconRefresh size={13} style={{ animation: 'spin 0.75s linear infinite' }} />
                  : <IconSave size={13} />}
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
