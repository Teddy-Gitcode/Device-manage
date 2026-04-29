import { NextResponse } from 'next/server'

export async function POST() {
  const base  = process.env.API_URL  ?? 'http://localhost:8000/api'
  const token = process.env.API_TOKEN ?? ''

  try {
    const res = await fetch(`${base}/devices/printers/discover/`, {
      method: 'POST',
      headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}
