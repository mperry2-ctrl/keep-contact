import { api } from './client'

export interface OverdueContact {
  id: string
  name: string
  check_in_frequency_days: number
  last_interaction_date: string | null
  days_overdue: number
}

export interface UpcomingEvent {
  contact_id: string
  contact_name: string
  title: string
  event_type: string
  event_date: string
  days_until: number
  is_recurring: boolean
}

export const dashboardApi = {
  overdue: () => api.get<OverdueContact[]>('/dashboard/overdue'),
  upcoming: () => api.get<UpcomingEvent[]>('/dashboard/upcoming'),
}
