import { NextRequest, NextResponse } from 'next/server'

const base  = () => process.env.API_URL  ?? 'http://localhost:8000/api'
const token = () => process.env.API_TOKEN ?? ''

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const res = await fetch(`${base()}/devices/printers/${params.id}/`, {
      method:  'PATCH',
      headers: { Authorization: `Token ${token()}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const res = await fetch(`${base()}/devices/printers/${params.id}/`, {
      method:  'DELETE',
      headers: { Authorization: `Token ${token()}` },
    })
    if (res.status === 204) return new NextResponse(null, { status: 204 })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 502 })
  }
}
