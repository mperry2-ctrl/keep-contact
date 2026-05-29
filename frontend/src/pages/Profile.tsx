import { useEffect, useState } from 'react'
import { profileApi, type UserProfile, type UserProfilePayload } from '../api/profile'

const COUNTRIES = [
  ['US', 'United States'], ['GB', 'United Kingdom'], ['CA', 'Canada'],
  ['AU', 'Australia'], ['DE', 'Germany'], ['FR', 'France'], ['ES', 'Spain'],
  ['IT', 'Italy'], ['NL', 'Netherlands'], ['SE', 'Sweden'], ['NO', 'Norway'],
  ['DK', 'Denmark'], ['FI', 'Finland'], ['CH', 'Switzerland'], ['AT', 'Austria'],
  ['BE', 'Belgium'], ['PT', 'Portugal'], ['IE', 'Ireland'], ['NZ', 'New Zealand'],
  ['JP', 'Japan'], ['CN', 'China'], ['IN', 'India'], ['BR', 'Brazil'],
  ['MX', 'Mexico'], ['KR', 'South Korea'], ['SG', 'Singapore'],
]

const COUNTRY_MAP = Object.fromEntries(COUNTRIES)

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#555' }}>{label}: </span>
      <span>{value}</span>
    </div>
  )
}

function locationString(p: UserProfile): string | null {
  const parts = [p.city, p.state, p.postal_code, p.country_code ? (COUNTRY_MAP[p.country_code] ?? p.country_code) : null]
  const joined = parts.filter(Boolean).join(', ')
  return joined || null
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // form state
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [birthday, setBirthday] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [city, setCity] = useState('')
  const [stateFld, setStateFld] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    profileApi.get()
      .then(p => {
        setProfile(p)
        populateForm(p)
      })
      .catch(e => {
        if (e.message?.includes('404')) {
          setEditing(true) // no profile yet — open edit mode immediately
        } else {
          setError('Failed to load profile')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function populateForm(p: UserProfile) {
    setName(p.name ?? '')
    setBio(p.bio ?? '')
    setBirthday(p.birthday ?? '')
    setJobTitle(p.job_title ?? '')
    setCompany(p.company ?? '')
    setCity(p.city ?? '')
    setStateFld(p.state ?? '')
    setCountryCode(p.country_code ?? '')
    setPostalCode(p.postal_code ?? '')
    setPhone(p.phone ?? '')
    setEmail(p.email ?? '')
  }

  function handleEdit() {
    if (profile) populateForm(profile)
    setEditing(true)
  }

  function handleCancel() {
    setEditing(false)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload: UserProfilePayload = {
      name: name || null,
      bio: bio || null,
      birthday: birthday || null,
      job_title: jobTitle || null,
      company: company || null,
      city: city || null,
      state: stateFld || null,
      country_code: countryCode || null,
      postal_code: postalCode || null,
      phone: phone || null,
      email: email || null,
      photo_url: null,
    }
    try {
      const updated = await profileApi.upsert(payload)
      setProfile(updated)
      setEditing(false)
    } catch {
      setError('Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading…</div>

  if (error && !editing) return (
    <div style={{ padding: '2rem', color: '#c00' }}>{error}</div>
  )

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ marginBottom: '2rem' }}>{profile ? 'Edit profile' : 'Set up your profile'}</h1>

        {error && (
          <p style={{ color: '#c00', marginBottom: '1rem', padding: '0.75rem', background: '#fff0f0', borderRadius: 4 }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div style={fieldWrap}>
            <label style={labelStyle}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>

          <div style={twoCol}>
            <div>
              <label style={labelStyle}>Job title</label>
              <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Software Engineer" />
            </div>
            <div>
              <label style={labelStyle}>Company</label>
              <input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Corp" />
            </div>
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Birthday</label>
            <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
          </div>

          <div style={twoCol}>
            <div>
              <label style={labelStyle}>Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
          </div>

          <div style={fieldWrap}>
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
            <div style={twoCol}>
              <div>
                <label style={labelStyle}>City</label>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="New York" />
              </div>
              <div>
                <label style={labelStyle}>State / region</label>
                <input value={stateFld} onChange={e => setStateFld(e.target.value)} placeholder="NY" />
              </div>
            </div>
            <div style={{ ...twoCol, marginBottom: 0 }}>
              <div>
                <label style={labelStyle}>Country</label>
                <select value={countryCode} onChange={e => setCountryCode(e.target.value)} style={{ width: '100%' }}>
                  <option value="">— Select —</option>
                  {COUNTRIES.map(([code, cname]) => (
                    <option key={code} value={code}>{cname}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Postal code</label>
                <input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="10001" />
              </div>
            </div>
          </fieldset>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            {profile && (
              <button type="button" onClick={handleCancel}>Cancel</button>
            )}
          </div>
        </form>
      </div>
    )
  }

  // ── Read mode ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '2rem', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>{profile?.name ?? 'My Profile'}</h1>
          {profile?.job_title || profile?.company ? (
            <div style={{ color: '#555', marginTop: 4 }}>
              {[profile.job_title, profile.company].filter(Boolean).join(' · ')}
            </div>
          ) : null}
        </div>
        <button onClick={handleEdit}>Edit</button>
      </div>

      <section style={{ marginBottom: '1.5rem' }}>
        <Row label="Phone" value={profile?.phone} />
        <Row label="Email" value={profile?.email} />
        <Row label="Birthday" value={profile?.birthday} />
        <Row label="Location" value={profile ? locationString(profile) : null} />
      </section>

      {profile?.bio && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Bio</h3>
          <p style={{ whiteSpace: 'pre-wrap', color: '#444' }}>{profile.bio}</p>
        </section>
      )}

      {!profile?.name && !profile?.phone && !profile?.email && !profile?.bio && (
        <p style={{ color: '#888' }}>Your profile is empty. Click Edit to fill it in.</p>
      )}
    </div>
  )
}

const fieldWrap = { marginBottom: '1.25rem' } as const
const twoCol = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.25rem' } as const
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: '0.875rem',
  marginBottom: 4,
  color: '#444',
}
