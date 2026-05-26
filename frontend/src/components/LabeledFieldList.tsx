export interface LabeledEntry {
  value: string
  label: string
}

interface LabeledFieldListProps {
  heading: string
  entries: LabeledEntry[]
  valuePlaceholder: string
  labelOptions: string[]
  onChange: (entries: LabeledEntry[]) => void
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: '0.875rem',
  marginBottom: 6,
}

export function LabeledFieldList({ heading, entries, valuePlaceholder, labelOptions, onChange }: LabeledFieldListProps) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={labelStyle}>{heading}</label>
      {entries.map((entry, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <select
            value={entry.label}
            onChange={e => {
              const next = [...entries]
              next[i] = { ...next[i], label: e.target.value }
              onChange(next)
            }}
            style={{ width: 105, flexShrink: 0 }}
          >
            {labelOptions.map(l => (
              <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>
          <input
            value={entry.value}
            placeholder={valuePlaceholder}
            onChange={e => {
              const next = [...entries]
              next[i] = { ...next[i], value: e.target.value }
              onChange(next)
            }}
            style={{ flex: 1 }}
          />
          {entries.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(entries.filter((_, idx) => idx !== i))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: '0 6px', fontSize: '1rem' }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...entries, { value: '', label: labelOptions[0] }])}
        style={{ fontSize: '0.8rem', color: '#555', background: 'none', border: '1px dashed #ccc', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', marginTop: 2 }}
      >
        + Add {heading.toLowerCase()}
      </button>
    </div>
  )
}
