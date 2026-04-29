'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { SuiteHeader }       from '@/components/layout/SuiteHeader'
import { SideNav }           from '@/components/layout/SideNav'
import { WebSocketProvider } from '@/components/providers/WebSocketProvider'

const AUTH_PATHS = ['/login', '/register']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname            = usePathname()
  const isAuth              = AUTH_PATHS.some(p => pathname.startsWith(p))
  const [navOpen, setNavOpen] = useState(false)

  // Close drawer on navigation
  useEffect(() => { setNavOpen(false) }, [pathname])

  if (isAuth) return <>{children}</>

  return (
    <WebSocketProvider>
      <div className="app">
        <SuiteHeader onMenuClick={() => setNavOpen(v => !v)} />
        <div className="main">
          {navOpen && (
            <div className="nav-backdrop" onClick={() => setNavOpen(false)} />
          )}
          <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
          <main className="canvas">
            {children}
          </main>
        </div>
      </div>
    </WebSocketProvider>
  )
}
