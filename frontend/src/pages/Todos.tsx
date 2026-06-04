import { useEffect, useState } from 'react'
import { todosApi, type Todo, type TodoCategory, type TodoPayload, CATEGORY_LABEL, CATEGORY_EMOJI } from '../api/todos'

const CATEGORIES: TodoCategory[] = ['priority', 'need_to_do', 'wishlist']

function timeAgo(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return '1 week ago'
  if (weeks < 4) return `${weeks} weeks ago`
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month ago'
  return `${months} months ago`
}

const BLANK: TodoPayload = { description: '', category: 'need_to_do', due_date: null }

export default function Todos() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<TodoPayload>(BLANK)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  const load = () => todosApi.list().then(setTodos).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const incomplete = todos.filter(t => !t.completed_at)
  const completed = todos.filter(t => t.completed_at)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await todosApi.update(editingId, form)
      } else {
        await todosApi.create(form)
      }
      setForm(BLANK)
      setShowForm(false)
      setEditingId(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (todo: Todo) => {
    setEditingId(todo.id)
    setForm({ description: todo.description, category: todo.category, due_date: todo.due_date })
    setShowForm(true)
  }

  const handleComplete = async (id: string) => {
    await todosApi.complete(id)
    await load()
  }

  const handleDelete = async (id: string) => {
    await todosApi.del(id)
    await load()
  }

  const handleCancel = () => {
    setForm(BLANK)
    setShowForm(false)
    setEditingId(null)
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading…</div>

  return (
    <div style={{ padding: '2rem', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>To-Do</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)}>+ Add To-Do</button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: '1rem', borderRadius: 8, marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            autoFocus
            placeholder="Description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            style={{ width: '100%' }}
            required
          />
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as TodoCategory }))}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </select>
            <input
              type="date"
              value={form.due_date ?? ''}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value || null }))}
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add'}</button>
            <button type="button" onClick={handleCancel}>Cancel</button>
          </div>
        </form>
      )}

      {incomplete.length === 0 && !showForm && (
        <p style={{ color: '#888' }}>No open to-dos. Click "Add To-Do" to get started.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {incomplete.map(todo => (
          <TodoRow
            key={todo.id}
            todo={todo}
            onComplete={handleComplete}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {completed.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <button
            onClick={() => setShowCompleted(s => !s)}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0, fontSize: '0.875rem' }}
          >
            {showCompleted ? '▾' : '▸'} Completed ({completed.length})
          </button>
          {showCompleted && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.6 }}>
              {completed.map(todo => (
                <div key={todo.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.875rem', textDecoration: 'line-through', color: '#555' }}>
                  <span>✓</span>
                  <span>{CATEGORY_EMOJI[todo.category]} {todo.description}</span>
                  {todo.due_date && <span style={{ color: '#999' }}>· {todo.due_date}</span>}
                  <button onClick={() => handleDelete(todo.id)} style={{ marginLeft: 'auto', color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface TodoRowProps {
  todo: Todo
  onComplete: (id: string) => void
  onEdit: (todo: Todo) => void
  onDelete: (id: string) => void
}

function TodoRow({ todo, onComplete, onEdit, onDelete }: TodoRowProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', borderRadius: 6, border: '1px solid #eee', background: '#fff' }}>
      <input
        type="checkbox"
        checked={false}
        onChange={() => onComplete(todo.id)}
        style={{ flexShrink: 0, cursor: 'pointer' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 500 }}>{CATEGORY_EMOJI[todo.category]} {todo.description}</span>
        <span style={{ marginLeft: '0.5rem', color: '#888', fontSize: '0.8rem' }}>
          {todo.due_date && `· Due ${todo.due_date} `}· created {timeAgo(todo.created_at)}
        </span>
      </div>
      <button onClick={() => onEdit(todo)} style={{ color: '#555', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
      <button onClick={() => onDelete(todo.id)} style={{ color: '#aaa', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
    </div>
  )
}
