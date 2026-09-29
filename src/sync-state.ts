import { emptyState, STORAGE_KEY, validateState, type StudyState } from './state'
import { parseInterviewId } from './interview'
import { validActivityDate } from './activity'

export interface SyncCell { value: string | null; clock: number; client: string }
export type SyncBucket = Record<string, SyncCell>
export interface SyncReplica { version: 1; buckets: Record<string, SyncBucket>; dirty: string[] }
export const syncPayloadLimit = 120000
const safeKey = /^[a-zA-Z0-9_:-]{1,240}$/
const bytes = (value: string) => new TextEncoder().encode(value).length

export const accountStorageKey = (uid: string | null) => uid ? `${STORAGE_KEY}:account:${encodeURIComponent(uid)}` : STORAGE_KEY
export const replicaStorageKey = (uid: string) => `${accountStorageKey(uid)}:sync`
export const emptyReplica = (): SyncReplica => ({ version: 1, buckets: {}, dirty: [] })

export function mergeBucket(left: SyncBucket, right: SyncBucket): SyncBucket {
  const result = { ...left }
  for (const [key, incoming] of Object.entries(right)) {
    const current = result[key]
    if (!current || incoming.clock > current.clock || (incoming.clock === current.clock && (incoming.client > current.client || (incoming.client === current.client && String(incoming.value) > String(current.value))))) result[key] = incoming
  }
  return result
}

export function bucketPayload(bucket: SyncBucket): string {
  const payload = JSON.stringify(Object.fromEntries(Object.keys(bucket).sort().map(key => [key, bucket[key]])))
  if (bytes(payload) > syncPayloadLimit) throw new Error('This sync record is too large. Export a local backup before continuing.')
  return payload
}

export function parseBucket(payload: unknown): SyncBucket | undefined {
  if (typeof payload !== 'string' || bytes(payload) > syncPayloadLimit) return undefined
  try {
    const value: unknown = JSON.parse(payload)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
    const result: SyncBucket = {}
    for (const [key, raw] of Object.entries(value)) {
      if (!safeKey.test(key) || key === '__proto__' || key === 'constructor' || !raw || typeof raw !== 'object') return undefined
      const cell = raw as SyncCell
      if ((cell.value !== null && typeof cell.value !== 'string') || !Number.isSafeInteger(cell.clock) || cell.clock < 0 || typeof cell.client !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(cell.client)) return undefined
      if (cell.value !== null) JSON.parse(cell.value)
      result[key] = { value: cell.value, clock: cell.clock, client: cell.client }
    }
    return result
  } catch { return undefined }
}

export function parseReplica(value: unknown): SyncReplica {
  if (!value || typeof value !== 'object') return emptyReplica()
  const source = value as Partial<SyncReplica>
  if (source.version !== 1 || !source.buckets || typeof source.buckets !== 'object' || Array.isArray(source.buckets)) return emptyReplica()
  const buckets: Record<string, SyncBucket> = {}
  for (const [id, bucket] of Object.entries(source.buckets)) {
    if (!safeKey.test(id) || id === '__proto__' || id === 'constructor') continue
    const parsed = parseBucket(JSON.stringify(bucket))
    if (parsed) buckets[id] = parsed
  }
  return { version: 1, buckets, dirty: Array.isArray(source.dirty) ? [...new Set(source.dirty.filter(id => typeof id === 'string' && Object.hasOwn(buckets, id)))] : [] }
}

function stateValues(state: StudyState): Record<string, Record<string, string>> {
  const values: Record<string, Record<string, string>> = {}
  const put = (bucket: string, key: string, value: unknown) => { (values[bucket] ??= {})[key] = JSON.stringify(value) }
  for (const key of ['theme', 'fontSize', 'lastChapter'] as const) put('preferences', key, state[key])
  for (const id of state.completed) put('progress', `completed:${id}`, true)
  for (const [date, entries] of Object.entries(state.completionHistory)) for (const id of entries) put(`activity-${date}`, id, true)
  if (state.studyTracker.startDate) put('study-tracker', 'startDate', state.studyTracker.startDate)
  for (const id of state.studyTracker.completedDays) put('study-tracker', id, true)
  for (const id of state.bookmarks) put('progress', `bookmarks:${id}`, true)
  for (const id of state.knownCards) put('progress', `knownCards:${id}`, true)
  for (const [id, value] of Object.entries(state.answers)) put('progress', `answers:${id}`, value)
  for (const [id, value] of Object.entries(state.positions)) put('progress', `positions:${id}`, value)
  for (const [id, value] of Object.entries(state.notes)) if (value.trim()) put(`chapter-${id}`, 'note', value)
  for (const note of state.notebook) put(`note-${note.id}`, 'note', note)
  for (const id of state.interviewTopics) put('selection', id, true)
  for (const [id, value] of Object.entries(state.interviewAnswers)) {
    const question = parseInterviewId(id)
    if (question) put(`interview-${question.topicId}`, id, value)
  }
  return values
}

export function recordState(replica: SyncReplica, state: StudyState, client: string, now = Date.now()): SyncReplica {
  const values = stateValues(state)
  const result: SyncReplica = { version: 1, buckets: { ...replica.buckets }, dirty: [...replica.dirty] }
  for (const bucketId of new Set([...Object.keys(replica.buckets), ...Object.keys(values)])) {
    const previous = replica.buckets[bucketId] ?? {}
    const next = { ...previous }
    let changed = false
    for (const key of new Set([...Object.keys(previous), ...Object.keys(values[bucketId] ?? {})])) {
      const value = values[bucketId]?.[key] ?? null
      if ((previous[key]?.value ?? null) === value) continue
      next[key] = { value, clock: Math.max(now, (previous[key]?.clock ?? 0) + 1), client }
      changed = true
    }
    if (changed) { bucketPayload(next); result.buckets[bucketId] = next; if (!result.dirty.includes(bucketId)) result.dirty.push(bucketId) }
  }
  return result
}

export function mergeReplica(replica: SyncReplica, id: string, incoming: SyncBucket): SyncReplica {
  return { ...replica, buckets: { ...replica.buckets, [id]: mergeBucket(replica.buckets[id] ?? {}, incoming) } }
}

export function stateFromReplica(replica: SyncReplica, ids: string[]): StudyState {
  const result = emptyState(ids[0])
  const source = result as unknown as Record<string, unknown>
  for (const [bucketId, cells] of Object.entries(replica.buckets)) {
    for (const [key, cell] of Object.entries(cells)) {
      if (cell.value === null) continue
      const value = JSON.parse(cell.value)
      if (bucketId === 'preferences' && ['theme', 'fontSize', 'lastChapter'].includes(key)) source[key] = value
      else if (bucketId === 'selection' && value === true) result.interviewTopics.push(key)
      else if (bucketId.startsWith('chapter-') && key === 'note') result.notes[bucketId.slice(8)] = value
      else if (bucketId.startsWith('note-') && key === 'note') result.notebook.push(value)
      else if (bucketId.startsWith('interview-') && parseInterviewId(key)) result.interviewAnswers[key] = value
      else if (bucketId.startsWith('activity-') && validActivityDate(bucketId.slice(9)) && value === true) (result.completionHistory[bucketId.slice(9)] ??= []).push(key)
      else if (bucketId === 'study-tracker') {
        if (key === 'startDate') result.studyTracker.startDate = value
        else if (value === true) result.studyTracker.completedDays.push(key)
      }
      else if (bucketId === 'progress') {
        const boundary = key.indexOf(':')
        const field = key.slice(0, boundary)
        const id = key.slice(boundary + 1)
        if (['completed', 'bookmarks', 'knownCards'].includes(field) && value === true) (source[field] as string[]).push(id)
        else if (['answers', 'positions'].includes(field)) (source[field] as Record<string, unknown>)[id] = value
      }
    }
  }
  return validateState(result, ids)
}