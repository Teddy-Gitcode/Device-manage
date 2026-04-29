'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  type AuthUser,
  getStoredToken, getStoredUser, storeAuth, clearAuth,
  apiLogin, apiRegister, apiLogout,
} from '@/lib/auth'

export interface RegisterPayload {
  username:   string
  password:   string
  email:      string
  first_name: string
  last_name:  string
}

interface AuthCtx {
  user:     AuthUser | null
  token:    string | null
  loading:  boolean
  login:    (username: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout:   () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user,    setUser]    = useState<AuthUser | null>(null)
  const [token,   setToken]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = getStoredToken()
    const u = getStoredUser()
    if (t && u) { setToken(t); setUser(u) }
    setLoading(false)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiLogin(username, password)
    const u: AuthUser = {
      username:  data.username,
      email:     data.email,
      firstName: data.first_name ?? '',
      lastName:  data.last_name  ?? '',
      role:      data.role ?? 'viewer',
    }
    storeAuth(data.token, u)
    setToken(data.token)
    setUser(u)
    router.replace('/')
  }, [router])

  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await apiRegister(payload)
    const u: AuthUser = {
      username:  data.username,
      email:     data.email,
      firstName: data.first_name ?? '',
      lastName:  data.last_name  ?? '',
      role:      data.role ?? 'viewer',
    }
    storeAuth(data.token, u)
    setToken(data.token)
    setUser(u)
    router.replace('/')
  }, [router])

  const logout = useCallback(async () => {
    if (token) await apiLogout(token)
    clearAuth()
    setToken(null)
    setUser(null)
    router.replace('/login')
  }, [token, router])

  return (
    <Ctx.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
