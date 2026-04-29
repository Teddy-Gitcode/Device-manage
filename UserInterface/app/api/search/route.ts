import { NextRequest, NextResponse } from 'next/server'

export interface SearchResult {
  id:       string
  name:     string
  location: string
  ip:       string
  health:   number   // 2=Running 3=Warning 5=Down
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 1) return NextResponse.json([])

  const base  = process.env.API_URL ?? 'http://localhost:8000/api'
  const token = process.env.API_TOKEN

  try {
    const res = await fetch(`${base}/devices/printers/?page_size=200`, {
      headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
      next: { revalidate: 30 },
    })
    if (!res.ok) return NextResponse.json([])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const printers: any[] = data.results ?? data
    const lower = q.toLowerCase()

    const matches = printers
      .filter(p =>
        p.name?.toLowerCase().includes(lower) ||
        p.location?.toLowerCase().includes(lower) ||
        p.ip_address?.includes(lower) ||
        p.serial_number?.toLowerCase().includes(lower) ||
        p.model_name?.toLowerCase().includes(lower)
      )
      .slice(0, 6)
      .map(p => ({
        id:       String(p.id),
        name:     p.name ?? '—',
        location: p.location ?? '—',
        ip:       p.ip_address ?? '—',
        health:   p.device_health ?? 2,
      }))

    return NextResponse.json(matches)
  } catch {
    return NextResponse.json([])
  }
}
