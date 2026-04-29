import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.API_URL ?? 'http://localhost:8000/api'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  try {
    const res  = await fetch(`${BACKEND}/auth/me/`, { headers: { Authorization: auth } })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  try {
    const body = await req.json()
    const res  = await fetch(`${BACKEND}/auth/me/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}
