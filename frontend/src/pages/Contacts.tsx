import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { contactsApi, type Contact } from '../api/contacts'

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    contactsApi.list()
      .then(setContacts)
      .catch(() => setError('Failed to load contacts'))
      .finally(() => setLoading(false))
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? contacts.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.general_notes?.toLowerCase().includes(q) ||
        c.tags?.some(t => t.toLowerCase().includes(q))
      )
    : contacts

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Contacts</h1>
        <Link to="/contacts/new">
          <button>+ Add contact</button>
        </Link>
      </div>

      <input
        type="search"
        placeholder="Search by name, company, tags, or notes…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width: '100%', marginBottom: '1.5rem', padding: '0.5rem 0.75rem', fontSize: '1rem', boxSizing: 'border-box' }}
      />

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && filtered.length === 0 && (
        <p style={{ color: '#666' }}>
          {q ? `No contacts match "${query}".` : 'No contacts yet. Add your first one.'}
        </p>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {filtered.map(contact => (
          <li key={contact.id} style={{ borderBottom: '1px solid #eee', padding: '0.75rem 0' }}>
            <Link to={`/contacts/${contact.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ fontWeight: 600 }}>{contact.name}</div>
              {(contact.job_title || contact.company) && (
                <div style={{ fontSize: '0.875rem', color: '#666' }}>
                  {[contact.job_title, contact.company].filter(Boolean).join(' · ')}
                </div>
              )}
              {contact.tags && contact.tags.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 2 }}>
                  {contact.tags.join(', ')}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
