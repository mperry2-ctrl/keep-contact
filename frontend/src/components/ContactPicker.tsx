import { useEffect, useRef, useState } from 'react'
import { contactsApi, type Contact } from '../api/contacts'

interface Props {
  selected: Contact[]
  onChange: (contacts: Contact[]) => void
  exclude?: string[]  // contact IDs to hide from results
  placeholder?: string
}

export default function ContactPicker({ selected, onChange, exclude = [], placeholder = 'Search contacts…' }: Props) {
  const [all, setAll] = useState<Contact[]>([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    contactsApi.list().then(setAll)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedIds = new Set(selected.map(c => c.id))
  const excludedIds = new Set(exclude)

  const filtered = all.filter(c =>
    !selectedIds.has(c.id) &&
    !excludedIds.has(c.id) &&
    (c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.company ?? '').toLowerCase().includes(query.toLowerCase()))
  )

  function pick(contact: Contact) {
    onChange([...selected, contact])
    setQuery('')
    inputRef.current?.focus()
  }

  function remove(id: string) {
    onChange(selected.filter(c => c.id !== id))
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
        border: '1px solid #d1d5db', borderRadius: 4, padding: '4px 6px',
        background: '#fff', minHeight: 34,
      }}>
        {selected.map(c => (
          <span key={c.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#eff6ff', color: '#1d4ed8', borderRadius: 4,
            padding: '2px 6px', fontSize: '0.8rem',
          }}>
            {c.name}
            <button
              type="button"
              onClick={() => remove(c.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 0, lineHeight: 1, fontSize: '0.9rem' }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? placeholder : ''}
          style={{ border: 'none', outline: 'none', flex: 1, minWidth: 120, fontSize: '0.875rem', padding: '2px 0' }}
        />
      </div>
      {open && filtered.length > 0 && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #d1d5db', borderRadius: 4,
          margin: 0, padding: 0, listStyle: 'none',
          maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          {filtered.map(c => (
            <li
              key={c.id}
              onMouseDown={e => { e.preventDefault(); pick(c) }}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.875rem' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontWeight: 600 }}>{c.name}</span>
              {c.company && <span style={{ color: '#6b7280', marginLeft: 6 }}>{c.company}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
