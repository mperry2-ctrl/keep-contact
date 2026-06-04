import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { dashboardApi, type OverdueContact, type UpcomingEvent } from '../api/dashboard'
import { logApi } from '../api/log'
import { todosApi, type Todo, CATEGORY_EMOJI } from '../api/todos'
import type { Contact } from '../api/contacts'
import type { EventType } from '../api/life_events'
import ContactPicker from '../components/ContactPicker'

const EVENT_EMOJI: Record<string, string> = {
  birthday: '🎂',
  trip: '✈️',
  milestone: '🏆',
  meeting: '📅',
  other: '📌',
}

const MEDIUMS = ['in-person', 'call', 'text', 'email', 'social', 'other']
const EVENT_TYPES: EventType[] = ['trip', 'milestone', 'meeting', 'other']

function daysOverdueLabel(days: number) {
  if (days === 1) return '1 day overdue'
  if (days < 7) return `${days} days overdue`
  if (days < 14) return '1 week overdue'
  const weeks = Math.floor(days / 7)
  return `${weeks} weeks overdue`
}

function daysUntilLabel(days: number) {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

type ModalTab = 'interaction' | 'event'

interface LogModalProps {
  onClose: () => void
  onLogged: () => void
}

function LogModal({ onClose, onLogged }: LogModalProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [tab, setTab] = useState<ModalTab>('interaction')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // interaction fields
  const [date, setDate] = useState(today)
  const [medium, setMedium] = useState('in-person')
  const [notes, setNotes] = useState('')

  // event fields
  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState<EventType>('other')
  const [eventDate, setEventDate] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [eventNotes, setEventNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (contacts.length === 0) { setError('Select at least one contact'); return }
    setSaving(true)
    setError(null)
    try {
      const ids = contacts.map(c => c.id)
      if (tab === 'interaction') {
        await logApi.interaction({ contact_ids: ids, date, medium, notes: notes || null })
      } else {
        await logApi.event({
          contact_ids: ids,
          title,
          event_type: eventType,
          event_date: eventDate || null,
          is_recurring: recurring,
          notes: eventNotes || null,
        })
      }
      onLogged()
      onClose()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#fff', borderRadius: 10, padding: '1.5rem',
        width: '100%', maxWidth: 520, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Log</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#6b7280', padding: '0 4px' }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: '1.25rem', borderBottom: '1px solid #e5e7eb' }}>
          {(['interaction', 'event'] as ModalTab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px 16px', fontWeight: tab === t ? 700 : 400,
                color: tab === t ? '#111' : '#6b7280',
                borderBottom: tab === t ? '2px solid #111' : '2px solid transparent',
                marginBottom: -1, textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Who</label>
            <ContactPicker
              selected={contacts}
              onChange={setContacts}
              placeholder="Search contacts…"
            />
          </div>

          {tab === 'interaction' ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>How</label>
                  <select value={medium} onChange={e => setMedium(e.target.value)} style={{ width: '100%' }}>
                    {MEDIUMS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What did you talk about?"
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: '0.75rem' }}>
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>Title *</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Type</label>
                  <select value={eventType} onChange={e => setEventType(e.target.value as EventType)} style={{ width: '100%' }}>
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>Date</label>
                <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={eventNotes}
                  onChange={e => setEventNotes(e.target.value)}
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
                Recurring annually
              </label>
            </>
          )}

          {error && <p style={{ color: '#dc2626', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: 3, color: '#444',
}

export default function Dashboard() {
  const [overdue, setOverdue] = useState<OverdueContact[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [showLogModal, setShowLogModal] = useState(false)

  function loadData() {
    return Promise.all([dashboardApi.overdue(), dashboardApi.upcoming(), todosApi.list()])
      .then(([o, u, t]) => { setOverdue(o); setUpcoming(u); setTodos(t.filter(t => !t.completed_at)) })
  }

  const handleCompleteTodo = async (id: string) => {
    await todosApi.complete(id)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  useEffect(() => {
    loadData().finally(() => setLoading(false))
  }, [])

  const handleSignOut = () => supabase.auth.signOut()

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      {showLogModal && (
        <LogModal
          onClose={() => setShowLogModal(false)}
          onLogged={loadData}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowLogModal(true)}>+ Log</button>
          <button onClick={handleSignOut}>Sign out</button>
        </div>
      </div>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>
          Reach out
          {overdue.length > 0 && <span style={{ marginLeft: 8, fontSize: '0.875rem', fontWeight: 400, color: '#dc2626' }}>{overdue.length} overdue</span>}
        </h2>
        {overdue.length === 0
          ? <p style={{ color: '#888' }}>You're all caught up. No overdue check-ins.</p>
          : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {overdue.map(c => (
                <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                  <Link to={`/contacts/${c.id}`} style={{ fontWeight: 600, textDecoration: 'none', color: '#111' }}>
                    {c.name}
                  </Link>
                  <span style={{ fontSize: '0.875rem', color: '#dc2626' }}>
                    {daysOverdueLabel(c.days_overdue)}
                    <span style={{ color: '#888', marginLeft: 8 }}>
                      (every {c.check_in_frequency_days}d
                      {c.last_interaction_date ? `, last ${c.last_interaction_date}` : ', never contacted'})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )
        }
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>
          Coming up
          <span style={{ marginLeft: 8, fontSize: '0.875rem', fontWeight: 400, color: '#888' }}>next 30 days</span>
        </h2>
        {upcoming.length === 0
          ? <p style={{ color: '#888' }}>Nothing coming up in the next 30 days.</p>
          : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {upcoming.map((ev, i) => (
                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                  <div>
                    <span style={{ marginRight: 8 }}>{EVENT_EMOJI[ev.event_type] ?? '📌'}</span>
                    <Link to={`/contacts/${ev.contact_id}`} style={{ fontWeight: 600, textDecoration: 'none', color: '#111' }}>
                      {ev.contact_name}
                    </Link>
                    <span style={{ color: '#555', marginLeft: 6 }}>— {ev.title}</span>
                    {ev.is_recurring && <span style={{ color: '#2563eb', fontSize: '0.75rem', marginLeft: 6 }}>↻</span>}
                  </div>
                  <span style={{ fontSize: '0.875rem', color: '#555' }}>
                    {daysUntilLabel(ev.days_until)}
                    <span style={{ color: '#888', marginLeft: 6 }}>{ev.event_date}</span>
                  </span>
                </li>
              ))}
            </ul>
          )
        }
      </section>

      <section>
        <h2 style={{ marginBottom: '1rem' }}>
          To-Do
          {todos.length > 0 && <span style={{ marginLeft: 8, fontSize: '0.875rem', fontWeight: 400, color: '#888' }}>{todos.length} open</span>}
        </h2>
        {todos.length === 0
          ? <p style={{ color: '#888' }}>No open to-dos. <Link to="/todos">Add one →</Link></p>
          : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {todos.map(todo => (
                <li key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0', borderBottom: '1px solid #e5e7eb' }}>
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => handleCompleteTodo(todo.id)}
                    style={{ flexShrink: 0, cursor: 'pointer' }}
                  />
                  <span style={{ flex: 1 }}>
                    {CATEGORY_EMOJI[todo.category]} {todo.description}
                  </span>
                  {todo.due_date && (
                    <span style={{ fontSize: '0.8rem', color: '#888' }}>Due {todo.due_date}</span>
                  )}
                  <Link to="/todos" style={{ fontSize: '0.8rem', color: '#888' }}>Edit</Link>
                </li>
              ))}
            </ul>
          )
        }
      </section>
    </div>
  )
}
