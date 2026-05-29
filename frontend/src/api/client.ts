import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL as string || 'http://localhost:8000'

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

async function parseJson<T>(res: Response): Promise<T> {
  try {
    return await res.json()
  } catch {
    const ct = res.headers.get('content-type') ?? 'unknown'
    throw new Error(`Expected JSON but got ${ct} (status ${res.status})`)
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: await authHeaders() })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return parseJson<T>(res)
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return parseJson<T>(res)
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method: 'PUT', headers: await authHeaders(), body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return parseJson<T>(res)
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${API_URL}${path}`, { method: 'DELETE', headers: await authHeaders() })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
}

export const api = { get, post, put, del }
