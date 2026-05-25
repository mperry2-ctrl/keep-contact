import { api } from './client'

export interface Interaction {
  id: string
  contact_id: string
  date: string
  medium: string
  notes: string | null
  created_at: string
}

export interface InteractionPayload {
  date: string
  medium: string
  notes?: string | null
}

export const interactionsApi = {
  list: (contactId: string) => api.get<Interaction[]>(`/contacts/${contactId}/interactions/`),
  create: (contactId: string, data: InteractionPayload) =>
    api.post<Interaction>(`/contacts/${contactId}/interactions/`, data),
  update: (contactId: string, interactionId: string, data: InteractionPayload) =>
    api.put<Interaction>(`/contacts/${contactId}/interactions/${interactionId}`, data),
  delete: (contactId: string, interactionId: string) =>
    api.del(`/contacts/${contactId}/interactions/${interactionId}`),
}
