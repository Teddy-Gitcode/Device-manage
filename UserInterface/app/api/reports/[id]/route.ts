import { NextRequest, NextResponse } from 'next/server'

const BASE   = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api'
const TOKEN  = process.env.API_TOKEN ?? ''

function hdrs(): Record<string, string> {
  if (!TOKEN) return {}
  return { Authorization: `Token ${TOKEN}`, 'Content-Type': 'application/json' }
}

async function fetchAll<T = Record<string, unknown>>(path: string): Promise<T[]> {
  const sep  = path.includes('?') ? '&' : '?'
  let url: string | null = `${BASE}${path}${sep}page_size=500`
  const all: T[] = []
  while (url) {
    const res: Response = await fetch(url, { headers: hdrs(), cache: 'no-store' })
    if (!res.ok) throw new Error(`${res.status} ${path}`)
    const data: { results?: T[]; next?: string | null } & T[] = await res.json()
    all.push(...(data.results ?? data))
    url = data.next ?? null
  }
  return all
}

type Row = (string | number | null | undefined)[]

function toCSV(rows: Row[]): string {
  return rows.map(row =>
    row.map(c => {
      const s = String(c ?? '')
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  ).join('\n')
}

function printHTML(title: string, rows: Row[]): string {
  const [header, ...data] = rows
  const th = (header as string[]).map(h => `<th>${h}</th>`).join('')
  const tbody = data.map(row =>
    `<tr>${row.map(c => `<td>${String(c ?? '')}</td>`).join('')}</tr>`
  ).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#111}
h2{margin-bottom:4px;font-size:16px}
p.sub{color:#666;margin:0 0 14px;font-size:10px}
table{border-collapse:collapse;width:100%}
th{background:#0f6cbd;color:#fff;padding:5px 8px;text-align:left;font-size:10px;white-space:nowrap}
td{border-bottom:1px solid #e8e8e8;padding:4px 8px;white-space:nowrap}
tr:nth-child(even){background:#f8f8f8}
@media print{body{margin:0}}
</style></head><body>
<h2>${title}</h2>
<p class="sub">Generated ${new Date().toLocaleString()} — Ketepa Print Fleet</p>
<table><thead><tr>${th}</tr></thead><tbody>${tbody}</tbody></table>
<script>window.onload=()=>window.print()</script>
</body></html>`
}

// ── Status / health label maps ────────────────────────────────────────────────

const STATUS: Record<number, string> = { 2: 'Sleeping', 3: 'Idle', 4: 'Printing', 5: 'Warming Up' }
const HEALTH: Record<number, string> = { 2: 'Running', 3: 'Warning', 5: 'Down' }

// ── Route handler ─────────────────────────────────────────────────────────────

type P = Record<string, any>  // eslint-disable-line @typescript-eslint/no-explicit-any

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params
  const isPrint = req.nextUrl.searchParams.get('print') === '1'
  const today = new Date().toISOString().slice(0, 10)

  let rows: Row[] = []
  let title = ''
  let filename = ''

  try {
    switch (id) {
      // ── 1. Fleet status ──────────────────────────────────────────────────
      case 'fleet-status': {
        title = 'Fleet Status Report'
        filename = `fleet-status-${today}.csv`
        const printers = await fetchAll<P>('/devices/printers/')
        rows = [
          ['Name', 'IP Address', 'Location', 'Status', 'Health', 'Health Score',
           'Min Toner %', 'Total Pages', 'Pages This Month', 'Last Polled'],
          ...printers.map(p => [
            p.name, p.ip_address, p.location ?? '',
            STATUS[p.current_status] ?? p.current_status,
            HEALTH[p.device_health] ?? p.device_health,
            p.health_score ?? '',
            p.min_supply_percent ?? '',
            p.total_page_count ?? 0,
            p.page_stats?.this_month ?? 0,
            p.last_polled_at ? new Date(p.last_polled_at).toLocaleString() : '',
          ]),
        ]
        break
      }

      // ── 2. Monthly print volume ──────────────────────────────────────────
      case 'monthly-volume': {
        title = 'Monthly Print Volume'
        filename = `monthly-volume-${today}.csv`
        const printers = await fetchAll<P>('/devices/printers/')
        rows = [
          ['Name', 'Location', 'Pages Today', 'This Week', 'This Month', 'Last Month', 'Lifetime Pages'],
          ...printers.map(p => [
            p.name, p.location ?? '',
            p.page_stats?.today ?? 0,
            p.page_stats?.this_week ?? 0,
            p.page_stats?.this_month ?? 0,
            p.page_stats?.last_month ?? 0,
            p.total_page_count ?? 0,
          ]),
        ]
        break
      }

      // ── 3. Toner usage & forecasting ─────────────────────────────────────
      case 'toner-usage': {
        title = 'Toner Usage & Forecasting'
        filename = `toner-usage-${today}.csv`
        const [consumables, printers] = await Promise.all([
          fetchAll<P>('/devices/consumables/'),
          fetchAll<P>('/devices/printers/'),
        ])
        const pm = Object.fromEntries(printers.map(p => [p.id, p]))
        rows = [
          ['Printer', 'Location', 'Consumable', 'Category', 'Color',
           'Level %', 'Current Level', 'Max Capacity',
           'Pages Remaining', 'Days Remaining', 'Status'],
          ...consumables.map(c => [
            pm[c.printer]?.name ?? c.printer,
            pm[c.printer]?.location ?? '',
            c.name, c.category, c.color ?? '',
            c.level_percent ?? 0,
            c.current_level ?? 0,
            c.max_capacity ?? 0,
            c.estimated_pages_remaining ?? '',
            c.estimated_days_remaining != null
              ? Number(c.estimated_days_remaining).toFixed(1)
              : '',
            c.status ?? '',
          ]),
        ]
        break
      }

      // ── 4. Incident log (90 days) ────────────────────────────────────────
      case 'incident-log': {
        title = 'Incident Log (90 Days)'
        filename = `incident-log-${today}.csv`
        const cutoff = new Date(Date.now() - 90 * 86_400_000)
        const [jams, covers, downs, printers] = await Promise.all([
          fetchAll<P>('/devices/logs/?event_type=PAPER_JAM&ordering=-timestamp'),
          fetchAll<P>('/devices/logs/?event_type=COVER_OPEN&ordering=-timestamp'),
          fetchAll<P>('/devices/logs/?event_type=CRITICAL_DOWN&ordering=-timestamp'),
          fetchAll<P>('/devices/printers/'),
        ])
        const pm = Object.fromEntries(printers.map(p => [p.id, p]))
        const incidents = [...jams, ...covers, ...downs]
          .filter(l => new Date(l.timestamp) >= cutoff)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        rows = [
          ['Timestamp', 'Printer', 'Location', 'Event Type', 'Alerts', 'Error Code', 'Console Display'],
          ...incidents.map(l => [
            new Date(l.timestamp).toLocaleString(),
            pm[l.printer]?.name ?? l.printer,
            pm[l.printer]?.location ?? '',
            l.event_type ?? '',
            (l.active_alerts ?? []).join('; '),
            l.error_code ?? '',
            l.console_display ?? '',
          ]),
        ]
        break
      }

      // ── 5. Cost summary ──────────────────────────────────────────────────
      case 'cost-summary': {
        title = 'Cost Summary'
        filename = `cost-summary-${today}.csv`
        const printers = await fetchAll<P>('/devices/printers/')
        rows = [
          ['Printer', 'Location', 'Cost/Page Mono (KES)', 'Cost/Page Color (KES)',
           'Pages This Month', 'Est. Mono Cost (KES)', 'Est. Color Cost (KES)'],
          ...printers.map(p => {
            const pagesMonth = p.page_stats?.this_month ?? 0
            const cpMono  = parseFloat(p.cost_per_page_mono ?? '0')
            const cpColor = parseFloat(p.cost_per_page_color ?? '0')
            return [
              p.name, p.location ?? '',
              p.cost_per_page_mono ?? '',
              p.cost_per_page_color ?? '',
              pagesMonth,
              cpMono  ? (pagesMonth * cpMono).toFixed(2)  : '',
              cpColor ? (pagesMonth * cpColor).toFixed(2) : '',
            ]
          }),
        ]
        break
      }

      // ── 6. Energy consumption ────────────────────────────────────────────
      case 'energy': {
        title = 'Energy Consumption'
        filename = `energy-${today}.csv`
        const printers = await fetchAll<P>('/devices/printers/')
        rows = [
          ['Printer', 'Location', 'Rated Power (W)', 'Uptime Today (min)', 'Est. kWh Today'],
          ...printers.map(p => {
            const watts     = p.energy_consumption_rate_watts ?? 0
            const uptimeMin = p.today_stats?.uptime_minutes ?? 0
            const kwhToday  = watts && uptimeMin
              ? ((watts * (uptimeMin / 60)) / 1000).toFixed(3)
              : ''
            return [p.name, p.location ?? '', watts || '', uptimeMin, kwhToday]
          }),
        ]
        break
      }

      default:
        return NextResponse.json({ error: 'Unknown report' }, { status: 404 })
    }
  } catch (err) {
    console.error('[reports]', err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }

  if (isPrint) {
    return new NextResponse(printHTML(title, rows), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  return new NextResponse(toCSV(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
