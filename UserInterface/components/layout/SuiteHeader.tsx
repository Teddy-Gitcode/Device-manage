'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  IconWaffle, IconPrinter, IconSearch, IconBell,
  IconSettings, IconAlertCircle, IconAlert, IconCheckCircle,
  IconInfo, IconChevronRight, IconX, IconMenu,
} from '@/components/ui/Icons'
import { usePrinterEventsCtx } from '@/components/providers/WebSocketProvider'
import { useAuth } from '@/components/providers/AuthProvider'
import type { SearchResult } from '@/app/api/search/route'
import type { EventLevel } from '@/lib/types'

// ── Level icons (same as AlertFeed) ──────────────────────────────────────────
const LEVEL_ICON: Record<EventLevel, React.ElementType> = {
  ok:       IconCheckCircle,
  warning:  IconAlert,
  critical: IconAlertCircle,
  info:     IconInfo,
}
const LEVEL_COLOR: Record<EventLevel, string> = {
  ok:       'var(--status-success-fg)',
  warning:  'var(--status-warning-fg)',
  critical: 'var(--status-danger-fg)',
  info:     'var(--m365-brand)',
}

function userInitials(first?: string, last?: string, username?: string): string {
  if (first && last) return (first[0] + last[0]).toUpperCase()
  if (first) return first.slice(0, 2).toUpperCase()
  if (username) return username.slice(0, 2).toUpperCase()
  return '??'
}

function relTime(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60)  return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

// ── SuiteHeader ───────────────────────────────────────────────────────────────

export function SuiteHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter()
  const { events, connected } = usePrinterEventsCtx()
  const { user, logout } = useAuth()

  // — Search —
  const [searchOpen, setSearchOpen]   = useState(false)
  const [query, setQuery]             = useState('')
  const [results, setResults]         = useState<SearchResult[]>([])
  const [searching, setSearching]     = useState(false)
  const searchWrap = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  // — Notifications —
  const [notifOpen, setNotifOpen]     = useState(false)
  const [seenCount, setSeenCount]     = useState(0)
  const notifWrap = useRef<HTMLDivElement>(null)

  // — User menu —
  const [userOpen, setUserOpen]       = useState(false)
  const userWrap = useRef<HTMLDivElement>(null)

  // Unread = critical/warning events received since bell was last opened
  const alertEvents = events.filter(e => e.level === 'critical' || e.level === 'warning')
  const unread = Math.max(0, alertEvents.length - seenCount)

  // ── Ctrl+K shortcut ────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => inputRef.current?.focus(), 40)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false); setQuery(''); setNotifOpen(false); setUserOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Click-outside close all dropdowns ──────────────────────────────────────
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (searchWrap.current && !searchWrap.current.contains(e.target as Node)) {
        setSearchOpen(false); setQuery('')
      }
      if (notifWrap.current && !notifWrap.current.contains(e.target as Node)) setNotifOpen(false)
      if (userWrap.current  && !userWrap.current.contains(e.target as Node))  setUserOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // ── Debounced search ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        setResults(await res.json())
      } catch { setResults([]) }
      finally  { setSearching(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  function openSearch() {
    setSearchOpen(true)
    setTimeout(() => inputRef.current?.focus(), 40)
  }

  function toggleNotif() {
    const next = !notifOpen
    setNotifOpen(next)
    if (next) setSeenCount(alertEvents.length)
  }

  function healthColor(h: number) {
    if (h === 5) return 'var(--status-danger-fg)'
    if (h === 3) return 'var(--status-warning-fg)'
    return 'var(--status-success-fg)'
  }

  return (
    <header className="suite-header">

      {/* Hamburger — mobile only */}
      <button className="menu-btn icon-btn" onClick={onMenuClick} aria-label="Open menu">
        <IconMenu size={18} />
      </button>

      {/* Waffle — home link */}
      <Link href="/" style={{ color: 'rgba(255,255,255,.9)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <IconWaffle size={18} />
      </Link>

      {/* App name */}
      <div className="lockup" style={{ flexShrink: 0 }}>
        <IconPrinter size={16} />
        Print Fleet
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="search header-search" ref={searchWrap} style={{ position: 'relative', cursor: searchOpen ? 'text' : 'pointer' }} onClick={openSearch}>
        <IconSearch size={14} style={{ flexShrink: 0 }} />

        {searchOpen ? (
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && query.trim()) {
                router.push(`/devices?q=${encodeURIComponent(query.trim())}`)
                setSearchOpen(false); setQuery('')
              }
            }}
            placeholder="Search devices… (⌃K)"
            style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 12, flex: 1, minWidth: 0 }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span style={{ flex: 1 }}>Search devices, jobs, users</span>
        )}

        {searchOpen && query && (
          <button
            onClick={e => { e.stopPropagation(); setQuery('') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.7)', display: 'flex', padding: 0 }}
          >
            <IconX size={12} />
          </button>
        )}

        {/* Results dropdown */}
        {searchOpen && (query || searching) && (
          <div className="header-dropdown" style={{ left: 0, right: 'auto', minWidth: '100%' }}>
            {searching && (
              <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--neutral-fg-3)' }}>Searching…</div>
            )}
            {!searching && results.length === 0 && (
              <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--neutral-fg-3)' }}>
                No devices match <strong>{query}</strong>
              </div>
            )}
            {results.map(r => (
              <Link
                key={r.id}
                href={`/devices/${r.id}`}
                className="search-result"
                onClick={() => { setSearchOpen(false); setQuery('') }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor(r.health), flexShrink: 0, display: 'inline-block' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)' }}>{r.location} · {r.ip}</div>
                </div>
                <IconChevronRight size={13} style={{ color: 'var(--neutral-fg-3)', flexShrink: 0 }} />
              </Link>
            ))}
            {!searching && results.length > 0 && (
              <Link
                href={`/devices?q=${encodeURIComponent(query)}`}
                className="search-result"
                style={{ justifyContent: 'center', color: 'var(--m365-brand)', fontWeight: 500, fontSize: 12 }}
                onClick={() => { setSearchOpen(false); setQuery('') }}
              >
                See all results for &ldquo;{query}&rdquo;
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Right section ──────────────────────────────────────────────────── */}
      <div className="right">

        {/* Live indicator */}
        <span className="header-live" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,.85)', flexShrink: 0 }}>
          <span className={connected ? 'live-dot' : 'conn-dot warn'} />
          {connected ? 'Live' : 'Offline'}
        </span>

        {/* ── Notifications ─────────────────────────────────────────────────── */}
        <div ref={notifWrap} style={{ position: 'relative' }}>
          <button className="icon-btn" onClick={toggleNotif} aria-label="Notifications">
            <IconBell size={16} />
            {unread > 0 && (
              <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
            )}
          </button>

          {notifOpen && (
            <div className="header-dropdown" style={{ minWidth: 320 }}>
              <div className="header-dropdown-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Notifications</span>
                <Link href="/alerts" style={{ fontSize: 11, color: 'var(--m365-brand)', textDecoration: 'none', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }} onClick={() => setNotifOpen(false)}>
                  View all
                </Link>
              </div>

              {events.length === 0 ? (
                <div style={{ padding: '16px 14px', fontSize: 13, color: 'var(--neutral-fg-3)', textAlign: 'center' }}>
                  No recent events
                </div>
              ) : (
                events.slice(0, 5).map(e => {
                  const Icon = LEVEL_ICON[e.level] ?? IconInfo
                  return (
                    <Link
                      key={e.id}
                      href={`/devices/${e.deviceId}`}
                      className="header-dropdown-item"
                      style={{ gap: 10, alignItems: 'flex-start', textDecoration: 'none' }}
                      onClick={() => setNotifOpen(false)}
                    >
                      <Icon size={14} style={{ color: LEVEL_COLOR[e.level], flexShrink: 0, marginTop: 1 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{e.message}</div>
                        <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginTop: 2 }}>
                          {e.deviceName} · {relTime(e.timestamp)}
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Settings — hidden on mobile */}
        <Link href="/settings" className="icon-btn header-settings" aria-label="Settings">
          <IconSettings size={16} />
        </Link>

        {/* ── User menu ─────────────────────────────────────────────────────── */}
        <div ref={userWrap} style={{ position: 'relative' }}>
          <div
            className="avatar"
            onClick={() => setUserOpen(v => !v)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
            title="Account menu"
          >
            {userInitials(user?.firstName, user?.lastName, user?.username)}
          </div>

          {userOpen && (
            <div className="header-dropdown" style={{ minWidth: 220 }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--neutral-stroke-divider)' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username : '—'}
                </div>
                {user?.email && (
                  <div style={{ fontSize: 11, color: 'var(--neutral-fg-3)', marginTop: 2 }}>{user.email}</div>
                )}
                {user?.role && (
                  <div style={{ marginTop: 6 }}>
                    <span className="chip keep" style={{ fontSize: 10, textTransform: 'capitalize' }}>{user.role}</span>
                  </div>
                )}
              </div>

              <Link href="/settings" className="header-dropdown-item" onClick={() => setUserOpen(false)}>
                <IconSettings size={14} style={{ color: 'var(--neutral-fg-3)' }} />
                Settings
              </Link>

              <button
                className="header-dropdown-item"
                style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', color: 'var(--status-danger-fg)', fontWeight: 500 }}
                onClick={() => { setUserOpen(false); logout() }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  )
}
