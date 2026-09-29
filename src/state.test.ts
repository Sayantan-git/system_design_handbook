import { describe, expect, it } from 'vitest'
import { emptyState, loadState, mergeState, saveState, toggleItem, validateState } from './state'
import { emptyStudyTracker, studyDayIds } from './study-tracker'

const ids = ['chapter-one', 'chapter-two']
describe('portable browser progress', () => {
  it('starts in dark mode and keeps a saved explicit light preference', () => {
    expect(emptyState(ids[0]).theme).toBe('dark')
    expect(loadState({ getItem: () => null }, ids).state.theme).toBe('dark')
    expect(validateState({ version: 1 }, ids).theme).toBe('dark')
    expect(validateState({ version: 1, theme: 'invalid' }, ids).theme).toBe('dark')
    expect(loadState({ getItem: () => JSON.stringify({ ...emptyState(ids[0]), theme: 'light' }) }, ids).state.theme).toBe('light')
  })
  it('round-trips notes, bookmarks, completion, and review answers', () => {
    const state = { ...emptyState(ids[0]), completed: [ids[0]], bookmarks: [ids[1]], notes: { [ids[0]]: 'A timeout is uncertain.' }, answers: { q1: 2 } }
    expect(validateState(JSON.parse(JSON.stringify(state)), ids)).toEqual(state)
  })
  it('preserves old progress and new topic reviews without accepting unknown identities', () => {
    const state = validateState({ ...emptyState(ids[0]), completed: [ids[0]], notes: { [ids[0]]: 'Keep this note.' }, answers: { q1: 1, q48: 3, q49: 0, q58: 2, q59: 1 }, knownCards: [ids[0], 'q48', 'q48', 'q49', 'q58', 'q59', 'q1'] }, ids)
    expect(state.completed).toEqual([ids[0]])
    expect(state.notes[ids[0]]).toBe('Keep this note.')
    expect(state.answers).toEqual({ q1: 1, q48: 3, q49: 0, q58: 2 })
    expect(state.knownCards).toEqual([ids[0], 'q48', 'q49', 'q58'])
    expect(validateState(JSON.parse(JSON.stringify(state)), ids)).toEqual(state)
  })
  it('rejects unsupported imports and ignores unsafe or unknown keys', () => {
    expect(() => validateState({ version: 9 }, ids)).toThrow()
    const input = JSON.parse('{"version":1,"completed":["chapter-one","chapter-one","missing"],"notes":{"__proto__":"unsafe","chapter-one":"note"},"answers":{"q1":4,"q2":1},"fontSize":99}')
    const state = validateState(input, ids)
    expect(state.completed).toEqual([ids[0]])
    expect(Object.keys(state.notes)).toEqual([ids[0]])
    expect(state.answers).toEqual({ q2: 1 })
    expect(state.fontSize).toBe(18)
  })
  it('does not crash when browser storage is unavailable or corrupt', () => {
    expect(loadState({ getItem: () => '{broken' }, ids).warning).toBe(true)
    expect(loadState({ getItem: () => { throw new Error('blocked') } }, ids).state).toEqual(emptyState(ids[0]))
    expect(saveState({ setItem: () => { throw new Error('full') } }, emptyState(ids[0]))).toBe(false)
  })
  it('merges imported progress without removing existing completed chapters', () => {
    const current = { ...emptyState(ids[0]), completed: [ids[0]], notes: { [ids[0]]: 'Keep me' } }
    const incoming = { ...emptyState(ids[0]), completed: [ids[1]], notes: { [ids[1]]: 'New note' } }
    expect(mergeState(current, incoming).completed).toEqual(ids)
    expect(mergeState(current, incoming).notes).toEqual({ [ids[0]]: 'Keep me', [ids[1]]: 'New note' })
    expect(toggleItem([ids[0]], ids[0])).toEqual([])
  })
  it('persists tracker checkboxes independently and accepts legacy files without a tracker', () => {
    const state = { ...emptyState(ids[0]), studyTracker: { startDate: '2026-09-29', completedDays: [studyDayIds[0]] } }
    expect(validateState(JSON.parse(JSON.stringify(state)), ids)).toEqual(state)
    expect(loadState({ getItem: () => JSON.stringify(state) }, ids).state.studyTracker).toEqual(state.studyTracker)
    expect(validateState({ version: 1, completed: [ids[0]] }, ids).studyTracker).toEqual(emptyStudyTracker())
    const incoming = { ...emptyState(ids[0]), studyTracker: { startDate: null, completedDays: [studyDayIds[1]] } }
    const merged = mergeState(state, incoming)
    expect(merged.studyTracker).toEqual({ startDate: '2026-09-29', completedDays: studyDayIds.slice(0, 2) })
    expect(merged.completed).toEqual([])
    expect(merged.completionHistory).toEqual({})
    expect(validateState({ version: 1, studyTracker: { startDate: 'invalid', completedDays: ['unknown'] } }, ids).studyTracker).toEqual(emptyStudyTracker())
  })
})