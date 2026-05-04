import type { DeviceStatus, Device } from './types'

export function normalizeStatus(raw: string): DeviceStatus {
  if (['online', 'ok', 'ready', 'idle'].includes(raw))    return 'ok'
  if (['warning', 'warn', 'low'].includes(raw))            return 'warn'
  if (['error', 'offline', 'jam', 'down'].includes(raw))   return 'danger'
  if (['sleep', 'standby', 'sleeping'].includes(raw))      return 'neutral'
  return 'neutral'
}

export function levelToClass(level: string): string {
  const map: Record<string, string> = { critical: 'danger', warning: 'warn', info: 'info', ok: 'ok' }
  return map[level] ?? 'info'
}

export function stockClass(qty: number, cap: number): string {
  const pct = qty / cap
  if (pct < 0.20) return 'crit'
  if (pct < 0.40) return 'low'
  return ''
}

export function quotaClass(pages: number, quota: number): string {
  const pct = pages / quota
  if (pct > 1.0) return 'over'
  if (pct > 0.8) return 'warn'
  return ''
}

export function utilClass(pct: number): string {
  if (pct > 85) return 'over'
  if (pct < 20) return 'under'
  return ''
}

export function utilColor(pct: number): string {
  if (pct > 85) return 'var(--status-danger-fg)'
  if (pct < 20) return 'var(--neutral-fg-disabled)'
  return 'var(--m365-brand)'
}

export function tonerColor(letter: 'k' | 'c' | 'm' | 'y' | 'p'): string {
  return `var(--toner-${letter})`
}

export function tonerDangerClass(pct: number): string {
  if (pct < 10) return 'var(--status-danger-fg)'
  if (pct < 20) return 'var(--status-warning-fg)'
  return ''
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diffMs / 1000)
  if (s < 60)   return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)   return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)   return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function deriveKpis(devices: Device[]) {
  const total      = devices.length
  const online     = devices.filter(d => d.status !== 'danger').length
  const offline    = devices.filter(d => d.status === 'danger').length
  const withAlerts = devices.filter(d =>
    d.activeAlerts.some(a => !a.toLowerCase().includes('sleep')),
  ).length
  const lowToner   = devices.filter(d => d.tonerAlert !== 'none').length
  const pagesToday = devices.reduce((s, d) => s + d.pagesToday, 0)
  // kept for any existing consumers
  const active  = online
  const pages   = devices.reduce((s, d) => s + d.pages30d, 0)
  const avgUtil = total > 0 ? Math.round(devices.reduce((s, d) => s + d.utilization, 0) / total) : 0
  const alerts  = withAlerts
  return { active, total, pages, avgUtil, alerts, online, offline, withAlerts, lowToner, pagesToday }
}
