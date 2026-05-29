import { api } from './client'
import type { Interaction } from './interactions'
import type { LifeEvent, EventType } from './life_events'

export interface GroupInteractionPayload {
  contact_ids: string[]
  date: string
  medium: string
  notes?: string | null
}

export interface GroupEventPayload {
  contact_ids: string[]
  title: string
  event_type: EventType
  event_date?: string | null
  is_recurring?: boolean
  notes?: string | null
  reminder_days_before?: number | null
  reminder_days_after?: number | null
}

export const logApi = {
  interaction: (data: GroupInteractionPayload) => api.post<Interaction[]>('/log/interaction', data),
  event: (data: GroupEventPayload) => api.post<LifeEvent[]>('/log/event', data),
}
