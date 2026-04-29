import { cookies } from 'next/headers'

const BACKEND = process.env.API_URL ?? 'http://localhost:8000/api'

export function getServerToken(): string {
  const store = cookies()
  return store.get('ketepa_auth_token')?.value ?? ''
}

export async function serverGet<T>(path: string): Promise<{ data: T | null; status: number }> {
  const token = getServerToken()
  try {
    const res = await fetch(`${BACKEND}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Token ${token}` } : {}),
      },
      next: { revalidate: 0 },
    })
    if (!res.ok) return { data: null, status: res.status }
    return { data: await res.json() as T, status: res.status }
  } catch {
    return { data: null, status: 502 }
  }
}
