import { describe, expect, it } from 'vitest'
import { activityLevel, activityStats, localDay, recentActivity, recordCompletion, validActivityDate, validateCompletionHistory, yearActivity } from './activity'
import { emptyState, mergeState, toggleChapterCompletion, validateState } from './state'

const ids = ['chapter-one', 'chapter-two']

describe('daily completion activity', () => {
  it('records the local calendar day and deduplicates a chapter within it', () => {
    const date = new Date(2026, 8, 28, 23, 59)
    expect(localDay(date)).toBe('2026-09-28')
    const completed = toggleChapterCompletion(emptyState(ids[0]), ids[0], date)
    expect(completed.completed).toEqual([ids[0]])
    expect(completed.completionHistory).toEqual({ '2026-09-28': [ids[0]] })
    expect(recordCompletion(completed.completionHistory, '2026-09-28', ids[0], true)).toEqual(completed.completionHistory)
    expect(toggleChapterCompletion(completed, ids[0], date).completionHistory).toEqual({})
    expect(validateState(JSON.parse(JSON.stringify(completed)), ids)).toEqual(completed)
  })
  it('keeps previous days when a chapter is unmarked or completed again', () => {
    const yesterday = toggleChapterCompletion(emptyState(ids[0]), ids[0], new Date(2026, 8, 27))
    const unmarked = toggleChapterCompletion(yesterday, ids[0], new Date(2026, 8, 28))
    expect(unmarked.completionHistory).toEqual({ '2026-09-27': [ids[0]] })
    const revised = toggleChapterCompletion(unmarked, ids[0], new Date(2026, 8, 28))
    expect(revised.completionHistory).toEqual({ '2026-09-27': [ids[0]], '2026-09-28': [ids[0]] })
  })
  it('preserves legacy completion without inventing historical dates', () => {
    const old = validateState({ version: 1, completed: [ids[0]] }, ids)
    expect(old.completed).toEqual([ids[0]])
    expect(old.completionHistory).toEqual({})
    const history = { '2026-09-28': [ids[0], ids[0], 'unknown'], '2026-02-30': ids, '2026-09-29': 'bad', '__proto__': ids }
    expect(validateCompletionHistory(history, ids)).toEqual({ '2026-09-28': [ids[0]] })
    expect(validActivityDate('2024-02-29')).toBe(true)
    expect(validActivityDate('2025-02-29')).toBe(false)
    expect(validActivityDate('2026-9-28')).toBe(false)
  })
  it('merges imported days and independent completions without duplicates', () => {
    const current = { ...emptyState(ids[0]), completionHistory: { '2026-09-28': [ids[0]] } }
    const incoming = { ...emptyState(ids[0]), completionHistory: { '2026-09-28': ids, '2026-09-27': [ids[1]] } }
    expect(mergeState(current, incoming).completionHistory).toEqual({ '2026-09-28': ids, '2026-09-27': [ids[1]] })
  })
  it('lays out complete leap years, week boundaries and thirteen recent weeks', () => {
    const leap = yearActivity({ '2024-02-29': ids }, 2024, '2024-12-31')
    expect(leap.days).toHaveLength(366)
    expect(leap.days[0]).toMatchObject({ date: '2024-01-01', week: 0, weekday: 1 })
    expect(leap.days.find(day => day.date === '2024-02-29')).toMatchObject({ count: 2, weekday: 4 })
    expect(new Set(leap.days.map(day => day.date)).size).toBe(366)
    expect(yearActivity({}, 2000, '2026-09-28').weeks).toBe(54)
    const recent = recentActivity({}, '2026-09-28')
    expect(recent.weeks).toBe(13)
    expect(recent.days).toHaveLength(91)
    expect(recent.days[0].weekday).toBe(0)
    expect(recent.days.at(-1)!.weekday).toBe(6)
    expect(recent.days.find(day => day.date === '2026-09-29')!.future).toBe(true)
    expect([0, 1, 2, 3, 4, 9].map(activityLevel)).toEqual([0, 1, 2, 3, 4, 4])
  })
  it('calculates streaks across leap days and daylight-saving boundaries', () => {
    const history = { '2024-02-28': [ids[0]], '2024-02-29': ids, '2024-03-01': [ids[1]], '2030-01-01': ids }
    expect(activityStats(history, '2024-03-02')).toEqual({ total: 4, activeDays: 3, currentStreak: 3, longestStreak: 3 })
    expect(activityStats(history, '2024-03-03').currentStreak).toBe(0)
    expect(activityStats({ '2026-03-07': ids, '2026-03-08': ids, '2026-03-09': ids }, '2026-03-09').currentStreak).toBe(3)
    expect(activityStats({}, '2026-09-28')).toEqual({ total: 0, activeDays: 0, currentStreak: 0, longestStreak: 0 })
  })
})