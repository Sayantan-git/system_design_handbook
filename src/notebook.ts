export interface NotebookNote {
  id: string
  entryId: string | null
  heading: string
  text: string
  createdAt: number
  updatedAt: number
}

export function createNotebookNote(text: string, entryId: string | null, heading: string, id: string = crypto.randomUUID(), now = Date.now()): NotebookNote {
  const content = text.replace(/\r\n?/g, '\n').trim()
  if (!content) throw new Error('Select some text to add to your notes.')
  if (content.length > 20000) throw new Error('Select a shorter passage, up to 20,000 characters.')
  return { id, entryId, heading: heading.trim().slice(0, 240) || 'General notes', text: content, createdAt: now, updatedAt: now }
}

export function validateNotebook(value: unknown, entryIds: string[]): NotebookNote[] {
  if (!Array.isArray(value)) return []
  const allowed = new Set(entryIds)
  const result = new Map<string, NotebookNote>()
  for (const item of value.slice(0, 1000)) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)) continue
    if (item.entryId !== null && !allowed.has(item.entryId)) continue
    if (typeof item.heading !== 'string' || typeof item.text !== 'string') continue
    if (!Number.isFinite(item.createdAt) || item.createdAt < 0 || !Number.isFinite(item.updatedAt) || item.updatedAt < 0) continue
    result.set(item.id, { id: item.id, entryId: item.entryId, heading: item.heading.slice(0, 240), text: item.text.slice(0, 20000), createdAt: item.createdAt, updatedAt: item.updatedAt })
  }
  return [...result.values()]
}

export function groupNotebook(notes: NotebookNote[]): { heading: string; notes: NotebookNote[] }[] {
  const groups = new Map<string, NotebookNote[]>()
  for (const note of [...notes].sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id))) {
    groups.set(note.heading, [...(groups.get(note.heading) ?? []), note])
  }
  return [...groups].map(([heading, notes]) => ({ heading, notes }))
}