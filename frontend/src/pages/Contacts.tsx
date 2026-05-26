import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { contactsApi, type Contact } from '../api/contacts'

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

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

  function enterSelectMode() {
    setSelecting(true)
    setSelected(new Set())
  }

  function exitSelectMode() {
    setSelecting(false)
    setSelected(new Set())
  }

  function toggleContact(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(filtered.map(c => c.id)))
  }

  function deselectAll() {
    setSelected(new Set())
  }

  async function deleteSelected() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} contact${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    setDeleting(true)
    await Promise.all([...selected].map(id => contactsApi.delete(id)))
    setContacts(prev => prev.filter(c => !selected.has(c.id)))
    setDeleting(false)
    exitSelectMode()
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      {!selecting ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0 }}>Contacts</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={enterSelectMode} style={{ background: 'none', border: '1px solid #ccc', cursor: 'pointer', padding: '0.4rem 0.9rem' }}>
              Select
            </button>
            <Link to="/contacts/new"><button>+ Add contact</button></Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>{selected.size} selected</span>
            <button onClick={selectAll} style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem', background: '#fff', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}>
              Select all {filtered.length}
            </button>
            <button onClick={deselectAll} style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem', background: '#fff', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer' }}>
              Deselect all
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={deleteSelected}
              disabled={selected.size === 0 || deleting}
              style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, padding: '0.4rem 0.9rem', cursor: selected.size === 0 ? 'default' : 'pointer', opacity: selected.size === 0 ? 0.4 : 1 }}
            >
              {deleting ? 'Deleting…' : `Delete ${selected.size > 0 ? selected.size : ''}`}
            </button>
            <button onClick={exitSelectMode} style={{ background: 'none', border: '1px solid #ccc', cursor: 'pointer', padding: '0.4rem 0.9rem' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

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
          <li
            key={contact.id}
            style={{ borderBottom: '1px solid #eee', padding: '0.75rem 0', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            {selecting && (
              <input
                type="checkbox"
                checked={selected.has(contact.id)}
                onChange={() => toggleContact(contact.id)}
                style={{ flexShrink: 0, width: 16, height: 16, cursor: 'pointer' }}
              />
            )}
            {selecting ? (
              <div
                onClick={() => toggleContact(contact.id)}
                style={{ flex: 1, cursor: 'pointer', opacity: selected.has(contact.id) ? 0.5 : 1 }}
              >
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
              </div>
            ) : (
              <Link to={`/contacts/${contact.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
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
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
