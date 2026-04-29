import type {
  StockItem, ReallocSuggestion, PrintJob, TopUser,
  DeptCost, ServiceTicket, PrintPolicy,
} from './types'

const BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'

function authHeaders(): HeadersInit {
  const token = process.env.API_TOKEN
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Token ${token}` } : {}),
  }
}

// ── Core fetch helpers ───────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders(),
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(5_000),
  })
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json()
}

async function patch<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`)
  return res.json()
}

/** Fetches all pages of a paginated DRF endpoint, returns flat array. */
async function getAll<T>(path: string): Promise<T[]> {
  const sep = path.includes('?') ? '&' : '?'
  let url: string | null = `${BASE}${path}${sep}page_size=100`
  const all: T[] = []
  while (url) {
    const res: Response = await fetch(url, { headers: authHeaders(), next: { revalidate: 0 }, signal: AbortSignal.timeout(5_000) })
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()
    const items: T[] = data.results ?? data
    all.push(...items)
    url = data.next ?? null
  }
  return all
}

// ── SRE signals (nested shape from backend) ──────────────────────────────────

export interface SreSignals {
  traffic:    { pages_per_hour: number }
  errors:     { current_error_rate: number; error_count: number; total_active: number }
  saturation: { low_toner_count: number }
  latency:    { network_latency_avg: number }
}

// ── Real backend endpoints ──────────────────────────────────────────────────

export const api = {
  printers:     ()  => getAll<Record<string, unknown>>('/devices/printers/'),
  printer:      (id: string) => get<Record<string, unknown>>(`/devices/printers/${id}/`),
  consumables:  ()  => getAll<Record<string, unknown>>('/devices/consumables/'),
  logs:         ()  => getAll<Record<string, unknown>>('/devices/logs/'),
  printerLogs:  (id: string) => getAll<Record<string, unknown>>(`/devices/logs/?printer=${id}`),
  dailyStats:   ()  => getAll<Record<string, unknown>>('/devices/daily-stats/'),
  sreSignals:   ()  => get<SreSignals>('/devices/printers/sre-signals/'),

  // ── Mock (no backend endpoint yet) ────────────────────────────────────────
  jobs:       (): Promise<PrintJob[]>          => Promise.resolve(MOCK_JOBS),
  tickets:    (): Promise<ServiceTicket[]>     => Promise.resolve(MOCK_TICKETS),
  policies:   (): Promise<PrintPolicy[]>       => Promise.resolve(MOCK_POLICIES),
  realloc:    (): Promise<ReallocSuggestion[]> => Promise.resolve(MOCK_REALLOC),
  topUsers:   (): Promise<TopUser[]>           => Promise.resolve(MOCK_USERS),
  deptCosts:  (): Promise<DeptCost[]>          => Promise.resolve(MOCK_DEPT_COSTS),

  patchPolicy: (id: string, enabled: boolean) =>
    patch<PolicyResponse>(`/policies/${id}`, { enabled }),
}

interface PolicyResponse { id: string; enabled: boolean }

// ── Mock data for sections without backend endpoints ─────────────────────────

const MOCK_JOBS: PrintJob[] = [
  { id: 'JOB-001', title: 'Q1 Financial Report',      userName: 'A. Njoroge', dept: 'Finance',    deviceId: 'PR-017', pages: 84,  state: 'printing', submittedAt: new Date(Date.now() - 120_000).toISOString() },
  { id: 'JOB-002', title: 'Packaging Labels Batch 7', userName: 'M. Otieno',  dept: 'Production', deviceId: 'PR-009', pages: 500, state: 'queued',   submittedAt: new Date(Date.now() - 300_000).toISOString() },
  { id: 'JOB-003', title: 'Audit Trail Export',        userName: 'S. Kamau',   dept: 'Compliance', deviceId: 'PR-004', pages: 212, state: 'held',     submittedAt: new Date(Date.now() - 600_000).toISOString() },
]

const MOCK_TICKETS: ServiceTicket[] = [
  { id: 'TKT-2341', title: 'Roller assembly worn — frequent jams', device: 'PR-004 · Mombasa Export',  priority: 'high',   status: 'open',       age: '2h ago',  assignee: 'J. Kariuki' },
  { id: 'TKT-2339', title: 'Drum unit replacement due',            device: 'PR-009 · Kericho Plant',   priority: 'medium', status: 'scheduled',  age: '1d ago',  assignee: 'P. Wanjiku' },
  { id: 'TKT-2337', title: 'Firmware update pending v3.12',        device: 'PR-021 · Kericho Floor',   priority: 'low',    status: 'inprogress', age: '3d ago',  assignee: 'J. Kariuki' },
]

const MOCK_POLICIES: PrintPolicy[] = [
  { id: 'POL-001', name: 'Duplex by default',   desc: 'Force double-sided on all jobs over 4 pages',                enabled: true  },
  { id: 'POL-002', name: 'Colour lock',          desc: 'Restrict colour printing to Finance and Marketing',         enabled: true  },
  { id: 'POL-003', name: 'After-hours quota',    desc: 'Cap personal print jobs to 20 pp after 6 PM',              enabled: false },
  { id: 'POL-004', name: 'Toner save mode',      desc: 'Reduce toner density for internal documents',              enabled: false },
]

const MOCK_REALLOC: ReallocSuggestion[] = [
  { from: { name: 'PR-006', location: 'HQ · IT Lab',        utilLabel: '8% util'  }, to: { name: 'PR-003', location: 'HQ · Canteen',        utilLabel: '94% util' }, reason: 'PR-006 averaged 8% utilization over 30 days while PR-003 is over duty cycle.' },
  { from: { name: 'PR-018', location: 'Kericho · Admin',    utilLabel: '12% util' }, to: { name: 'PR-009', location: 'Kericho · Production', utilLabel: '91% util' }, reason: 'Production floor has exceeded monthly page budget 3 months running.' },
]

const MOCK_USERS: TopUser[] = [
  { name: 'A. Njoroge', dept: 'Finance',    initials: 'AN', color: '#0f6cbd', pages: 3_420, cost: 8_208, quota: 3_000 },
  { name: 'M. Otieno',  dept: 'Production', initials: 'MO', color: '#107c10', pages: 2_980, cost: 4_470, quota: 4_000 },
  { name: 'S. Kamau',   dept: 'Compliance', initials: 'SK', color: '#835c00', pages: 2_104, cost: 5_260, quota: 2_500 },
  { name: 'C. Waweru',  dept: 'Marketing',  initials: 'CW', color: '#a4262c', pages: 1_876, cost: 9_380, quota: 2_000 },
]

const MOCK_DEPT_COSTS: DeptCost[] = [
  { dept: 'Finance',    color: 18_400, mono: 6_200  },
  { dept: 'Production', color: 4_100,  mono: 21_800 },
  { dept: 'Marketing',  color: 22_600, mono: 3_400  },
  { dept: 'Compliance', color: 2_800,  mono: 9_100  },
]
