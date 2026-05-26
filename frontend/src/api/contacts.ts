import { api } from './client'

export interface LabeledEntry {
  value: string
  label: string
}

export interface Contact {
  id: string
  user_id: string
  name: string
  nickname: string | null
  phones: LabeledEntry[] | null
  emails: LabeledEntry[] | null
  birthday: string | null
  job_title: string | null
  company: string | null
  city: string | null
  state: string | null
  country_code: string | null
  postal_code: string | null
  tags: string[] | null
  general_notes: string | null
  photo_url: string | null
  check_in_frequency_days: number | null
  created_at: string
  updated_at: string
}

export interface ContactPayload {
  name: string
  nickname?: string | null
  phones?: LabeledEntry[] | null
  emails?: LabeledEntry[] | null
  birthday?: string | null
  job_title?: string | null
  company?: string | null
  city?: string | null
  state?: string | null
  country_code?: string | null
  postal_code?: string | null
  tags?: string[] | null
  general_notes?: string | null
  check_in_frequency_days?: number | null
}

export const contactsApi = {
  list: () => api.get<Contact[]>('/contacts/'),
  get: (id: string) => api.get<Contact>(`/contacts/${id}`),
  create: (data: ContactPayload) => api.post<Contact>('/contacts/', data),
  update: (id: string, data: ContactPayload) => api.put<Contact>(`/contacts/${id}`, data),
  delete: (id: string) => api.del(`/contacts/${id}`),
}
