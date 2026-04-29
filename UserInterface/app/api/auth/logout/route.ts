import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.API_URL ?? 'http://localhost:8000/api'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  try {
    await fetch(`${BACKEND}/auth/logout/`, {
      method:  'POST',
      headers: { Authorization: authHeader },
    })
  } catch {
    // Best-effort; still clear client state
  }
  return NextResponse.json({ message: 'Logged out' })
}
