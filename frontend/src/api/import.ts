import { api } from './client'
import { supabase } from '../lib/supabase'

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000'

export interface ImportContactPreview {
  name: string
  nickname: string | null
  email: string | null
  phone: string | null
  birthday: string | null
  job_title: string | null
  company: string | null
  city: string | null
  state: string | null
  country_code: string | null
  postal_code: string | null
  tags: string[] | null
  general_notes: string | null
  duplicate_of: string | null
  duplicate_name: string | null
}

export type ImportAction = 'import' | 'skip' | 'merge'

export interface ImportConfirmItem {
  contact: ImportContactPreview
  action: ImportAction
  merge_into: string | null
}

export interface ImportConfirmResult {
  imported: number
  merged: number
  skipped: number
}

export const importApi = {
  getGoogleAuthUrl: () =>
    api.get<{ url: string; session_id: string }>('/import/google/auth-url'),

  getGoogleContacts: (sessionId: string) =>
    api.get<ImportContactPreview[]>(`/import/google/contacts?session_id=${sessionId}`),

  uploadVcf: async (file: File): Promise<ImportContactPreview[]> => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${API_URL}/import/vcf`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
  },

  confirm: (contacts: ImportConfirmItem[]) =>
    api.post<ImportConfirmResult>('/import/confirm', { contacts }),
}
