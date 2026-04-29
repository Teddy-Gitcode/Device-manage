import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const base  = process.env.API_URL  ?? 'http://localhost:8000/api'
  const token = process.env.API_TOKEN ?? ''

  try {
    const body = await req.json()
    const res = await fetch(`${base}/devices/printers/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}
