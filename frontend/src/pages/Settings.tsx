import { useEffect, useState } from 'react'
import { settingsApi, type UserSettings } from '../api/settings'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const ampm = i < 12 ? 'AM' : 'PM'
  const h = i % 12 === 0 ? 12 : i % 12
  return { value: i, label: `${h}:00 ${ampm}` }
})

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' },
]

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [smsPhone, setSmsPhone] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    settingsApi.get().then(s => {
      setSettings(s)
      setSmsPhone(s.sms_phone ?? undefined)
    })
  }, [])

  const handleToggle = async (field: 'email_reminders_enabled' | 'sms_reminders_enabled') => {
    if (!settings) return
    const updated = { ...settings, [field]: !settings[field] }
    setSettings(updated)
    await settingsApi.update({ [field]: updated[field] })
  }

  const handleSavePhone = async () => {
    if (smsPhone && !isValidPhoneNumber(smsPhone)) {
      setError('Enter a valid phone number')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = await settingsApi.update({ sms_phone: smsPhone ?? null })
      setSettings(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleReminderTime = async (field: 'reminder_hour' | 'timezone', value: string | number) => {
    if (!settings) return
    const updated = { ...settings, [field]: value }
    setSettings(updated)
    await settingsApi.update({ [field]: value })
  }

  if (!settings) return <div style={{ padding: '2rem' }}>Loading…</div>

  return (
    <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Settings</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Daily reminders</h2>
        <p style={{ color: '#555', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
          A daily digest is sent summarising overdue check-ins and life events coming up in the next 7 days.
        </p>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.sms_reminders_enabled}
            onChange={() => handleToggle('sms_reminders_enabled')}
          />
          <span>Text (SMS) reminders</span>
        </label>

        {settings.sms_reminders_enabled && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Your phone number for texts
              </label>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <PhoneInput
                  defaultCountry="US"
                  value={smsPhone}
                  onChange={val => setSmsPhone(val)}
                  style={{ flex: 1 }}
                />
                <button onClick={handleSavePhone} disabled={saving}>
                  {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
                </button>
              </div>
              {error && <p style={{ color: '#dc2626', marginTop: '0.5rem', fontSize: '0.875rem' }}>{error}</p>}
              <p style={{ color: '#888', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                By saving your number you consent to receive periodic SMS reminders from Keep Contact. Message frequency varies. Reply STOP to unsubscribe, HELP for help. Msg &amp; Data rates may apply.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Delivery time
                </label>
                <select
                  value={settings.reminder_hour}
                  onChange={e => handleReminderTime('reminder_hour', parseInt(e.target.value))}
                >
                  {HOUR_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                  Timezone
                </label>
                <select
                  value={settings.timezone}
                  onChange={e => handleReminderTime('timezone', e.target.value)}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
