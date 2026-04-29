export interface AuthUser {
  username:  string
  email:     string
  firstName: string
  lastName:  string
  role:      string
}

const KEY_TOKEN = 'ketepa_auth_token'
const KEY_USER  = 'ketepa_auth_user'
const COOKIE    = 'ketepa_auth_token'

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(KEY_TOKEN)
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const s = localStorage.getItem(KEY_USER)
    return s ? (JSON.parse(s) as AuthUser) : null
  } catch { return null }
}

export function storeAuth(token: string, user: AuthUser): void {
  localStorage.setItem(KEY_TOKEN, token)
  localStorage.setItem(KEY_USER, JSON.stringify(user))
  document.cookie = `${COOKIE}=${token}; path=/; SameSite=Lax`
}

export function clearAuth(): void {
  localStorage.removeItem(KEY_TOKEN)
  localStorage.removeItem(KEY_USER)
  document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Lax`
}

// ── Remote API calls (proxied through Next.js — no hardcoded backend URL) ────

export interface AuthResponse {
  token:      string
  username:   string
  email:      string
  first_name: string
  last_name:  string
  role:       string
}

export async function apiLogin(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Login failed')
  return data as AuthResponse
}

export async function apiRegister(payload: {
  username: string; password: string; email: string; first_name: string; last_name: string
}): Promise<AuthResponse> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Registration failed')
  return data as AuthResponse
}

export async function apiLogout(token: string): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Token ${token}` },
  }).catch(() => {})
}
