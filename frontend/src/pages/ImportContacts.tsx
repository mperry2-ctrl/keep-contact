import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { importApi, type ImportContactPreview, type ImportAction } from '../api/import'

type DupAction = 'merge' | 'import-new'

interface Row {
  contact: ImportContactPreview
  selected: boolean
  dupAction: DupAction
}

type Stage = 'source' | 'loading' | 'preview' | 'confirming' | 'done'

interface Result {
  imported: number
  merged: number
  skipped: number
}

function buildRows(contacts: ImportContactPreview[]): Row[] {
  return contacts.map(c => ({
    contact: c,
    selected: c.duplicate_of === null,
    dupAction: 'merge',
  }))
}

export default function ImportContacts() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [stage, setStage] = useState<Stage>('source')
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    const errParam = searchParams.get('error')

    if (errParam) {
      setError('Google authorization failed. Please try again.')
      setSearchParams({}, { replace: true })
      return
    }

    if (sessionId) {
      setStage('loading')
      setSearchParams({}, { replace: true })
      importApi.getGoogleContacts(sessionId)
        .then(contacts => {
          setRows(buildRows(contacts))
          setStage('preview')
        })
        .catch(() => {
          setError('Failed to load contacts from Google. The session may have expired.')
          setStage('source')
        })
    }
  }, [])

  async function handleGoogleClick() {
    setError(null)
    try {
      const { url } = await importApi.getGoogleAuthUrl()
      window.location.href = url
    } catch {
      setError('Could not start Google authorization. Please try again.')
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setStage('loading')
    try {
      const contacts = await importApi.uploadVcf(file)
      setRows(buildRows(contacts))
      setStage('preview')
    } catch {
      setError('Could not parse the file. Make sure it is a valid .vcf file.')
      setStage('source')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // --- Bulk actions ---

  function selectAll() { setRows(r => r.map(x => ({ ...x, selected: true }))) }
  function deselectAll() { setRows(r => r.map(x => ({ ...x, selected: false }))) }
  function skipAllDups() { setRows(r => r.map(x => x.contact.duplicate_of ? { ...x, selected: false } : x)) }
  function mergeAllDups() { setRows(r => r.map(x => x.contact.duplicate_of ? { ...x, selected: true, dupAction: 'merge' } : x)) }

  function toggleRow(i: number) {
    setRows(r => r.map((x, idx) => idx === i ? { ...x, selected: !x.selected } : x))
  }
  function setDupAction(i: number, dupAction: DupAction) {
    setRows(r => r.map((x, idx) => idx === i ? { ...x, dupAction } : x))
  }

  // --- Confirm ---

  async function handleConfirm() {
    setStage('confirming')
    setError(null)

    const items = rows.map(r => {
      if (!r.selected) {
        return { contact: r.contact, action: 'skip' as ImportAction, merge_into: null }
      }
      if (!r.contact.duplicate_of) {
        return { contact: r.contact, action: 'import' as ImportAction, merge_into: null }
      }
      if (r.dupAction === 'merge') {
        return { contact: r.contact, action: 'merge' as ImportAction, merge_into: r.contact.duplicate_of }
      }
      return { contact: r.contact, action: 'import' as ImportAction, merge_into: null }
    })

    try {
      const res = await importApi.confirm(items)
      setResult(res)
      setStage('done')
    } catch {
      setError('Import failed. Please try again.')
      setStage('preview')
    }
  }

  // --- Derived counts ---
  const newCount = rows.filter(r => !r.contact.duplicate_of).length
  const dupCount = rows.filter(r => !!r.contact.duplicate_of).length
  const realActionCount = rows.filter(r => {
    if (!r.selected) return false
    if (r.contact.duplicate_of && r.dupAction === 'merge') return true
    if (!r.contact.duplicate_of) return true
    if (r.contact.duplicate_of && r.dupAction === 'import-new') return true
    return false
  }).length

  // --- Render ---

  if (stage === 'done' && result) {
    return (
      <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Import complete</h1>
        <p style={{ color: '#555', marginBottom: '2rem' }}>
          {result.imported > 0 && <span>{result.imported} contact{result.imported !== 1 ? 's' : ''} added. </span>}
          {result.merged > 0 && <span>{result.merged} merged. </span>}
          {result.skipped > 0 && <span>{result.skipped} skipped.</span>}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button onClick={() => navigate('/contacts')}>View contacts</button>
          <button
            onClick={() => { setStage('source'); setRows([]); setResult(null); setError(null) }}
            style={{ background: 'none', border: '1px solid #ccc', cursor: 'pointer', padding: '0.5rem 1rem' }}
          >
            Import more
          </button>
        </div>
      </div>
    )
  }

  if (stage === 'loading') {
    return (
      <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: '#555' }}>Loading contacts…</p>
      </div>
    )
  }

  if (stage === 'confirming') {
    return (
      <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: '#555' }}>Importing…</p>
      </div>
    )
  }

  if (stage === 'source') {
    return (
      <div style={{ padding: '2rem', maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Import contacts</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          Pull contacts from Google or upload a .vcf file exported from any contacts app.
        </p>

        {error && (
          <p style={{ color: '#c00', marginBottom: '1.5rem', padding: '0.75rem', background: '#fff0f0', borderRadius: 4 }}>
            {error}
          </p>
        )}

        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1.5rem', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem' }}>Google Contacts</h3>
          <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.875rem' }}>
            One-click import via Google OAuth. No file export needed.
          </p>
          <button onClick={handleGoogleClick} style={{ padding: '0.5rem 1.25rem' }}>
            Connect Google Contacts
          </button>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.5rem' }}>Upload .vcf file</h3>
          <p style={{ margin: '0 0 1rem', color: '#666', fontSize: '0.875rem' }}>
            Export from Apple Contacts, Google Contacts, or Outlook, then upload here.
          </p>
          <button onClick={() => fileInputRef.current?.click()} style={{ padding: '0.5rem 1.25rem' }}>
            Choose file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".vcf,text/vcard"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    )
  }

  // Preview stage
  return (
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.25rem' }}>Review contacts</h1>
          <p style={{ margin: 0, color: '#666', fontSize: '0.875rem' }}>
            {rows.length} found · {newCount} new · {dupCount} duplicate{dupCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleConfirm}
          disabled={realActionCount === 0}
          style={{ padding: '0.5rem 1.25rem', opacity: realActionCount === 0 ? 0.5 : 1 }}
        >
          Import {realActionCount > 0 ? `${realActionCount} selected` : ''}
        </button>
      </div>

      {error && (
        <p style={{ color: '#c00', marginBottom: '1rem', padding: '0.75rem', background: '#fff0f0', borderRadius: 4 }}>
          {error}
        </p>
      )}

      {/* Bulk actions */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', padding: '0.75rem', background: '#f9f9f9', borderRadius: 6 }}>
        <span style={{ fontSize: '0.8rem', color: '#888', alignSelf: 'center', marginRight: 4 }}>Bulk:</span>
        <button onClick={selectAll} style={smallBtn}>Select all</button>
        <button onClick={deselectAll} style={smallBtn}>Deselect all</button>
        {dupCount > 0 && (
          <>
            <span style={{ color: '#ccc', alignSelf: 'center' }}>|</span>
            <button onClick={skipAllDups} style={smallBtn}>Skip all duplicates</button>
            <button onClick={mergeAllDups} style={smallBtn}>Merge all duplicates</button>
          </>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={th}></th>
              <th style={th}>Name</th>
              <th style={th}>Phone / Email</th>
              <th style={th}>Company</th>
              <th style={th}>Tags</th>
              <th style={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isDup = !!row.contact.duplicate_of
              return (
                <tr
                  key={i}
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    background: isDup ? '#fffbf0' : 'transparent',
                    opacity: !row.selected ? 0.45 : 1,
                  }}
                >
                  <td style={{ ...td, width: 32 }}>
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => toggleRow(i)}
                    />
                  </td>
                  <td style={td}>
                    <div style={{ fontWeight: 500 }}>{row.contact.name}</div>
                    {row.contact.nickname && (
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>{row.contact.nickname}</div>
                    )}
                  </td>
                  <td style={td}>
                    {row.contact.phone && <div>{row.contact.phone}</div>}
                    {row.contact.email && (
                      <div style={{ color: '#555', fontSize: '0.8rem' }}>{row.contact.email}</div>
                    )}
                  </td>
                  <td style={td}>
                    {row.contact.job_title || row.contact.company
                      ? [row.contact.job_title, row.contact.company].filter(Boolean).join(' · ')
                      : <span style={{ color: '#ccc' }}>—</span>}
                  </td>
                  <td style={td}>
                    {row.contact.tags?.length
                      ? row.contact.tags.join(', ')
                      : <span style={{ color: '#ccc' }}>—</span>}
                  </td>
                  <td style={td}>
                    {isDup ? (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#a66', marginBottom: 4 }}>
                          Duplicate of <strong>{row.contact.duplicate_name}</strong>
                        </div>
                        <select
                          value={row.dupAction}
                          onChange={e => setDupAction(i, e.target.value as DupAction)}
                          style={{ fontSize: '0.8rem', padding: '2px 4px' }}
                        >
                          <option value="merge">Merge with existing</option>
                          <option value="import-new">Import as new</option>
                        </select>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#393' }}>New</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => { setStage('source'); setRows([]); setError(null) }}
          style={{ background: 'none', border: '1px solid #ccc', cursor: 'pointer', padding: '0.4rem 1rem', fontSize: '0.875rem' }}
        >
          ← Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={realActionCount === 0}
          style={{ padding: '0.5rem 1.25rem', opacity: realActionCount === 0 ? 0.5 : 1 }}
        >
          Import {realActionCount > 0 ? `${realActionCount} selected` : ''}
        </button>
      </div>
    </div>
  )
}

const smallBtn: React.CSSProperties = {
  fontSize: '0.8rem',
  padding: '0.25rem 0.6rem',
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 4,
  cursor: 'pointer',
}

const th: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  fontWeight: 600,
  fontSize: '0.8rem',
  color: '#555',
  whiteSpace: 'nowrap',
}

const td: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  verticalAlign: 'top',
}
