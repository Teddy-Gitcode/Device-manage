'use client'
import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/AuthProvider'

export default function RegisterPage() {
  const { register } = useAuth()
  const [form,  setForm]  = useState({
    first_name: '', last_name: '', username: '', email: '', password: '', confirm: '',
  })
  const [error, setError] = useState('')
  const [busy,  setBusy]  = useState(false)

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setBusy(true)
    try {
      await register({
        username:   form.username.trim(),
        password:   form.password,
        email:      form.email.trim(),
        first_name: form.first_name.trim(),
        last_name:  form.last_name.trim(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = form.username && form.password && form.confirm && !busy

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
        </div>
        <div>
          <div className="auth-brand-name">Print Fleet</div>
          <div className="auth-brand-org">Kenya Tea Packers Ltd</div>
        </div>
      </div>

      <div className="auth-card">
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Request access to the fleet dashboard</p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-row">
            <div className="auth-field">
              <label htmlFor="first_name" className="auth-label">First name</label>
              <input
                id="first_name"
                type="text"
                className="auth-input"
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                disabled={busy}
                autoFocus
                placeholder="First"
              />
            </div>
            <div className="auth-field">
              <label htmlFor="last_name" className="auth-label">Last name</label>
              <input
                id="last_name"
                type="text"
                className="auth-input"
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                disabled={busy}
                placeholder="Last"
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="username" className="auth-label">Username <span className="auth-required">*</span></label>
            <input
              id="username"
              type="text"
              className="auth-input"
              value={form.username}
              onChange={e => set('username', e.target.value)}
              autoComplete="username"
              disabled={busy}
              placeholder="Choose a username"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="email" className="auth-label">Email</label>
            <input
              id="email"
              type="email"
              className="auth-input"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              autoComplete="email"
              disabled={busy}
              placeholder="you@ketepa.co.ke"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">Password <span className="auth-required">*</span></label>
            <input
              id="password"
              type="password"
              className="auth-input"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              autoComplete="new-password"
              disabled={busy}
              placeholder="Min 8 characters"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="confirm" className="auth-label">Confirm password <span className="auth-required">*</span></label>
            <input
              id="confirm"
              type="password"
              className="auth-input"
              value={form.confirm}
              onChange={e => set('confirm', e.target.value)}
              autoComplete="new-password"
              disabled={busy}
              placeholder="Repeat password"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={!canSubmit}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link href="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
