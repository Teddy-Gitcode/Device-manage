'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { storeAuth } from '@/lib/auth'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function ProfileSection() {
  const { user, token, login } = useAuth()

  const [form, setForm]       = useState({ first_name: '', last_name: '', email: '' })
  const [profState, setProfState] = useState<SaveState>('idle')
  const [profError, setProfError] = useState('')

  const [pw, setPw]           = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwState, setPwState] = useState<SaveState>('idle')
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    if (user) setForm({ first_name: user.firstName, last_name: user.lastName, email: user.email })
  }, [user])

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }
  function setPW(k: string, v: string) { setPw(p => ({ ...p, [k]: v })) }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfError('')
    setProfState('saving')
    try {
      const res  = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ first_name: form.first_name, last_name: form.last_name, email: form.email }),
      })
      const data = await res.json()
      if (!res.ok) { setProfError(data.error ?? 'Failed to save'); setProfState('error'); return }
      // Update stored user so header/nav reflect the change immediately
      if (user && token) {
        const updated = { ...user, firstName: data.first_name ?? form.first_name, lastName: data.last_name ?? form.last_name, email: data.email ?? form.email }
        storeAuth(token, updated)
      }
      setProfState('saved')
      setTimeout(() => setProfState('idle'), 2500)
    } catch {
      setProfError('Network error')
      setProfState('error')
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (pw.new_password !== pw.confirm) { setPwError('Passwords do not match'); return }
    if (pw.new_password.length < 8)     { setPwError('Password must be at least 8 characters'); return }
    setPwState('saving')
    try {
      const res  = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ current_password: pw.current_password, new_password: pw.new_password }),
      })
      const data = await res.json()
      if (!res.ok) { setPwError(data.error ?? 'Failed'); setPwState('error'); return }
      // Backend re-issues a new token on password change — persist it
      if (data.token && user) {
        storeAuth(data.token, user)
        document.cookie = `ketepa_auth_token=${data.token}; path=/; SameSite=Lax`
      }
      setPw({ current_password: '', new_password: '', confirm: '' })
      setPwState('saved')
      setTimeout(() => setPwState('idle'), 2500)
    } catch {
      setPwError('Network error')
      setPwState('error')
    }
  }

  if (!user) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, marginBottom: 24 }}>
      {/* Profile info */}
      <div className="card stagger" style={{ padding: '14px 16px', '--i': 0 } as React.CSSProperties}>
        <div className="card-head">
          <div className="card-title">My profile</div>
          <span className={'badge ' + (user.role === 'admin' ? 'danger' : user.role === 'operator' ? 'info' : 'neutral')} style={{ fontSize: 10 }}>
            <span className="dot" />{user.role[0].toUpperCase() + user.role.slice(1)}
          </span>
        </div>

        <form onSubmit={saveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <ProfileField label="First name" value={form.first_name} onChange={v => setF('first_name', v)} placeholder="First name" />
            <ProfileField label="Last name"  value={form.last_name}  onChange={v => setF('last_name', v)}  placeholder="Last name" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <ProfileField label="Email" value={form.email} onChange={v => setF('email', v)} placeholder="you@ketepa.co.ke" type="email" />
          </div>
          <div style={{ padding: '10px 0', borderTop: '1px solid var(--neutral-stroke-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: 'var(--neutral-fg-3)' }}>
              Username: <span style={{ fontWeight: 500, color: 'var(--neutral-fg-1)' }}>{user.username}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {profState === 'saved'  && <span style={{ fontSize: 12, color: 'var(--status-success-fg)' }}>Saved</span>}
              {profState === 'error'  && <span style={{ fontSize: 12, color: 'var(--status-danger-fg)' }}>{profError}</span>}
              <button type="submit" className="btn primary small" disabled={profState === 'saving'}>
                {profState === 'saving' ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Password change */}
      <div className="card stagger" style={{ padding: '14px 16px', '--i': 1 } as React.CSSProperties}>
        <div className="card-head" style={{ marginBottom: 14 }}>
          <div className="card-title">Change password</div>
        </div>

        <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ProfileField label="Current password" value={pw.current_password} onChange={v => setPW('current_password', v)} type="password" placeholder="Current password" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ProfileField label="New password"     value={pw.new_password} onChange={v => setPW('new_password', v)} type="password" placeholder="Min 8 characters" />
            <ProfileField label="Confirm password" value={pw.confirm}      onChange={v => setPW('confirm', v)}      type="password" placeholder="Repeat new password" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            {pwState === 'saved' && <span style={{ fontSize: 12, color: 'var(--status-success-fg)' }}>Password changed</span>}
            {(pwState === 'error' || pwError) && <span style={{ fontSize: 12, color: 'var(--status-danger-fg)' }}>{pwError}</span>}
            <button
              type="submit"
              className="btn secondary small"
              disabled={pwState === 'saving' || !pw.current_password || !pw.new_password || !pw.confirm}
            >
              {pwState === 'saving' ? 'Saving…' : 'Change password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProfileField({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-fg-2)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          height: 32, padding: '0 10px', fontSize: 13,
          border: '1px solid var(--neutral-stroke-1)',
          borderRadius: 'var(--radius-control)',
          background: 'var(--neutral-bg-1)',
          color: 'var(--neutral-fg-1)',
          outline: 'none', width: '100%',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--m365-brand)'; e.target.style.boxShadow = '0 0 0 2px rgba(15,108,189,0.15)' }}
        onBlur={e =>  { e.target.style.borderColor = 'var(--neutral-stroke-1)'; e.target.style.boxShadow = 'none' }}
      />
    </div>
  )
}
