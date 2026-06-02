import { api } from './client'

export interface UserSettings {
  email_reminders_enabled: boolean
  sms_reminders_enabled: boolean
  sms_phone: string | null
  reminder_hour: number
  timezone: string
}

export const settingsApi = {
  get: () => api.get<UserSettings>('/settings/'),
  update: (data: Partial<UserSettings>) => api.put<UserSettings>('/settings/', data),
}
