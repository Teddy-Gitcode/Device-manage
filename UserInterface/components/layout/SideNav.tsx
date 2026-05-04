'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconDashboard, IconPrinter, IconPackage, IconBarChart, IconAlert,
  IconList, IconReallocate, IconFile, IconUsers, IconSettings,
} from '@/components/ui/Icons'
import { useAuth } from '@/components/providers/AuthProvider'

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',   icon: IconDashboard,  href: '/',             section: 'Monitor' },
  { id: 'devices',      label: 'Devices',      icon: IconPrinter,    href: '/devices',      section: 'Monitor' },
  { id: 'consumables',  label: 'Consumables',  icon: IconPackage,    href: '/consumables',  section: 'Monitor' },
  { id: 'analytics',    label: 'Analytics',    icon: IconBarChart,   href: '/analytics',    section: 'Monitor' },
  { id: 'alerts',       label: 'Alerts',       icon: IconAlert,      href: '/alerts',       section: 'Monitor' },
  { id: 'jobs',         label: 'Print jobs',   icon: IconList,       href: '/jobs',         section: 'Operate' },
  { id: 'realloc',      label: 'Reallocation', icon: IconReallocate, href: '/reallocation', section: 'Operate' },
  { id: 'reports',      label: 'Reports',      icon: IconFile,       href: '/reports',      section: 'Operate' },
  { id: 'users',        label: 'Users',        icon: IconUsers,      href: '/users',        section: 'Admin' },
  { id: 'settings',     label: 'Settings',     icon: IconSettings,   href: '/settings',     section: 'Admin' },
] as const

const SECTIONS = ['Monitor', 'Operate', 'Admin'] as const

interface SideNavProps {
  alertCount?: number
  open?:       boolean
  onClose?:    () => void
}

export function SideNav({ alertCount = 0, open = false, onClose }: SideNavProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className={`sidenav${open ? ' nav-open' : ''}`}>
      <div className="sidenav-inner">
        {SECTIONS.map((section, si) => (
          <div key={section}>
            <div className="nav-section">{section}</div>
            {NAV_ITEMS.filter(item => item.section === section).map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={'nav-item' + (active ? ' active' : '')}
                  title={item.label}
                >
                  <Icon size={14} />
                  <span className="nav-label">{item.label}</span>
                  {item.id === 'alerts' && alertCount > 0 && (
                    <span className="count">{alertCount}</span>
                  )}
                </Link>
              )
            })}
            {si < SECTIONS.length - 1 && <div className="nav-divider" />}
          </div>
        ))}

        <div style={{ flex: 1 }} />

        <div className="nav-user">
          <div className="avatar" style={{ background: '#a4262c' }}>
            {user
              ? (user.firstName && user.lastName
                  ? (user.firstName[0] + user.lastName[0]).toUpperCase()
                  : user.username.slice(0, 2).toUpperCase())
              : '—'}
          </div>
          <div className="nav-user-info">
            <div className="name">
              {user
                ? ([user.firstName, user.lastName].filter(Boolean).join(' ') || user.username)
                : 'Loading…'}
            </div>
            <div className="role" style={{ textTransform: 'capitalize' }}>
              {user?.role ?? 'viewer'}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
