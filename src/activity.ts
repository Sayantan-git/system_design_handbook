export type CompletionHistory = Record<string, string[]>
export interface ActivityDay { date: string; week: number; weekday: number; count: number; future: boolean }
export interface ActivityCalendar { days: ActivityDay[]; weeks: number; start: string; end: string }
const dayMilliseconds = 86400000

export function localDay(date = new Date()): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function validActivityDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1970) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const dayTime = (value: string) => Date.parse(`${value}T12:00:00Z`)
export const shiftDay = (value: string, offset: number) => new Date(dayTime(value) + offset * dayMilliseconds).toISOString().slice(0, 10)

export function validateCompletionHistory(value: unknown, entryIds: string[]): CompletionHistory {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const allowed = new Set(entryIds)
  const result: CompletionHistory = {}
  for (const [date, entries] of Object.entries(value)) {
    if (!validActivityDate(date) || !Array.isArray(entries)) continue
    const valid = [...new Set(entries.filter((id): id is string => typeof id === 'string' && allowed.has(id)))]
    if (valid.length) result[date] = valid
  }
  return result
}

export function recordCompletion(history: CompletionHistory, date: string, entryId: string, completed: boolean): CompletionHistory {
  if (!validActivityDate(date)) throw new Error('Invalid completion date.')
  const entries = history[date] ?? []
  const next = completed ? [...new Set([...entries, entryId])] : entries.filter(id => id !== entryId)
  const result = { ...history }
  if (next.length) result[date] = next
  else delete result[date]
  return result
}

export function mergeCompletionHistory(current: CompletionHistory, incoming: CompletionHistory): CompletionHistory {
  return Object.fromEntries([...new Set([...Object.keys(current), ...Object.keys(incoming)])].map(date => [date, [...new Set([...(current[date] ?? []), ...(incoming[date] ?? [])])]]))
}

function calendar(history: CompletionHistory, start: string, end: string, today: string): ActivityCalendar {
  const first = dayTime(start)
  const last = dayTime(end)
  const anchor = first - new Date(first).getUTCDay() * dayMilliseconds
  const days: ActivityDay[] = []
  for (let timestamp = first; timestamp <= last; timestamp += dayMilliseconds) {
    const date = new Date(timestamp)
    const key = date.toISOString().slice(0, 10)
    days.push({ date: key, week: Math.floor((timestamp - anchor) / (7 * dayMilliseconds)), weekday: date.getUTCDay(), count: key > today ? 0 : (history[key]?.length ?? 0), future: key > today })
  }
  return { days, weeks: Math.ceil((last - anchor + dayMilliseconds) / (7 * dayMilliseconds)), start, end }
}

export function yearActivity(history: CompletionHistory, year: number, today = localDay()): ActivityCalendar {
  if (!Number.isInteger(year) || year < 1970 || year > 9999) throw new Error('Invalid activity year.')
  return calendar(history, `${year}-01-01`, `${year}-12-31`, today)
}

export function recentActivity(history: CompletionHistory, today = localDay()): ActivityCalendar {
  const weekday = new Date(dayTime(today)).getUTCDay()
  const start = shiftDay(today, -weekday - 12 * 7)
  return calendar(history, start, shiftDay(start, 90), today)
}

export function activityStats(history: CompletionHistory, today = localDay()) {
  const dates = Object.keys(history).filter(date => validActivityDate(date) && date <= today && history[date].length > 0).sort()
  let longestStreak = 0
  let streak = 0
  let previous: string | undefined
  for (const date of dates) {
    streak = previous && shiftDay(previous, 1) === date ? streak + 1 : 1
    longestStreak = Math.max(longestStreak, streak)
    previous = date
  }
  let currentStreak = 0
  let cursor = history[today]?.length ? today : shiftDay(today, -1)
  while (history[cursor]?.length) { currentStreak += 1; cursor = shiftDay(cursor, -1) }
  return { total: dates.reduce((total, date) => total + history[date].length, 0), activeDays: dates.length, currentStreak, longestStreak }
}

export const activityLevel = (count: number) => Math.min(4, Math.max(0, Math.floor(count)))