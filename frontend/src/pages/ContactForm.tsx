import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PhoneInput, { getCountries } from 'react-phone-number-input'
import type { Value as PhoneValue } from 'react-phone-number-input'
import { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { contactsApi, type ContactPayload } from '../api/contacts'

const CHECK_IN_OPTIONS = [
  { label: 'No preference', value: '' },
  { label: 'Weekly', value: '7' },
  { label: 'Bi-weekly', value: '14' },
  { label: 'Monthly', value: '30' },
  { label: 'Quarterly', value: '90' },
]

// Build country list: United States first, then rest alphabetically
const countryDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' })
const _allCountries = getCountries()
  .map(code => ({ code, name: countryDisplayNames.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name))
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  ..._allCountries.filter(c => c.code !== 'US'),
]

const label = { display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.875rem' } as const
const fieldWrap = { marginBottom: 16 } as const
const row = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 } as const

export default function ContactForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<ContactPayload>({ name: '' })
  const [phone, setPhone] = useState<PhoneValue>(undefined)
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [tagsInput, setTagsInput] = useState('')
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || !id) return
    contactsApi.get(id).then(contact => {
      setForm({
        name: contact.name,
        nickname: contact.nickname,
        email: contact.email,
        phone: contact.phone,
        birthday: contact.birthday,
        job_title: contact.job_title,
        company: contact.company,
        city: contact.city,
        state: contact.state,
        country_code: contact.country_code,
        postal_code: contact.postal_code,
        tags: contact.tags,
        general_notes: contact.general_notes,
        check_in_frequency_days: contact.check_in_frequency_days,
      })
      setPhone((contact.phone as PhoneValue) ?? undefined)
      setTagsInput(contact.tags?.join(', ') ?? '')
    }).catch(() => setError('Failed to load contact'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const set = (field: keyof ContactPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value || null }))

  const validatePhone = () => {
    if (!phone) { setPhoneError(null); return }
    setPhoneError(isValidPhoneNumber(phone) ? null : 'Enter a valid phone number including country code')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phone && !isValidPhoneNumber(phone)) {
      setPhoneError('Enter a valid phone number including country code')
      return
    }
    setSaving(true)
    setError(null)
    const tags = tagsInput.trim() ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : null
    // phone is already E.164 from react-phone-number-input
    const payload = { ...form, phone: phone ?? null, tags }
    try {
      if (isEdit && id) {
        await contactsApi.update(id, payload)
        navigate(`/contacts/${id}`)
      } else {
        const created = await contactsApi.create(payload)
        navigate(`/contacts/${created.id}`)
      }
    } catch {
      setError('Failed to save contact')
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

  return (
    <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
      <h1>{isEdit ? 'Edit contact' : 'New contact'}</h1>
      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}
      <form onSubmit={handleSubmit}>

        <div style={fieldWrap}>
          <label style={label}>Name *</label>
          <input value={form.name} onChange={set('name')} required />
        </div>

        <div style={fieldWrap}>
          <label style={label}>Nickname</label>
          <input value={form.nickname ?? ''} onChange={set('nickname')} />
        </div>

        <div style={row}>
          <div>
            <label style={label}>Email</label>
            <input type="email" value={form.email ?? ''} onChange={set('email')} />
          </div>
          <div>
            <label style={label}>Phone (E.164)</label>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              onBlur={validatePhone}
              defaultCountry="US"
              international
              style={{ '--PhoneInputCountryFlag-height': '1em' } as React.CSSProperties}
            />
            {phoneError && <p style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: 4 }}>{phoneError}</p>}
            {phone && isValidPhoneNumber(phone) && (
              <p style={{ color: '#16a34a', fontSize: '0.75rem', marginTop: 4 }}>Stored as: {phone}</p>
            )}
          </div>
        </div>

        <div style={fieldWrap}>
          <label style={label}>Birthday</label>
          <input type="date" value={form.birthday ?? ''} onChange={set('birthday')} />
        </div>

        <div style={row}>
          <div>
            <label style={label}>Job title</label>
            <input value={form.job_title ?? ''} onChange={set('job_title')} />
          </div>
          <div>
            <label style={label}>Company</label>
            <input value={form.company ?? ''} onChange={set('company')} />
          </div>
        </div>

        <div style={row}>
          <div>
            <label style={label}>City</label>
            <input value={form.city ?? ''} onChange={set('city')} />
          </div>
          <div>
            <label style={label}>State / Region</label>
            <input value={form.state ?? ''} onChange={set('state')} />
          </div>
        </div>

        <div style={row}>
          <div>
            <label style={label}>Country (ISO 3166-1)</label>
            <select
              value={form.country_code ?? ''}
              onChange={e => setForm(f => ({ ...f, country_code: e.target.value || null }))}
            >
              <option value="">— Select country —</option>
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Postal code</label>
            <input value={form.postal_code ?? ''} onChange={set('postal_code')} />
          </div>
        </div>

        <div style={fieldWrap}>
          <label style={label}>Tags (comma-separated)</label>
          <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="friend, college, work" />
        </div>

        <div style={fieldWrap}>
          <label style={label}>Check-in frequency</label>
          <select
            value={form.check_in_frequency_days?.toString() ?? ''}
            onChange={e => setForm(f => ({ ...f, check_in_frequency_days: e.target.value ? parseInt(e.target.value) : null }))}
          >
            {CHECK_IN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div style={fieldWrap}>
          <label style={label}>Notes</label>
          <textarea style={{ height: 120 }} value={form.general_notes ?? ''} onChange={set('general_notes')} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" disabled={saving || !!phoneError}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={() => navigate(isEdit && id ? `/contacts/${id}` : '/contacts')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
