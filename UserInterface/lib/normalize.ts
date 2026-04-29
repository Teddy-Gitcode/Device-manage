import type { Device, DeviceStatus, Recommendation, StockItem, TonerAlert } from './types'
import { getTonerMeta } from './toner'

// ── Raw backend shapes ──────────────────────────────────────────────────────

interface BackendSupplyLevel {
  id: number
  name: string
  category: string
  level_percent: number
  max_capacity: number
  current_level: number
}

interface BackendDailyStat {
  total_pages_printed: number
  pages_printed_today: number
  jam_count: number
  jams_today: number
  uptime_minutes: number
}

interface BackendPrinter {
  id: number
  name: string
  ip_address: string
  mac_address: string
  serial_number: string
  model_name: string
  firmware_version: string
  location: string
  current_status: number   // 2=Sleeping 3=Idle 4=Printing 5=WarmingUp
  device_health: number    // 2=Running 3=Warning 5=Down
  total_page_count: number
  min_supply_percent: number | null
  last_serviced_date: string | null
  cost_per_page_mono: string | null
  cost_per_page_color: string | null
  target_monthly_volume: number | null
  latest_supply_levels: BackendSupplyLevel[]
  consumables: BackendConsumableAlert[]
  today_stats: BackendDailyStat | null
  health_score: number
}

interface BackendConsumable {
  id: number
  name: string
  part_number: string | null
  current_level: number
  max_capacity: number
  level_percent: number
  category: string
  color: string | null
  printer: number
}

interface BackendConsumableAlert {
  category: string
  status:   string   // "OK" | "LOW" | "CRITICAL" | "EMPTY"
  is_low:   boolean
  is_empty: boolean
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function deriveStatus(health: number, _currentStatus: number): DeviceStatus {
  if (health === 5) return 'danger'  // Down → Offline
  if (health === 3) return 'warn'    // Warning
  return 'ok'                        // Running → Online (sleep/idle/printing are all online)
}

function extractToner(supplies: BackendSupplyLevel[]): [number, number, number, number] {
  const toners = supplies.filter(s =>
    s.category === 'Toner' || s.category === 'toner' || s.category === 'TONER'
  )
  if (toners.length === 0) return [0, 0, 0, 0]
  if (toners.length === 1) return [toners[0].level_percent, 0, 0, 0]
  const byChannel: Record<string, number> = {}
  for (const t of toners) {
    const { channel } = getTonerMeta(t.name)
    if (!(channel in byChannel)) byChannel[channel] = t.level_percent
  }
  return [byChannel['K'] ?? 0, byChannel['C'] ?? 0, byChannel['M'] ?? 0, byChannel['Y'] ?? 0]
}

function extractTonerNames(supplies: BackendSupplyLevel[]): [string, string, string, string] {
  const toners = supplies.filter(s =>
    (s.category === 'Toner' || s.category === 'toner' || s.category === 'TONER') &&
    s.name.trim() !== ''
  )
  if (toners.length === 0) return ['', '', '', '']
  if (toners.length === 1) return [toners[0].name, '', '', '']
  const byChannel: Record<string, string> = {}
  for (const t of toners) {
    const { channel } = getTonerMeta(t.name)
    if (!byChannel[channel]) byChannel[channel] = t.name
  }
  return [byChannel['K'] ?? '', byChannel['C'] ?? '', byChannel['M'] ?? '', byChannel['Y'] ?? '']
}

function isMono(supplies: BackendSupplyLevel[]): boolean {
  const toners = supplies.filter(s => s.category === 'Toner' || s.category === 'toner')
  return toners.length <= 1
}

function deriveTonerAlert(consumables: BackendConsumableAlert[], minPct: number | null): TonerAlert {
  const toners = consumables.filter(c => c.category === 'TONER')
  if (toners.some(c => c.is_empty || c.status === 'EMPTY' || c.status === 'CRITICAL')) return 'empty'
  if (toners.some(c => c.is_low) || (minPct !== null && minPct < 20)) return 'low'
  return 'none'
}

function deriveRecommendation(healthScore: number, util: number): Recommendation {
  if (healthScore < 50) return 'service'
  if (util < 20) return 'relocate'
  return 'keep'
}

// ── Public normalizers ───────────────────────────────────────────────────────

export function normalizeDevice(d: BackendPrinter): Device {
  // Use total_pages_printed (cumulative for this daily stat) as the 30d proxy.
  // Falls back to pages_printed_today * 30 only when total is unavailable.
  const todayStat = d.today_stats
  const pages30d = todayStat?.total_pages_printed
    ? todayStat.total_pages_printed
    : (todayStat?.pages_printed_today ?? 0) * 30
  const monthlyVol = d.target_monthly_volume ?? 150_000
  const util = Math.min(100, Math.round((pages30d / monthlyVol) * 100))

  const toner      = extractToner(d.latest_supply_levels)
  const tonerNames = extractTonerNames(d.latest_supply_levels)
  const mono       = isMono(d.latest_supply_levels)

  const paperSupply = d.latest_supply_levels.find(s =>
    s.category === 'Paper' || s.name.toLowerCase().includes('paper')
  )

  return {
    id:             String(d.id),
    name:           d.name,
    location:       d.location ?? '',
    status:         deriveStatus(d.device_health, d.current_status),
    tonerAlert:     deriveTonerAlert(d.consumables ?? [], d.min_supply_percent),
    toner,
    tonerNames,
    paper:          paperSupply?.level_percent ?? 100,
    pages30d,
    utilization:    util,
    recommendation: deriveRecommendation(d.health_score, util),
    ip:             d.ip_address,
    mac:            d.mac_address ?? '—',
    serial:         d.serial_number ?? '—',
    firmware:       d.firmware_version ?? '—',
    uptime:         '—',
    mono,
    lastService:    d.last_serviced_date ?? '—',
    jams30d:        d.today_stats?.jams_today ?? 0,
    costPerPage:    d.cost_per_page_mono ? `KES ${d.cost_per_page_mono}` : '—',
    monthlyDuty:    `${monthlyVol.toLocaleString()} pp/mo`,
    lifetimePages:  d.total_page_count ?? 0,
    jobs30d:        0,
    avgJobSize:     0,
    duplexRate:     0,
    healthScore:    d.health_score ?? 0,
  }
}

export function normalizeDevices(raw: BackendPrinter[]): Device[] {
  return raw.map(normalizeDevice)
}

export function normalizeConsumables(raw: BackendConsumable[]): StockItem[] {
  return raw.map(c => ({
    name:      c.name,
    sku:       c.part_number ?? c.id.toString(),
    qty:       c.current_level,
    cap:       c.max_capacity || 100,
    printerId: String(c.printer),
    category:  c.category,
  }))
}
