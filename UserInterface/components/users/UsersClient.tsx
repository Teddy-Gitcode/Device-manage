'use client'
import { useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { IconPlus, IconX } from '@/components/ui/Icons'

export interface SystemUser {
  id:          number
  username:    string
  email:       string
  first_name:  string
  last_name:   string
  role:        string
  is_active:   boolean
  date_joined: string
  last_login:  string | null
}

const ROLE_BADGE: Record<string, string> = {
  admin:    'danger',
  operator: 'info',
  viewer:   'neutral',
}

const ROLES = ['viewer', 'operator', 'admin'] as const

function relTime(ts: string | null): string {
  if (!ts) return 'Never'
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ── Add User Modal ────────────────────────────────────────────────────────────

function AddUserModal({ onClose, onAdded }: { onClose: () => void; onAdded: (u: SystemUser) => void }) {
  const { token } = useAuth()
  const [form, setForm] = useState({ username: '', password: '', email: '', first_name: '', last_name: '', role: 'viewer' })
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res  = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to create user'); return }
      onAdded(data as SystemUser)
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Add system user</h2>
          <button className="btn subtle small" onClick={onClose}><IconX size={15} /></button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <ModalField label="First name" value={form.first_name} onChange={v => set('first_name', v)} placeholder="First" />
            <ModalField label="Last name"  value={form.last_name}  onChange={v => set('last_name', v)}  placeholder="Last" />
          </div>
          <ModalField label="Username *" value={form.username} onChange={v => set('username', v)} placeholder="username" required />
          <ModalField label="Email"      value={form.email}    onChange={v => set('email', v)}    placeholder="user@ketepa.co.ke" type="email" />
          <ModalField label="Password *" value={form.password} onChange={v => set('password', v)} placeholder="Min 8 characters"  type="password" required />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-fg-2)' }}>Role</label>
            <select
              value={form.role}
              onChange={e => set('role', e.target.value)}
              style={{ height: 32, padding: '0 8px', border: '1px solid var(--neutral-stroke-1)', borderRadius: 'var(--radius-control)', fontSize: 13, background: 'var(--neutral-bg-1)', color: 'var(--neutral-fg-1)', outline: 'none' }}
            >
              {ROLES.map(r => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>

          {error && (
            <div style={{ padding: '8px 12px', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', borderRadius: 'var(--radius-control)', color: 'var(--status-danger-fg)', fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn secondary small" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary small" disabled={busy || !form.username || !form.password}>
              {busy ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalField({ label, value, onChange, placeholder, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-fg-2)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{ height: 32, padding: '0 8px', border: '1px solid var(--neutral-stroke-1)', borderRadius: 'var(--radius-control)', fontSize: 13, background: 'var(--neutral-bg-1)', color: 'var(--neutral-fg-1)', outline: 'none', width: '100%' }}
      />
    </div>
  )
}

// ── Edit Role Modal ───────────────────────────────────────────────────────────

function EditRoleModal({ user, onClose, onSaved }: {
  user: SystemUser; onClose: () => void; onSaved: (u: SystemUser) => void
}) {
  const { token } = useAuth()
  const [role,     setRole]     = useState(user.role)
  const [isActive, setIsActive] = useState(user.is_active)
  const [error,    setError]    = useState('')
  const [busy,     setBusy]     = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res  = await fetch(`/api/auth/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ role, is_active: isActive }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
      onSaved({ ...user, role: data.role, is_active: data.is_active })
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Edit — {user.username}</h2>
          <button className="btn subtle small" onClick={onClose}><IconX size={15} /></button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-fg-2)' }}>Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              style={{ height: 32, padding: '0 8px', border: '1px solid var(--neutral-stroke-1)', borderRadius: 'var(--radius-control)', fontSize: 13, background: 'var(--neutral-bg-1)', color: 'var(--neutral-fg-1)', outline: 'none' }}
            >
              {ROLES.map(r => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            Account active
          </label>

          {error && (
            <div style={{ padding: '8px 12px', background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', borderRadius: 'var(--radius-control)', color: 'var(--status-danger-fg)', fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn secondary small" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary small" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function UsersClient({ initialUsers }: { initialUsers: SystemUser[] }) {
  const { user: me } = useAuth()
  const { token }    = useAuth()
  const [users,    setUsers]    = useState<SystemUser[]>(initialUsers)
  const [showAdd,  setShowAdd]  = useState(false)
  const [editing,  setEditing]  = useState<SystemUser | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  async function handleDelete(u: SystemUser) {
    if (!confirm(`Delete account "${u.username}"? This cannot be undone.`)) return
    setDeleting(u.id)
    try {
      const res = await fetch(`/api/auth/users/${u.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Token ${token}` },
      })
      if (res.ok) setUsers(prev => prev.filter(x => x.id !== u.id))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-head" style={{ padding: '14px 16px' }}>
          <div>
            <div className="card-title">System accounts</div>
            <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginTop: 2 }}>
              {users.filter(u => u.role === 'admin').length} admin ·{' '}
              {users.filter(u => u.role === 'operator').length} operator ·{' '}
              {users.filter(u => u.role === 'viewer').length} viewer
            </div>
          </div>
          <button
            className="btn primary small"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowAdd(true)}
          >
            <IconPlus size={13} /> Add user
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ minWidth: 520 }}>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last active</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ cursor: 'default' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        className="avatar"
                        style={{
                          background: u.role === 'admin' ? 'var(--status-danger-fg)' : u.role === 'operator' ? 'var(--m365-brand)' : 'var(--neutral-fg-3)',
                          width: 28, height: 28, flexShrink: 0, fontSize: 11,
                        }}
                      >
                        {(u.first_name?.[0] ?? u.username[0]).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{u.username}</div>
                        {(u.first_name || u.last_name) && (
                          <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>
                            {[u.first_name, u.last_name].filter(Boolean).join(' ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--neutral-fg-3)', fontSize: 12 }}>{u.email || '—'}</td>
                  <td>
                    <span className={'badge ' + (ROLE_BADGE[u.role] ?? 'neutral')}>
                      <span className="dot" />
                      {u.role[0].toUpperCase() + u.role.slice(1)}
                    </span>
                  </td>
                  <td>
                    {u.is_active
                      ? <span className="badge ok"><span className="dot" />Active</span>
                      : <span className="badge neutral"><span className="dot" />Inactive</span>}
                  </td>
                  <td style={{ color: 'var(--neutral-fg-3)', fontSize: 11 }}>{relTime(u.last_login)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn subtle small" onClick={() => setEditing(u)}>Edit</button>
                      <button
                        className="btn subtle small"
                        style={{ color: u.username === me?.username ? 'var(--neutral-fg-disabled)' : 'var(--status-danger-fg)' }}
                        disabled={u.username === me?.username || deleting === u.id}
                        onClick={() => handleDelete(u)}
                      >
                        {deleting === u.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onAdded={u => setUsers(prev => [...prev, u as SystemUser])}
        />
      )}
      {editing && (
        <EditRoleModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))}
        />
      )}
    </div>
  )
}
