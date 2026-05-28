import { useEffect, useState } from 'react'
import { profileApi, type UserProfilePayload } from '../api/profile'

const COUNTRIES = [
  ['US', 'United States'], ['GB', 'United Kingdom'], ['CA', 'Canada'],
  ['AU', 'Australia'], ['DE', 'Germany'], ['FR', 'France'], ['ES', 'Spain'],
  ['IT', 'Italy'], ['NL', 'Netherlands'], ['SE', 'Sweden'], ['NO', 'Norway'],
  ['DK', 'Denmark'], ['FI', 'Finland'], ['CH', 'Switzerland'], ['AT', 'Austria'],
  ['BE', 'Belgium'], ['PT', 'Portugal'], ['IE', 'Ireland'], ['NZ', 'New Zealand'],
  ['JP', 'Japan'], ['CN', 'China'], ['IN', 'India'], ['BR', 'Brazil'],
  ['MX', 'Mexico'], ['KR', 'South Korea'], ['SG', 'Singapore'],
]

export default function Profile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [birthday, setBirthday] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    profileApi.get()
      .then(p => {
        setName(p.name ?? '')
        setBio(p.bio ?? '')
        setBirthday(p.birthday ?? '')
        setJobTitle(p.job_title ?? '')
        setCompany(p.company ?? '')
        setCity(p.city ?? '')
        setState(p.state ?? '')
        setCountryCode(p.country_code ?? '')
        setPostalCode(p.postal_code ?? '')
        setPhone(p.phone ?? '')
        setEmail(p.email ?? '')
      })
      .catch(e => {
        if (!e.message?.includes('404')) setError('Failed to load profile')
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)

    const payload: UserProfilePayload = {
      name: name || null,
      bio: bio || null,
      birthday: birthday || null,
      job_title: jobTitle || null,
      company: company || null,
      city: city || null,
      state: state || null,
      country_code: countryCode || null,
      postal_code: postalCode || null,
      phone: phone || null,
      email: email || null,
      photo_url: null,
    }

    try {
      await profileApi.upsert(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading…</div>

  return (
    <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>My Profile</h1>
      <p style={{ color: '#666', marginBottom: '2rem', fontSize: '0.875rem' }}>
        Your personal contact card. In a future update you'll be able to share this with others.
      </p>

      {error && (
        <p style={{ color: '#c00', marginBottom: '1rem', padding: '0.75rem', background: '#fff0f0', borderRadius: 4 }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Job title</label>
            <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Software Engineer" />
          </div>
          <div>
            <label style={labelStyle}>Company</label>
            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Corp" />
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Birthday</label>
          <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="A short note about yourself…"
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '1rem', marginBottom: '1.25rem' }}>
          <legend style={{ fontWeight: 600, fontSize: '0.875rem', padding: '0 6px' }}>Location</legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>City</label>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="New York" />
            </div>
            <div>
              <label style={labelStyle}>State / region</label>
              <input value={state} onChange={e => setState(e.target.value)} placeholder="NY" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Country</label>
              <select value={countryCode} onChange={e => setCountryCode(e.target.value)} style={{ width: '100%' }}>
                <option value="">— Select —</option>
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Postal code</label>
              <input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="10001" />
            </div>
          </div>
        </fieldset>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
          {saved && <span style={{ color: '#16a34a', fontSize: '0.875rem' }}>Saved</span>}
        </div>
      </form>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: '0.875rem',
  marginBottom: 4,
  color: '#444',
}
