import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { contactsApi, type Contact } from '../api/contacts'
import { interactionsApi, type Interaction, type InteractionPayload } from '../api/interactions'
import { lifeEventsApi, type LifeEvent, type LifeEventPayload, type EventType } from '../api/life_events'

const MEDIUMS = ['in-person', 'call', 'text', 'email', 'social', 'other']
const EVENT_TYPES: EventType[] = ['trip', 'milestone', 'meeting', 'other']
const REMINDER_OPTIONS = [
  { label: 'No reminder', value: '' },
  { label: '1 day before', value: '1' },
  { label: '3 days before', value: '3' },
  { label: '1 week before', value: '7' },
  { label: '2 weeks before', value: '14' },
  { label: '1 month before', value: '30' },
]

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#555' }}>{label}: </span>
      <span>{value}</span>
    </div>
  )
}

function LogForm({ contactId, onSaved }: { contactId: string; onSaved: (i: Interaction) => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [medium, setMedium] = useState('in-person')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const interaction = await interactionsApi.create(contactId, { date, medium, notes: notes || null })
    onSaved(interaction)
    setNotes('')
    setDate(today)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' }}>
      <h3 style={{ marginBottom: '0.75rem' }}>Log an interaction</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ flex: 1 }} />
        <select value={medium} onChange={e => setMedium(e.target.value)} style={{ flex: 1 }}>
          {MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="What did you talk about? Any upcoming events they mentioned?"
        rows={3}
        style={{ marginBottom: 8 }}
      />
      <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Log interaction'}</button>
    </form>
  )
}

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [contact, setContact] = useState<Contact | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<InteractionPayload>({ date: '', medium: 'in-person' })
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([])
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editEventForm, setEditEventForm] = useState<LifeEventPayload>({ title: '', event_type: 'other' })
  const [showEventForm, setShowEventForm] = useState(false)
  const [newEvent, setNewEvent] = useState<LifeEventPayload>({ title: '', event_type: 'other' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    Promise.all([contactsApi.get(id), interactionsApi.list(id), lifeEventsApi.list(id)])
      .then(([c, i, e]) => { setContact(c); setInteractions(i); setLifeEvents(e) })
      .catch(() => setError('Contact not found'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!id || !confirm('Delete this contact?')) return
    await contactsApi.delete(id)
    navigate('/contacts')
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>
  if (error || !contact) return <div style={{ padding: '2rem', color: 'red' }}>{error ?? 'Not found'}</div>

  return (
    <div style={{ padding: '2rem', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/contacts">← Contacts</Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>{contact.name}</h1>
          {contact.nickname && <div style={{ color: '#555' }}>"{contact.nickname}"</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={`/contacts/${id}/edit`}><button>Edit</button></Link>
          <button onClick={handleDelete} style={{ color: '#dc2626', borderColor: '#fca5a5' }}>Delete</button>
        </div>
      </div>

      <section style={{ marginBottom: '1.5rem' }}>
        <Row label="Email" value={contact.email} />
        <Row label="Phone" value={contact.phone} />
        <Row label="Birthday" value={contact.birthday} />
        <Row label="Job title" value={contact.job_title} />
        <Row label="Company" value={contact.company} />
        {(contact.city || contact.state || contact.country_code) && (
          <Row label="Location" value={[
            contact.city,
            contact.state,
            contact.postal_code,
            contact.country_code ? new Intl.DisplayNames(['en'], { type: 'region' }).of(contact.country_code) : null,
          ].filter(Boolean).join(', ')} />
        )}
        {contact.check_in_frequency_days && (
          <Row label="Check-in every" value={`${contact.check_in_frequency_days} days`} />
        )}
        {contact.tags && contact.tags.length > 0 && (
          <Row label="Tags" value={contact.tags.join(', ')} />
        )}
      </section>

      {contact.general_notes && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h3>Notes</h3>
          <p style={{ whiteSpace: 'pre-wrap', color: '#444' }}>{contact.general_notes}</p>
        </section>
      )}

      <section>
        <LogForm contactId={contact.id} onSaved={i => setInteractions(prev => [...prev, i].sort((a, b) => b.date.localeCompare(a.date)))} />

        <h3 style={{ marginBottom: '0.75rem' }}>Interaction history</h3>
        {interactions.length === 0 && <p style={{ color: '#888' }}>No interactions logged yet.</p>}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {interactions.map(i => (
            <li key={i.id} style={{ borderBottom: '1px solid #e5e7eb', padding: '0.75rem 0' }}>
              {editingId === i.id ? (
                <form onSubmit={async e => {
                  e.preventDefault()
                  const updated = await interactionsApi.update(contact.id, i.id, editForm)
                  setInteractions(prev =>
                    [...prev.map(x => x.id === i.id ? updated : x)]
                      .sort((a, b) => b.date.localeCompare(a.date))
                  )
                  setEditingId(null)
                }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                      required
                      style={{ flex: 1 }}
                    />
                    <select
                      value={editForm.medium}
                      onChange={e => setEditForm(f => ({ ...f, medium: e.target.value }))}
                      style={{ flex: 1 }}
                    >
                      {MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <textarea
                    value={editForm.notes ?? ''}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value || null }))}
                    rows={2}
                    style={{ marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit">Save</button>
                    <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                      {i.date} · <span style={{ fontWeight: 400, color: '#555' }}>{i.medium}</span>
                    </div>
                    {i.notes && <p style={{ color: '#444', whiteSpace: 'pre-wrap' }}>{i.notes}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => { setEditingId(i.id); setEditForm({ date: i.date, medium: i.medium, notes: i.notes }) }}
                      style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        await interactionsApi.delete(contact.id, i.id)
                        setInteractions(prev => prev.filter(x => x.id !== i.id))
                      }}
                      style={{ fontSize: '0.75rem', color: '#888', border: 'none', background: 'none', cursor: 'pointer', padding: '2px 6px' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>Life events</h3>
          {!showEventForm && (
            <button onClick={() => setShowEventForm(true)} style={{ fontSize: '0.875rem' }}>+ Add event</button>
          )}
        </div>

        {showEventForm && (
          <form onSubmit={async e => {
            e.preventDefault()
            const created = await lifeEventsApi.create(contact.id, newEvent)
            setLifeEvents(prev => [...prev, created].sort((a, b) =>
              (a.event_date ?? '9999') < (b.event_date ?? '9999') ? -1 : 1
            ))
            setNewEvent({ title: '', event_type: 'other' })
            setShowEventForm(false)
          }} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 3 }}>Title *</label>
                <input value={newEvent.title} onChange={e => setNewEvent(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 3 }}>Type</label>
                <select value={newEvent.event_type} onChange={e => setNewEvent(f => ({ ...f, event_type: e.target.value as EventType }))}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 3 }}>Date</label>
                <input type="date" value={newEvent.event_date ?? ''} onChange={e => setNewEvent(f => ({ ...f, event_date: e.target.value || null }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 3 }}>Remind me</label>
                <select value={newEvent.reminder_days_before?.toString() ?? ''} onChange={e => setNewEvent(f => ({ ...f, reminder_days_before: e.target.value ? parseInt(e.target.value) : null }))}>
                  {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 3 }}>Notes</label>
              <textarea rows={2} value={newEvent.notes ?? ''} onChange={e => setNewEvent(f => ({ ...f, notes: e.target.value || null }))} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', marginBottom: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={newEvent.is_recurring ?? false} onChange={e => setNewEvent(f => ({ ...f, is_recurring: e.target.checked }))} />
              Recurring annually (e.g. birthday)
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit">Save event</button>
              <button type="button" onClick={() => setShowEventForm(false)}>Cancel</button>
            </div>
          </form>
        )}

        {lifeEvents.length === 0 && !showEventForm && !contact.birthday && (
          <p style={{ color: '#888' }}>No life events yet. Add things they mention — trips, milestones, upcoming meetings.</p>
        )}

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {contact.birthday && (
            <li style={{ borderBottom: '1px solid #e5e7eb', padding: '0.75rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    Birthday
                    <span style={{ fontWeight: 400, color: '#555', fontSize: '0.875rem' }}> · birthday</span>
                    <span style={{ color: '#2563eb', fontSize: '0.75rem', marginLeft: 6 }}>↻ annual</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#555' }}>{contact.birthday}</div>
                </div>
                <button
                  onClick={async () => {
                    const updated = await contactsApi.update(contact.id, { name: contact.name, birthday: null })
                    setContact(updated)
                  }}
                  style={{ fontSize: '0.75rem', color: '#888', border: 'none', background: 'none', cursor: 'pointer', padding: '2px 6px', flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            </li>
          )}
          {lifeEvents.map(ev => (
            <li key={ev.id} style={{ borderBottom: '1px solid #e5e7eb', padding: '0.75rem 0' }}>
              {editingEventId === ev.id ? (
                <form onSubmit={async e => {
                  e.preventDefault()
                  const updated = await lifeEventsApi.update(contact.id, ev.id, editEventForm)
                  setLifeEvents(prev =>
                    prev.map(x => x.id === ev.id ? updated : x)
                      .sort((a, b) => (a.event_date ?? '9999') < (b.event_date ?? '9999') ? -1 : 1)
                  )
                  setEditingEventId(null)
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 3 }}>Title *</label>
                      <input value={editEventForm.title} onChange={e => setEditEventForm(f => ({ ...f, title: e.target.value }))} required />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 3 }}>Type</label>
                      <select value={editEventForm.event_type} onChange={e => setEditEventForm(f => ({ ...f, event_type: e.target.value as EventType }))}>
                        {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 3 }}>Date</label>
                      <input type="date" value={editEventForm.event_date ?? ''} onChange={e => setEditEventForm(f => ({ ...f, event_date: e.target.value || null }))} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: 3 }}>Remind me</label>
                      <select value={editEventForm.reminder_days_before?.toString() ?? ''} onChange={e => setEditEventForm(f => ({ ...f, reminder_days_before: e.target.value ? parseInt(e.target.value) : null }))}>
                        {REMINDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <textarea rows={2} value={editEventForm.notes ?? ''} onChange={e => setEditEventForm(f => ({ ...f, notes: e.target.value || null }))} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', marginBottom: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={editEventForm.is_recurring ?? false} onChange={e => setEditEventForm(f => ({ ...f, is_recurring: e.target.checked }))} />
                    Recurring annually
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit">Save</button>
                    <button type="button" onClick={() => setEditingEventId(null)}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                      {ev.title}
                      <span style={{ fontWeight: 400, color: '#555', fontSize: '0.875rem' }}> · {ev.event_type}</span>
                      {ev.is_recurring && <span style={{ color: '#2563eb', fontSize: '0.75rem', marginLeft: 6 }}>↻ annual</span>}
                    </div>
                    {ev.event_date && <div style={{ fontSize: '0.875rem', color: '#555' }}>{ev.event_date}{ev.reminder_days_before ? ` · remind ${ev.reminder_days_before}d before` : ''}</div>}
                    {ev.notes && <p style={{ color: '#444', fontSize: '0.875rem', whiteSpace: 'pre-wrap', marginTop: 2 }}>{ev.notes}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => {
                        setEditingEventId(ev.id)
                        setEditEventForm({ title: ev.title, event_type: ev.event_type, event_date: ev.event_date, is_recurring: ev.is_recurring, notes: ev.notes, reminder_days_before: ev.reminder_days_before })
                      }}
                      style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        await lifeEventsApi.delete(contact.id, ev.id)
                        setLifeEvents(prev => prev.filter(x => x.id !== ev.id))
                      }}
                      style={{ fontSize: '0.75rem', color: '#888', border: 'none', background: 'none', cursor: 'pointer', padding: '2px 6px' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
