# DESIGN.md — Ketepa Print Fleet Manager
> **Frontend agent specification.** Read this entire document before writing a single line of code.
> This is a real-time, Dockerized print fleet monitoring system. Architecture decisions here are final.

---

## 1. What This System Is

**Product:** Print Fleet Management System for Ketepa (Kenya Tea Packers Ltd)
**Purpose:** Monitor 29+ networked printers across 6 locations in real time — paper jams, open covers, toner levels, print jobs, consumable stock, costs, and device reallocation.

**The critical requirement:** Paper jams and open printer covers are instantaneous hardware events. They must appear in the UI the **moment the SNMP poller detects them** — not on the next poll cycle, not on page refresh. This drives every architectural decision below.

**Backend:** Already built. Runs in Docker. Exposes REST + WebSocket. **Do not touch backend code under any circumstance.**

---

## 2. Tech Stack

```
Frontend:   Next.js 14 (App Router)
Language:   TypeScript
Styling:    Tailwind CSS + CSS variables (Fluent 2 tokens)
Real-time:  Native WebSocket API (no Socket.io)
State:      React useState / useReducer (no Redux, no Zustand)
HTTP:       Native fetch() (no axios, no react-query)
Deploy:     Docker container (Node 20 Alpine)
```

**No additional libraries unless explicitly listed above.** Do not install or suggest installing any state management library, HTTP client, or UI component library.

---

## 3. Docker Architecture

```
docker-compose.yml
├── backend (existing — do not modify)
│   ├── REST API    → http://backend:8000/api
│   └── WebSocket   → ws://backend:8000/ws/events
│
└── frontend (Next.js)
    ├── Port 3000
    ├── Reads NEXT_PUBLIC_API_URL from env
    └── Reads NEXT_PUBLIC_WS_URL from env
```

**docker-compose.yml for frontend service:**
```yaml
frontend:
  build: ./frontend
  ports:
    - "3000:3000"
  environment:
    - NEXT_PUBLIC_API_URL=http://backend:8000/api
    - NEXT_PUBLIC_WS_URL=ws://backend:8000/ws/events
  depends_on:
    - backend
  networks:
    - fleet-net
```

**Dockerfile (frontend):**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Environment variables — always read from `process.env`:**
```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL   // 'http://backend:8000/api'
const WS_URL   = process.env.NEXT_PUBLIC_WS_URL    // 'ws://backend:8000/ws/events'
```

Never hardcode URLs. Never use `localhost` in production code.

---

## 4. Project Structure

```
frontend/
├── app/
│   ├── layout.tsx              ← RootLayout: SuiteHeader + Nav (Server Component)
│   ├── page.tsx                ← Dashboard shell (Server Component)
│   ├── globals.css             ← Fluent 2 CSS variables + Tailwind base
│   │
│   └── api/                   ← Next.js API routes (proxy layer for CORS/auth)
│       ├── devices/route.ts
│       ├── jobs/route.ts
│       └── alerts/route.ts
│
├── components/
│   ├── layout/
│   │   ├── SuiteHeader.tsx     ← Server Component
│   │   └── SideNav.tsx         ← Server Component
│   │
│   ├── dashboard/
│   │   ├── KpiTiles.tsx        ← Server Component (fetches on render)
│   │   ├── DeviceTable.tsx     ← Server Component (initial data)
│   │   ├── DeviceRow.tsx       ← Client Component (real-time status updates)
│   │   ├── AlertFeed.tsx       ← Client Component ← WebSocket
│   │   ├── ActiveJobsQueue.tsx ← Client Component ← WebSocket
│   │   ├── HeatMap.tsx         ← Server Component
│   │   ├── StockInventory.tsx  ← Server Component
│   │   ├── CostByDept.tsx      ← Server Component
│   │   ├── EnvImpact.tsx       ← Server Component
│   │   ├── ServiceTickets.tsx  ← Server Component
│   │   ├── PrintPolicies.tsx   ← Client Component (toggles)
│   │   ├── ReallocCards.tsx    ← Server Component
│   │   └── TopUsers.tsx        ← Server Component
│   │
│   └── detail/
│       ├── DeviceDetailPanel.tsx   ← Client Component (slide-in panel)
│       ├── OverviewTab.tsx
│       ├── ConsumablesTab.tsx
│       ├── ActivityTab.tsx
│       └── SpecsTab.tsx
│
├── hooks/
│   ├── usePrinterEvents.ts     ← WebSocket connection + reconnect logic
│   ├── useDeviceStatus.ts      ← Real-time device status map
│   └── useActiveJobs.ts        ← Real-time job queue
│
├── lib/
│   ├── api.ts                  ← fetch wrappers for all REST endpoints
│   └── types.ts                ← TypeScript interfaces for all data shapes
│
└── public/
    └── (static assets)
```

**The rule:** If a component subscribes to WebSocket or uses `useState`/`useEffect`, it must have `'use client'` at the top. Everything else is a Server Component by default.

---

## 5. Design System — Microsoft 365 / Fluent 2 Light Theme

This UI must look and feel **identical to a Microsoft 365 application** — specifically Outlook, Teams Admin Center, and Microsoft 365 Admin Center. Every visual decision follows Fluent 2 conventions.

### 5.1 Font

```css
font-family: 'Segoe UI', 'Segoe UI Web (West European)', -apple-system,
             BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif;
```

- **One font stack only.** No Google Fonts. No custom fonts. No monospace for UI text.
- Font weights: `400` body · `500` label · `600` heading and numeric values
- Do not introduce any other font under any circumstance.

### 5.2 CSS Variables (define in `globals.css`)

```css
:root {
  /* Brand */
  --m365-brand:          #0f6cbd;
  --m365-brand-hover:    #115ea3;
  --m365-brand-pressed:  #0c3b5e;
  --m365-brand-tint-10:  #ebf3fc;
  --m365-brand-tint-20:  #d0e2f5;
  --m365-brand-tint-40:  #9ec7ee;

  /* Neutral backgrounds */
  --neutral-bg-1:        #ffffff;   /* card surfaces */
  --neutral-bg-2:        #fafafa;   /* nav, table header, command bar */
  --neutral-bg-3:        #f5f5f5;   /* hover states, empty tracks */
  --neutral-bg-canvas:   #faf9f8;   /* page background */

  /* Neutral strokes */
  --neutral-stroke-1:    #d1d1d1;   /* button borders */
  --neutral-stroke-2:    #e0e0e0;   /* card borders */
  --neutral-stroke-divider: #f0f0f0; /* row dividers */

  /* Neutral foregrounds */
  --neutral-fg-1:        #242424;   /* primary text */
  --neutral-fg-2:        #424242;   /* secondary text */
  --neutral-fg-3:        #616161;   /* tertiary / labels */
  --neutral-fg-hint:     #8a8886;   /* placeholder */
  --neutral-fg-disabled: #bdbdbd;

  /* Status — Success */
  --status-success-bg:     #dff6dd;
  --status-success-fg:     #107c10;
  --status-success-border: #9fd89f;

  /* Status — Warning */
  --status-warning-bg:     #fff4ce;
  --status-warning-fg:     #835c00;
  --status-warning-border: #fdcfb4;

  /* Status — Danger */
  --status-danger-bg:      #fde7e9;
  --status-danger-fg:      #a4262c;
  --status-danger-border:  #f1bbbc;

  /* Status — Info */
  --status-info-bg:        #ebf3fc;
  --status-info-fg:        #0f6cbd;
  --status-info-border:    #9ec7ee;

  /* Shadows (Fluent depth) */
  --shadow-2:  0 1px 2px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12);
  --shadow-4:  0 2px 4px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12);
  --shadow-8:  0 4px 8px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12);
  --shadow-16: 0 8px 16px rgba(0,0,0,0.14), 0 0 2px rgba(0,0,0,0.12);
}
```

**Do not add new CSS variables. Do not change existing values.**

### 5.3 Tailwind Config

Map Tailwind colors to the CSS variables so classes like `bg-brand`, `text-danger-fg`, `border-stroke-2` work:

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brand:    'var(--m365-brand)',
        canvas:   'var(--neutral-bg-canvas)',
        surface:  'var(--neutral-bg-1)',
        'fg-1':   'var(--neutral-fg-1)',
        'fg-2':   'var(--neutral-fg-2)',
        'fg-3':   'var(--neutral-fg-3)',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Segoe UI Web (West European)', '-apple-system',
               'BlinkMacSystemFont', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      },
      borderRadius: {
        card:    '8px',
        control: '4px',
      },
      boxShadow: {
        '2':  'var(--shadow-2)',
        '4':  'var(--shadow-4)',
        '16': 'var(--shadow-16)',
      }
    }
  }
}
```

---

## 6. Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  SUITE HEADER  48px  sticky  bg:#0f6cbd                         │
│  [⊞ waffle] [🖨 Print Fleet]  [  search  ]  [🔔][⚙][TM avatar] │
├─────────────────┬───────────────────────────────────────────────┤
│                 │  MAIN  padding:24px 32px  overflow-y:auto      │
│  SIDE NAV       │                                               │
│  width:240px    │  breadcrumb                                   │
│  bg:#fafafa     │  page title + action buttons                  │
│  sticky         │                                               │
│  border-right   │  KPI TILES ── 4 columns ──────────────────    │
│                 │                                               │
│  • Dashboard ◄  │  ┌──────────────────────┬──────────────────┐  │
│  • Devices      │  │   LEFT col  (1.7fr)  │  RIGHT col  (1fr)│  │
│  • Consumables  │  │   DeviceTable        │  AlertFeed  🔴   │  │
│  • Analytics    │  │   HeatMap            │  StockInventory  │  │
│  • Alerts 🔴    │  │   ReallocCards       │                  │  │
│  ─────────────  │  └──────────────────────┴──────────────────┘  │
│  • Print jobs   │                                               │
│  • Reallocation │  ┌──────────────────────┬──────────────────┐  │
│  • Reports      │  │   ActiveJobsQueue 🔴 │  CostByDept      │  │
│  ─────────────  │  │   TopUsers           │  EnvImpact       │  │
│  • Users        │  └──────────────────────┴──────────────────┘  │
│  • Settings     │                                               │
│                 │  ┌──────────────────────┬──────────────────┐  │
│  [TM] T.Mwangi  │  │   ServiceTickets     │  PrintPolicies   │  │
│                 │  └──────────────────────┴──────────────────┘  │
└─────────────────┴───────────────────────────────────────────────┘
                                   ↑
                  DEVICE DETAIL PANEL slides in from right (480px)
                  triggered by clicking any DeviceRow
```

🔴 = Client Component, subscribes to WebSocket, updates in real time

---

## 7. Real-Time Architecture — WebSocket

### 7.1 The WebSocket Hook

Build this first. Get it right before touching any component.

```ts
// hooks/usePrinterEvents.ts
'use client'
import { useEffect, useRef, useCallback, useReducer } from 'react'

export type EventLevel = 'critical' | 'warning' | 'info' | 'ok'

export interface PrinterEvent {
  id:         string
  deviceId:   string        // e.g. 'PR-004'
  deviceName: string
  type:       'jam' | 'cover_open' | 'toner_low' | 'paper_empty' |
              'job_complete' | 'job_held' | 'offline' | 'online' | 'info'
  level:      EventLevel
  message:    string
  timestamp:  string        // ISO 8601
}

interface State {
  events:    PrinterEvent[]
  connected: boolean
}

type Action =
  | { type: 'EVENT';        payload: PrinterEvent }
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'EVENT':
      return { ...state, events: [action.payload, ...state.events].slice(0, 100) }
    case 'CONNECTED':
      return { ...state, connected: true }
    case 'DISCONNECTED':
      return { ...state, connected: false }
  }
}

export function usePrinterEvents() {
  const [state, dispatch] = useReducer(reducer, { events: [], connected: false })
  const ws = useRef<WebSocket | null>(null)
  const retryDelay = useRef(1000)

  const connect = useCallback(() => {
    ws.current = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!)

    ws.current.onopen = () => {
      dispatch({ type: 'CONNECTED' })
      retryDelay.current = 1000           // reset backoff on success
    }

    ws.current.onmessage = (msg) => {
      try {
        const event: PrinterEvent = JSON.parse(msg.data)
        dispatch({ type: 'EVENT', payload: event })
      } catch {
        console.warn('WS parse error:', msg.data)
      }
    }

    ws.current.onclose = () => {
      dispatch({ type: 'DISCONNECTED' })
      // exponential backoff: 1s → 2s → 4s → 8s → cap 30s
      setTimeout(connect, Math.min(retryDelay.current, 30_000))
      retryDelay.current *= 2
    }

    ws.current.onerror = () => ws.current?.close()
  }, [])

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [connect])

  return state  // { events: PrinterEvent[], connected: boolean }
}
```

### 7.2 Device Status from WebSocket

```ts
// hooks/useDeviceStatus.ts
'use client'
import { useMemo } from 'react'
import { usePrinterEvents } from './usePrinterEvents'
import type { DeviceStatus } from '@/lib/types'

export function useDeviceStatus(): Map<string, DeviceStatus> {
  const { events } = usePrinterEvents()

  return useMemo(() => {
    const map = new Map<string, DeviceStatus>()
    for (const e of events) {
      if (map.has(e.deviceId)) continue   // keep newest status per device
      if (['jam', 'cover_open', 'offline'].includes(e.type))       map.set(e.deviceId, 'danger')
      else if (['toner_low', 'paper_empty'].includes(e.type))      map.set(e.deviceId, 'warn')
      else if (e.type === 'online')                                 map.set(e.deviceId, 'ok')
    }
    return map
  }, [events])
}
```

### 7.3 WebSocket Event Type → UI Mapping

| `type` | `level` | AlertFeed display | DeviceRow badge |
|---|---|---|---|
| `jam` | `critical` | 🔴 "Paper jam detected" | → `danger` |
| `cover_open` | `critical` | 🔴 "Cover open" | → `danger` |
| `offline` | `critical` | 🔴 "Device offline" | → `danger` |
| `toner_low` | `warning` | 🟡 "Toner low (X%)" | → `warn` |
| `paper_empty` | `warning` | 🟡 "Paper tray empty" | → `warn` |
| `job_held` | `warning` | 🟡 "Job held for release" | — |
| `job_complete` | `ok` | 🟢 "Job completed" | — |
| `online` | `ok` | 🟢 "Device back online" | → `ok` |
| `info` | `info` | 🔵 informational message | — |

---

## 8. TypeScript Interfaces

All types live in `lib/types.ts`. No `any`. No untyped API responses.

```ts
// lib/types.ts

export type DeviceStatus    = 'ok' | 'warn' | 'danger' | 'neutral'
export type Recommendation  = 'keep' | 'relocate' | 'service'
export type JobState        = 'printing' | 'held' | 'queued'
export type TicketPriority  = 'high' | 'medium' | 'low'
export type TicketStatus    = 'open' | 'inprogress' | 'scheduled'
export type EventLevel      = 'critical' | 'warning' | 'info' | 'ok'

export interface Device {
  id:             string      // 'PR-001'
  name:           string      // 'HP LaserJet M506'
  location:       string      // 'HQ · Floor 3 · Finance'
  status:         DeviceStatus
  toner:          [number, number, number, number]  // [K%, C%, M%, Y%] — 0 if N/A
  paper:          number      // tray level %
  pages30d:       number      // pages printed last 30 days
  utilization:    number      // % of monthly duty cycle used
  recommendation: Recommendation
  // detail panel
  ip:             string
  mac:            string
  serial:         string
  firmware:       string
  uptime:         string      // '34 days'
  mono:           boolean     // monochrome-only device
  lastService:    string      // ISO date
  jams30d:        number
  costPerPage:    string      // 'KES 2.40'
  monthlyDuty:    string      // '150,000 pp/mo'
  lifetimePages:  number
  jobs30d:        number
  avgJobSize:     number
  duplexRate:     number      // %
}

export interface PrinterEvent {
  id:         string
  deviceId:   string
  deviceName: string
  type:       string
  level:      EventLevel
  message:    string
  timestamp:  string          // ISO 8601
}

export interface StockItem {
  name:  string
  sku:   string
  qty:   number
  cap:   number               // reorder threshold reference
}

export interface ReallocSuggestion {
  from:   { name: string; location: string; utilLabel: string }
  to:     { name: string; location: string; utilLabel: string }
  reason: string
}

export interface PrintJob {
  id:          string
  title:       string
  userName:    string
  dept:        string
  deviceId:    string
  pages:       number
  state:       JobState
  submittedAt: string         // ISO timestamp
}

export interface TopUser {
  name:     string
  dept:     string
  initials: string
  color:    string            // hex for avatar background
  pages:    number
  cost:     number            // KES
  quota:    number            // monthly page limit
}

export interface DeptCost {
  dept:  string
  color: number               // KES — color print cost
  mono:  number               // KES — mono print cost
}

export interface ServiceTicket {
  id:       string            // 'TKT-2341'
  title:    string
  device:   string            // 'PR-004 · Mombasa Export'
  priority: TicketPriority
  status:   TicketStatus
  age:      string            // '2h ago'
  assignee: string
}

export interface PrintPolicy {
  id:      string
  name:    string
  desc:    string
  enabled: boolean
}

export interface MetricHistory {
  dates:  string[]            // 7 ISO dates, oldest → newest
  values: number[]            // matching values
}
```

---

## 9. REST API Layer

```ts
// lib/api.ts
import type {
  Device, PrinterEvent, StockItem, ReallocSuggestion,
  PrintJob, TopUser, DeptCost, ServiceTicket, PrintPolicy, MetricHistory
} from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 0 },   // always fresh for live dashboard
  })
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json()
}

async function patch<T>(path: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`)
  return res.json()
}

export const api = {
  devices:      ()          => get<Device[]>('/devices'),
  device:       (id:string) => get<Device>(`/devices/${id}`),
  deviceEvents: (id:string) => get<PrinterEvent[]>(`/devices/${id}/events`),
  deviceHistory:(id:string) => get<MetricHistory>(`/devices/${id}/history`),
  alerts:       ()          => get<PrinterEvent[]>('/alerts'),
  stock:        ()          => get<StockItem[]>('/consumables/stock'),
  realloc:      ()          => get<ReallocSuggestion[]>('/reallocation'),
  jobs:         ()          => get<PrintJob[]>('/jobs'),
  users:        ()          => get<TopUser[]>('/users/top'),
  costs:        ()          => get<DeptCost[]>('/costs/by-department'),
  tickets:      ()          => get<ServiceTicket[]>('/tickets'),
  policies:     ()          => get<PrintPolicy[]>('/policies'),
  patchPolicy:  (id:string, enabled:boolean) =>
                              patch(`/policies/${id}`, { enabled }),
  metrics:      ()          => get<Record<string, MetricHistory>>('/metrics/history'),
}
```

---

## 10. Component Specifications

### 10.1 Server Components

Call `api.*` directly in the component body. No hooks. No `useEffect`.

```ts
// Pattern for all Server Components
import { api } from '@/lib/api'

export default async function DeviceTable() {
  const devices = await api.devices()
  return (
    <section className="card">
      {/* render */}
    </section>
  )
}
```

| Component | API call | What it renders |
|---|---|---|
| `KpiTiles` | `api.devices()` + `api.metrics()` | 4 KPI cards with sparklines |
| `DeviceTable` | `api.devices()` | Table shell + initial `DeviceRow` list |
| `HeatMap` | `api.metrics()` | 7×24 print activity grid |
| `StockInventory` | `api.stock()` | Consumable levels with threshold bars |
| `ReallocCards` | `api.realloc()` | Approve/dismiss suggestion cards |
| `CostByDept` | `api.costs()` | Stacked horizontal bars by department |
| `EnvImpact` | `api.metrics()` | 4 sustainability tiles |
| `ServiceTickets` | `api.tickets()` | Priority-coded open tickets |
| `TopUsers` | `api.users()` | Users ranked by volume + quota bars |

### 10.2 Client Components

Must have `'use client'` as the very first line, before any imports.

| Component | Hook | Triggers re-render when |
|---|---|---|
| `AlertFeed` | `usePrinterEvents()` | Any WebSocket event |
| `ActiveJobsQueue` | `usePrinterEvents()` | Job state changes via WS |
| `DeviceRow` | `useDeviceStatus()` | Device status changes via WS |
| `DeviceDetailPanel` | local state | Row click + close |
| `PrintPolicies` | local state | Toggle click → `api.patchPolicy()` |

### 10.3 AlertFeed — Most Critical Component

```tsx
'use client'
import { usePrinterEvents } from '@/hooks/usePrinterEvents'

export function AlertFeed() {
  const { events, connected } = usePrinterEvents()

  return (
    <section className="card">
      <div className="card-head">
        <h2>Live events</h2>
        {/* Green dot = connected, amber = reconnecting */}
        <span className={`status-dot ${connected ? 'ok' : 'warn'}`} />
      </div>
      <div>
        {events.map(e => (
          <div key={e.id} className="event">
            <div className={`event-icon ${levelToClass(e.level)}`}>
              {iconForLevel(e.level)}
            </div>
            <div className="event-body">
              <div className="msg">{e.message}</div>
              <div className="src">{e.deviceName} · {formatTime(e.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function levelToClass(level: string) {
  const map: Record<string, string> = {
    critical: 'danger', warning: 'warn', info: 'info', ok: 'ok'
  }
  return map[level] ?? 'info'
}
```

### 10.4 DeviceRow — Real-Time Status Override

`DeviceTable` (Server) renders the table shell. Each `DeviceRow` (Client) overlays live WebSocket status on top of the server-fetched initial status.

```tsx
'use client'
import { useDeviceStatus } from '@/hooks/useDeviceStatus'
import type { Device } from '@/lib/types'

export function DeviceRow({
  device,
  onSelect,
}: {
  device: Device
  onSelect: (device: Device) => void
}) {
  const liveStatuses = useDeviceStatus()
  // Live WS status takes priority over initial server-fetched status
  const status = liveStatuses.get(device.id) ?? device.status

  return (
    <tr onClick={() => onSelect(device)} className="fleet-row">
      {/* name + location */}
      {/* <Badge variant={status}> */}
      {/* toner bars */}
      {/* paper % */}
      {/* utilization bar */}
      {/* pages */}
      {/* recommendation chip */}
    </tr>
  )
}
```

### 10.5 DeviceDetailPanel

480px slide-in from right. Opens on `DeviceRow` click. Closes on X, overlay click, or Escape key.

```tsx
'use client'
import { useState, useEffect } from 'react'
import type { Device } from '@/lib/types'

type Tab = 'overview' | 'consumables' | 'activity' | 'specs'

export function DeviceDetailPanel({
  device,
  onClose,
}: {
  device: Device | null
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('overview')

  // Reset to overview tab when a different device is selected
  useEffect(() => { setTab('overview') }, [device?.id])

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!device) return null

  return (
    <>
      <div className="panel-overlay open" onClick={onClose} />
      <aside className="detail-panel open" aria-label="Device details">
        {/* header */}
        {/* toolbar: Poll now, Order toner, Schedule service */}
        {/* tab bar */}
        {/* tab content — Activity tab lazy-fetches /devices/:id/history on click */}
      </aside>
    </>
  )
}
```

**Activity tab:** call `api.deviceHistory(device.id)` inside a `useEffect` triggered by `tab === 'activity'`. Do not fetch until the tab is selected.

---

## 11. Reusable UI Components

Build these in `components/ui/`. They are the building blocks used across all sections.

### Badge
```tsx
// CSS classes from design: badge ok | warn | danger | neutral
type BadgeVariant = 'ok' | 'warn' | 'danger' | 'neutral'
const labels = { ok: 'Online', warn: 'Warning', danger: 'Needs service', neutral: 'Idle' }
<Badge variant="danger">Needs service</Badge>
```

### Button
```tsx
// CSS classes: btn primary | btn | btn subtle | btn btn-small
<Button variant="primary">Add device</Button>
<Button variant="secondary" size="small">Export</Button>
<Button variant="subtle">Dismiss</Button>
```

### ActionChip
```tsx
// CSS classes: action-chip keep | relocate | service
<ActionChip variant="relocate">Relocate</ActionChip>
```

### PolicyToggle
```tsx
// CSS classes: toggle | toggle on
// Fires api.patchPolicy() on click
<PolicyToggle enabled={policy.enabled} onChange={(v) => api.patchPolicy(policy.id, v)} />
```

### Sparkline
```tsx
// Rendered as inline <svg> — no chart library
// points: 7 daily values, oldest first
// color: CSS variable string
<Sparkline points={[120, 135, 128, 150, 162, 170, 184]} color="var(--m365-brand)" />
```

### ConsumableBar
```tsx
// letter: 'k' | 'c' | 'm' | 'y' | 'p'
// pct < 20 → danger color | pct < 40 → warning color
<ConsumableBar letter="c" pct={42} />
```

### UtilizationBar
```tsx
// pct > 85 → danger fill (over duty cycle)
// pct < 20 → muted fill (underused / candidate for relocation)
<UtilizationBar pct={94} />
```

---

## 12. Normalization Helpers

Put these in `lib/utils.ts`.

```ts
// Backend values → frontend enum
export function normalizeStatus(raw: string): DeviceStatus {
  if (['online', 'ok', 'ready'].includes(raw))       return 'ok'
  if (['warning', 'warn', 'low'].includes(raw))       return 'warn'
  if (['error', 'offline', 'jam'].includes(raw))      return 'danger'
  if (['idle', 'sleep', 'standby'].includes(raw))     return 'neutral'
  return 'neutral'
}

export function levelToClass(level: string): string {
  return ({ critical:'danger', warning:'warn', info:'info', ok:'ok' })[level] ?? 'info'
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

// Ticket priority → CSS class name (maps to left-border color)
// high   → var(--status-danger-fg)
// medium → var(--status-warning-fg)
// low    → var(--status-info-fg)
```

---

## 13. KPI Derivation

Derive KPI values from the `devices` array — do not expect a `/kpis` endpoint.

```ts
export function deriveKpis(devices: Device[]) {
  const active  = devices.filter(d => d.status !== 'danger').length
  const total   = devices.length
  const pages   = devices.reduce((s, d) => s + d.pages30d, 0)
  const avgUtil = Math.round(devices.reduce((s, d) => s + d.utilization, 0) / total)
  const alerts  = devices.filter(d => d.status === 'danger' || d.status === 'warn').length
  return { active, total, pages, avgUtil, alerts }
}
```

Sparkline history comes from `api.metrics()` — object keyed by metric name, each value is a `MetricHistory` with 7 daily data points.

---

## 14. Error Handling Rules

- **Never blank a section on fetch failure.** Preserve existing data, show a subtle "Could not refresh" label.
- **Never use `alert()` as user-facing error UI.**
- **WebSocket disconnect:** Show an amber dot in the suite header connection indicator. Reconnect silently via exponential backoff. Never block the UI or show a modal.
- **Empty API response:** Render a descriptive empty state inside the card. Never a full-page error.
- **HTTP 404:** Empty state. **HTTP 500:** Empty state + "Service unavailable" subtitle.

---

## 15. Polling Fallback

If certain data does not come through WebSocket, poll it in Client Components:

```ts
useEffect(() => {
  const id = setInterval(async () => {
    const fresh = await api.jobs()
    setJobs(fresh)
  }, 15_000)
  return () => clearInterval(id)
}, [])
```

| Data | Delivery | Interval |
|---|---|---|
| Paper jams, cover open | WebSocket push | Instant |
| Device status changes | WebSocket push | Instant |
| Job state changes | WebSocket push | Instant |
| Alert feed | WebSocket push | Instant |
| Active job queue | WS push (fallback: poll) | 15s |
| All other sections | Server Component on load | On navigate |

---

## 16. Migration Order from HTML Template

Follow this exact sequence. Do not skip or reorder steps.

```
Step 1   Scaffold Next.js 14 with App Router + TypeScript + Tailwind.
         Copy all CSS variables from HTML template :root into globals.css.
         Confirm page renders with correct background color (#faf9f8).

Step 2   Build SuiteHeader + SideNav as Server Components.
         Match pixel-for-pixel with the HTML template.

Step 3   Build lib/types.ts — all interfaces.
         Build lib/api.ts — all fetch wrappers.

Step 4   Build usePrinterEvents() hook.
         Start Docker backend. Confirm WebSocket connects.
         Build AlertFeed. Confirm live events appear in browser.

Step 5   Build DeviceTable (Server) + DeviceRow (Client).
         Wire useDeviceStatus(). Trigger a jam from backend.
         Confirm DeviceRow badge turns red in real time.

Step 6   Build KpiTiles, HeatMap, StockInventory, ReallocCards,
         CostByDept, EnvImpact, ServiceTickets, TopUsers.
         All Server Components — wire api.* calls.

Step 7   Build ActiveJobsQueue (Client). Wire WS job events.

Step 8   Build DeviceDetailPanel with all 4 tabs.
         Lazy-fetch Activity tab history on tab click.

Step 9   Build PrintPolicies (Client). Wire patchPolicy on toggle.

Step 10  Docker build both containers.
         docker-compose up. Confirm frontend → backend WS connection.
         Trigger a paper jam event. Confirm end-to-end real-time flow.
```

---

## 17. Agent Rules — Non-Negotiable

1. `'use client'` only when a component uses `useState`, `useEffect`, browser APIs, or event handlers. Default is Server Component.
2. Never install packages not listed in Section 2.
3. Never hardcode URLs. Always `process.env.NEXT_PUBLIC_API_URL`.
4. Never modify CSS variable values. The Fluent 2 tokens are final.
5. Never change grid column counts in layout. They are locked.
6. Never add new fonts. Segoe UI stack only.
7. Never use `any` in TypeScript. All shapes typed in `lib/types.ts`.
8. The detail panel opens with a full `Device` object — never just an ID.
9. Activity tab fetches lazily on tab click — not when the panel opens.
10. `usePrinterEvents()` is the single WebSocket connection for the entire app. Do not open additional WebSocket connections anywhere else.
11. Build one step at a time per the migration order in Section 16.
12. After each step, confirm it works before moving to the next.

---

## 18. Quick Reference

### Component → API Endpoint

| Component | Endpoint | Type |
|---|---|---|
| `DeviceTable` + `KpiTiles` | `GET /devices` | Server |
| `AlertFeed` | `ws://backend/ws/events` | Client/WS |
| `StockInventory` | `GET /consumables/stock` | Server |
| `ReallocCards` | `GET /reallocation` | Server |
| `ActiveJobsQueue` | `GET /jobs` + WS | Client |
| `TopUsers` | `GET /users/top` | Server |
| `CostByDept` | `GET /costs/by-department` | Server |
| `EnvImpact` | `GET /metrics/history` | Server |
| `ServiceTickets` | `GET /tickets` | Server |
| `PrintPolicies` | `GET /policies` + `PATCH /policies/:id` | Client |
| `HeatMap` | `GET /metrics/history` | Server |
| Activity tab | `GET /devices/:id/history` | Client (lazy) |

### HTML Template ID → Next.js Component

| HTML `id` | Component |
|---|---|
| `#fleetBody` | `DeviceTable` + `DeviceRow` |
| `#eventFeed` | `AlertFeed` |
| `#stockBody` | `StockInventory` |
| `#reallocBody` | `ReallocCards` |
| `#jobsBody` | `ActiveJobsQueue` |
| `#usersBody` | `TopUsers` |
| `#costsBody` | `CostByDept` |
| `#ticketsBody` | `ServiceTickets` |
| `#policiesBody` | `PrintPolicies` |
| `#sp1`–`#sp4` | `Sparkline` inside `KpiTiles` |
| `#detailPanel` | `DeviceDetailPanel` |
| `#heat` | `HeatMap` |
