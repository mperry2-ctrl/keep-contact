import { api } from './client'

export interface UserProfile {
  user_id: string
  name: string | null
  bio: string | null
  birthday: string | null
  job_title: string | null
  company: string | null
  city: string | null
  state: string | null
  country_code: string | null
  postal_code: string | null
  phones: string[] | null
  emails: string[] | null
  photo_url: string | null
  created_at: string
  updated_at: string
}

export interface UserProfilePayload {
  name?: string | null
  bio?: string | null
  birthday?: string | null
  job_title?: string | null
  company?: string | null
  city?: string | null
  state?: string | null
  country_code?: string | null
  postal_code?: string | null
  phones?: string[] | null
  emails?: string[] | null
  photo_url?: string | null
}

export const profileApi = {
  get: () => api.get<UserProfile>('/profile/'),
  upsert: (data: UserProfilePayload) => api.put<UserProfile>('/profile/', data),
}
