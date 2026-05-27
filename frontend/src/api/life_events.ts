import { api } from './client'

export type EventType = 'birthday' | 'trip' | 'milestone' | 'meeting' | 'other'

export interface LifeEvent {
  id: string
  contact_id: string
  title: string
  event_type: EventType
  event_date: string | null
  is_recurring: boolean
  notes: string | null
  reminder_days_before: number | null
  reminder_days_after: number | null
  created_at: string
}

export interface LifeEventPayload {
  title: string
  event_type: EventType
  event_date?: string | null
  is_recurring?: boolean
  notes?: string | null
  reminder_days_before?: number | null
  reminder_days_after?: number | null
}

export const lifeEventsApi = {
  list: (contactId: string) => api.get<LifeEvent[]>(`/contacts/${contactId}/life_events/`),
  create: (contactId: string, data: LifeEventPayload) =>
    api.post<LifeEvent>(`/contacts/${contactId}/life_events/`, data),
  update: (contactId: string, eventId: string, data: LifeEventPayload) =>
    api.put<LifeEvent>(`/contacts/${contactId}/life_events/${eventId}`, data),
  delete: (contactId: string, eventId: string) =>
    api.del(`/contacts/${contactId}/life_events/${eventId}`),
}
