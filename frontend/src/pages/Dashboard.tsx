import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { dashboardApi, type OverdueContact, type UpcomingEvent } from '../api/dashboard'

const EVENT_EMOJI: Record<string, string> = {
  birthday: '🎂',
  trip: '✈️',
  milestone: '🏆',
  meeting: '📅',
  other: '📌',
}

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

export default function Dashboard() {
  const [overdue, setOverdue] = useState<OverdueContact[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([dashboardApi.overdue(), dashboardApi.upcoming()])
      .then(([o, u]) => { setOverdue(o); setUpcoming(u) })
      .finally(() => setLoading(false))
  }, [])

  const handleSignOut = () => supabase.auth.signOut()

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <button onClick={handleSignOut}>Sign out</button>
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

      <section>
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
    </div>
  )
}
