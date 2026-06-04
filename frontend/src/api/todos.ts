import { api } from './client'

export type TodoCategory = 'priority' | 'need_to_do' | 'wishlist'

export interface Todo {
  id: string
  description: string
  category: TodoCategory
  due_date: string | null
  completed_at: string | null
  created_at: string
}

export interface TodoPayload {
  description: string
  category?: TodoCategory
  due_date?: string | null
}

export const CATEGORY_LABEL: Record<TodoCategory, string> = {
  priority: '⚡ Priority',
  need_to_do: '📌 To Do',
  wishlist: '💭 Wishlist',
}

export const CATEGORY_EMOJI: Record<TodoCategory, string> = {
  priority: '⚡',
  need_to_do: '📌',
  wishlist: '💭',
}

export const todosApi = {
  list: () => api.get<Todo[]>('/todos/'),
  create: (body: TodoPayload) => api.post<Todo>('/todos/', body),
  update: (id: string, body: Partial<TodoPayload>) => api.put<Todo>(`/todos/${id}`, body),
  complete: (id: string) => api.post<Todo>(`/todos/${id}/complete`, {}),
  uncomplete: (id: string) => api.post<Todo>(`/todos/${id}/uncomplete`, {}),
  del: (id: string) => api.del(`/todos/${id}`),
}
