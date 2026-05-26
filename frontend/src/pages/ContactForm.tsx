import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCountries } from 'react-phone-number-input'
import { contactsApi, type ContactPayload } from '../api/contacts'
import { LabeledFieldList, type LabeledEntry } from '../components/LabeledFieldList'

const PHONE_LABELS = ['mobile', 'work', 'home', 'other']
const EMAIL_LABELS = ['personal', 'work', 'other']

const CHECK_IN_OPTIONS = [
  { label: 'No preference', value: '' },
  { label: 'Weekly', value: '7' },
  { label: 'Bi-weekly', value: '14' },
  { label: 'Monthly', value: '30' },
  { label: 'Quarterly', value: '90' },
]

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

const EMPTY_PHONE: LabeledEntry = { value: '', label: 'mobile' }
const EMPTY_EMAIL: LabeledEntry = { value: '', label: 'personal' }

export default function ContactForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<ContactPayload>({ name: '' })
  const [phones, setPhones] = useState<LabeledEntry[]>([EMPTY_PHONE])
  const [emails, setEmails] = useState<LabeledEntry[]>([EMPTY_EMAIL])
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
      setPhones(contact.phones?.length ? contact.phones : [EMPTY_PHONE])
      setEmails(contact.emails?.length ? contact.emails : [EMPTY_EMAIL])
      setTagsInput(contact.tags?.join(', ') ?? '')
    }).catch(() => setError('Failed to load contact'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const set = (field: keyof ContactPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value || null }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const tags = tagsInput.trim() ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : null
    const filteredPhones = phones.filter(p => p.value.trim()).map(p => ({ value: p.value.trim(), label: p.label }))
    const filteredEmails = emails.filter(em => em.value.trim()).map(em => ({ value: em.value.trim(), label: em.label }))
    const payload: ContactPayload = {
      ...form,
      phones: filteredPhones.length ? filteredPhones : null,
      emails: filteredEmails.length ? filteredEmails : null,
      tags,
    }
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

        <LabeledFieldList
          heading="Phone"
          entries={phones}
          valuePlaceholder="+1 555 123 4567"
          labelOptions={PHONE_LABELS}
          onChange={setPhones}
        />

        <LabeledFieldList
          heading="Email"
          entries={emails}
          valuePlaceholder="you@example.com"
          labelOptions={EMAIL_LABELS}
          onChange={setEmails}
        />

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
            <label style={label}>Country</label>
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
          <button type="submit" disabled={saving}>
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
