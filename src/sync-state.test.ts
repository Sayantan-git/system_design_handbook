import { describe, expect, it } from 'vitest'
import { emptyState, STORAGE_KEY } from './state'
import { interviewQuestion, interviewTopics } from './interview'
import { createNotebookNote } from './notebook'
import { emptyStudyTracker, studyDayIds } from './study-tracker'
import { accountStorageKey, bucketPayload, emptyReplica, mergeBucket, mergeReplica, parseBucket, parseReplica, recordState, replicaStorageKey, stateFromReplica, syncPayloadLimit } from './sync-state'

describe('account-scoped sync records', () => {
  const ids = ['chapter-one', 'chapter-two']
  it('round-trips notes, progress, preferences and interview answers without unrelated data', () => {
    const state = emptyState(ids[0])
    state.bookmarks = [ids[1]]
    state.completed = [ids[0]]
    state.notes[ids[0]] = 'My chapter note'
    state.notebook = [createNotebookNote('A saved passage', ids[1], 'A topic', 'passage', 100)]
    state.answers.q1 = 2
    state.positions[ids[1]] = 0.4
    state.interviewTopics = [interviewTopics[0].id]
    state.interviewAnswers[interviewQuestion(interviewTopics[0].id, 1).id] = { selected: 2, revealed: false, updatedAt: 100 }
    const replica = recordState(emptyReplica(), state, 'device-a', 100)
    expect(stateFromReplica(replica, ids)).toEqual(state)
    expect(recordState({ ...replica, dirty: [] }, state, 'device-a', 200).dirty).toEqual([])
    expect(parseReplica(JSON.parse(JSON.stringify(replica)))).toEqual(replica)
    const draft = { ...state, notebook: [{ ...state.notebook[0], text: '' }] }
    expect(stateFromReplica(recordState(replica, draft, 'device-a', 300), ids).notebook).toEqual(draft.notebook)
  })
  it('propagates deletions without resurrecting old notes or bookmarks', () => {
    const state = emptyState(ids[0])
    state.bookmarks = [ids[0]]
    state.notebook = [createNotebookNote('Remove this', ids[0], 'Topic', 'passage', 100)]
    const original = recordState(emptyReplica(), state, 'device-a', 100)
    const removed = recordState(original, emptyState(ids[0]), 'device-a', 200)
    let recovered = original
    for (const [key, value] of Object.entries(removed.buckets)) recovered = mergeReplica(recovered, key, value)
    for (const [key, value] of Object.entries(original.buckets)) recovered = mergeReplica(recovered, key, value)
    expect(stateFromReplica(recovered, ids).notebook).toEqual([])
    expect(stateFromReplica(recovered, ids).bookmarks).toEqual([])
    expect(recovered.buckets['note-passage'].note.value).toBeNull()
  })
  it('merges independent answers and resolves competing edits deterministically', () => {
    const state = emptyState(ids[0])
    const base = recordState(emptyReplica(), state, 'device-a', 100)
    const first = interviewQuestion(interviewTopics[0].id, 1).id
    const second = interviewQuestion(interviewTopics[0].id, 2).id
    const left = recordState(base, { ...state, interviewAnswers: { [first]: { selected: 1, revealed: false, updatedAt: 200 } } }, 'device-a', 200)
    const right = recordState(base, { ...state, interviewAnswers: { [second]: { selected: 3, revealed: false, updatedAt: 200 } } }, 'device-b', 200)
    const bucket = `interview-${interviewTopics[0].id}`
    expect(Object.keys(stateFromReplica(mergeReplica(left, bucket, right.buckets[bucket]), ids).interviewAnswers)).toEqual([first, second])
    const earlier = { note: { value: '"older"', clock: 200, client: 'device-a' } }
    const later = { note: { value: '"newer"', clock: 200, client: 'device-b' } }
    expect(mergeBucket(earlier, later)).toEqual(mergeBucket(later, earlier))
    expect(mergeBucket(earlier, later).note.value).toBe('"newer"')
  })
  it('keeps long Unicode notes well below the Firestore document limit', () => {
    const state = emptyState(ids[0])
    state.notebook = Array.from({ length: 20 }, (_, index) => createNotebookNote('\u4e00'.repeat(20000), ids[0], 'Large note', `note-${index}`, 100))
    const replica = recordState(emptyReplica(), state, 'device-a', 100)
    expect(Object.keys(replica.buckets)).toHaveLength(21)
    for (const bucket of Object.values(replica.buckets)) expect(new TextEncoder().encode(bucketPayload(bucket)).length).toBeLessThan(syncPayloadLimit)
  })
  it('merges same-day chapter activity and propagates an undone completion', () => {
    const state = emptyState(ids[0])
    const left = recordState(emptyReplica(), { ...state, completionHistory: { '2026-09-28': [ids[0]] } }, 'device-a', 100)
    const right = recordState(emptyReplica(), { ...state, completionHistory: { '2026-09-28': [ids[1]] } }, 'device-b', 100)
    const key = 'activity-2026-09-28'
    const merged = mergeReplica(left, key, right.buckets[key])
    expect(stateFromReplica(merged, ids).completionHistory).toEqual({ '2026-09-28': ids })
    const undone = recordState(merged, { ...state, completionHistory: { '2026-09-28': [ids[1]] } }, 'device-a', 200)
    expect(stateFromReplica(mergeReplica(merged, key, undone.buckets[key]), ids).completionHistory).toEqual({ '2026-09-28': [ids[1]] })
    expect(undone.buckets[key][ids[0]].value).toBeNull()
    expect(new TextEncoder().encode(bucketPayload(undone.buckets[key])).length).toBeLessThan(syncPayloadLimit)
  })
  it('rejects malformed records and separates guest and account caches', () => {
    expect(parseBucket('{"note":{"value":"not json","clock":1,"client":"device"}}')).toBeUndefined()
    expect(parseBucket('{"__proto__":{}}')).toBeUndefined()
    expect(parseBucket('x'.repeat(syncPayloadLimit + 1))).toBeUndefined()
    expect(parseReplica({ version: 7 })).toEqual(emptyReplica())
    expect(accountStorageKey(null)).toBe(STORAGE_KEY)
    expect(accountStorageKey('account-a')).not.toBe(accountStorageKey('account-b'))
    expect(replicaStorageKey('account-a')).not.toBe(accountStorageKey('account-a'))
  })
  it('merges independent tracker days and syncs unchecked days and a cleared start date', () => {
    const state = emptyState(ids[0])
    const left = recordState(emptyReplica(), { ...state, studyTracker: { startDate: '2026-09-29', completedDays: [studyDayIds[0]] } }, 'device-a', 100)
    const right = recordState(emptyReplica(), { ...state, studyTracker: { startDate: null, completedDays: [studyDayIds[1]] } }, 'device-b', 100)
    const merged = mergeReplica(left, 'study-tracker', right.buckets['study-tracker'])
    expect(stateFromReplica(merged, ids).studyTracker).toEqual({ startDate: '2026-09-29', completedDays: studyDayIds.slice(0, 2) })
    const unmarked = recordState(merged, { ...state, studyTracker: { startDate: null, completedDays: [studyDayIds[1]] } }, 'device-a', 200)
    const recovered = mergeReplica(unmarked, 'study-tracker', left.buckets['study-tracker'])
    expect(stateFromReplica(recovered, ids).studyTracker).toEqual({ startDate: null, completedDays: [studyDayIds[1]] })
    expect(recovered.buckets['study-tracker'][studyDayIds[0]].value).toBeNull()
    expect(recovered.buckets['study-tracker'].startDate.value).toBeNull()
    expect(stateFromReplica(recordState(recovered, state, 'device-a', 300), ids).studyTracker).toEqual(emptyStudyTracker())
    expect(stateFromReplica(recovered, ids).completed).toEqual([])
    expect(bucketPayload(recovered.buckets['study-tracker']).length).toBeLessThan(syncPayloadLimit)
  })
})