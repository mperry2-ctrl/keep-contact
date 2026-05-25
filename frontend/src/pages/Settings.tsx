import { useEffect, useState } from 'react'
import { settingsApi, type UserSettings } from '../api/settings'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

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

  if (!settings) return <div style={{ padding: '2rem' }}>Loading…</div>

  return (
    <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Settings</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Daily reminders</h2>
        <p style={{ color: '#555', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
          A daily digest is sent each morning summarising overdue check-ins and life events coming up in the next 3 days.
        </p>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.email_reminders_enabled}
            onChange={() => handleToggle('email_reminders_enabled')}
          />
          <span>Email reminders</span>
        </label>

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
          </div>
        )}
      </section>
    </div>
  )
}
