'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { SuiteHeader }       from '@/components/layout/SuiteHeader'
import { SideNav }           from '@/components/layout/SideNav'
import { WebSocketProvider } from '@/components/providers/WebSocketProvider'

const AUTH_PATHS = ['/login', '/register']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuth   = AUTH_PATHS.some(p => pathname.startsWith(p))

  // Open by default on desktop, closed on mobile
  const [navOpen, setNavOpen] = useState(true)

  useEffect(() => {
    if (window.innerWidth < 768) setNavOpen(false)
  }, [])

  // On mobile: close drawer after navigation; on desktop: leave as-is
  useEffect(() => {
    if (window.innerWidth < 768) setNavOpen(false)
  }, [pathname])

  if (isAuth) return <>{children}</>

  return (
    <WebSocketProvider>
      <div className="app">
        <SuiteHeader onMenuClick={() => setNavOpen(v => !v)} />
        <div className={`main${navOpen ? '' : ' nav-closed'}`}>
          {/* Always in DOM as position:fixed — no conditional rendering avoids hydration mismatch */}
          <div
            className={`nav-backdrop${navOpen ? ' nav-backdrop-open' : ''}`}
            onClick={() => setNavOpen(false)}
          />
          <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
          <main className="canvas">
            {children}
          </main>
        </div>
      </div>
    </WebSocketProvider>
  )
}
