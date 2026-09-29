import { localDay, shiftDay, validActivityDate } from './activity'
import type { Book } from './book'
import { allLearningTopics, type NumberedTopic } from './lessons'

export const studyPlanId = 'eight-week-v1'
export const studyDayIds = Array.from({ length: 56 }, (_, index) => `${studyPlanId}-day-${String(index + 1).padStart(2, '0')}`)
const allowedDays = new Set(studyDayIds)
export const latestStudyStartDate = '9999-11-06'

export interface StudyTrackerState { startDate: string | null; completedDays: string[] }
export interface StudyDay { id: string; number: number; week: number; weekday: number; review: boolean; topics: NumberedTopic[]; goal: string }
export interface StudyWeek { number: number; title: string; goal: string; days: StudyDay[] }

const weekDefinitions = [
  { title: 'Foundations and computing', groups: ['core-fundamentals'], supporting: [3, 4], supportingFirst: false, goal: 'Explain a business invariant, estimate a workload, and choose data structures and durable state.', review: 'Sketch a booking request. Explain its success rule, memory and storage needs, and one useful capacity estimate.' },
  { title: 'Networking and APIs', groups: ['traffic-networking', 'api-communication'], supporting: [], supportingFirst: false, goal: 'Trace a request from DNS to an authorized API result, including timeouts and live updates.', review: 'Trace a browser request through DNS, HTTPS, and an API. Compare retry, polling, SSE, and WebSocket behavior.' },
  { title: 'Scaling and databases', groups: ['scalability', 'data-storage'], supporting: [5], supportingFirst: true, goal: 'Protect concurrent changes and explain the limits of scaling, indexes, transactions, and replicas.', review: 'Design the stored decision for the final inventory item. Explain concurrent callers, replica lag, and the first scaling bottleneck.' },
  { title: 'Caching and architecture', groups: ['caching', 'architecture'], supporting: [9], supportingFirst: false, goal: 'Choose reusable answers and clear code or service ownership without weakening business rules.', review: 'Trace a cached product read and an authoritative checkout. Explain a stale refill, tenant isolation, and the chosen module boundaries.' },
  { title: 'Messaging and distributed systems', groups: ['messaging', 'distributed-primitives'], supporting: [], supportingFirst: false, goal: 'Reason about duplicates, ordering, quorum decisions, clocks, and ownership during failure.', review: 'Recover a worker that saves a result and loses its acknowledgement. Compare idempotency, outbox, consensus, and fencing responsibilities.' },
  { title: 'Reliability, security, and diagnosis', groups: ['resilience', 'observability-security'], supporting: [29], supportingFirst: false, goal: 'Bound overload, authorize resources, observe user outcomes, and diagnose the actual waiting resource.', review: 'Investigate slow checkout during a provider outage. Choose useful signals, retry limits, recovery checks, and resource authorization.' },
  { title: 'Pipelines, platforms, and delivery', groups: ['data-pipelines', 'deployment', 'testing-delivery'], supporting: [18, 28], supportingFirst: false, goal: 'Handle replay, deploy compatible changes, and test the boundaries that protect the service.', review: 'Walk an old event through a new consumer after deployment. Explain checkpoint replay, schema compatibility, rollout, and restore testing.' },
  { title: 'Complete designs and final revision', groups: ['worked-designs'], supporting: [], supportingFirst: false, goal: 'Present complete designs with requirements, data ownership, practical estimates, and failure recovery.', review: 'Revisit the linked designs and explain one end to end without reading. Compare a second approach and revisit interview answers you missed.' },
] as const

export function createStudyPlan(book: Book): StudyWeek[] {
  const topics = allLearningTopics(book)
  return weekDefinitions.map((definition, weekIndex) => {
    const main = definition.groups.flatMap(group => topics.filter(topic => topic.section === 'system-design' && topic.groupId === group))
    const supporting = definition.supporting.flatMap(chapter => topics.filter(topic => topic.section === 'other-topics' && topic.chapter === chapter))
    const ordered = definition.supportingFirst ? [...supporting, ...main] : [...main, ...supporting]
    const days: StudyDay[] = Array.from({ length: 6 }, (_, dayIndex) => {
      const number = weekIndex * 7 + dayIndex + 1
      return { id: studyDayIds[number - 1], number, week: weekIndex + 1, weekday: dayIndex + 1, review: false, topics: ordered.slice(Math.floor(dayIndex * ordered.length / 6), Math.floor((dayIndex + 1) * ordered.length / 6)), goal: definition.goal }
    })
    const reviewNumber = weekIndex * 7 + 7
    days.push({ id: studyDayIds[reviewNumber - 1], number: reviewNumber, week: weekIndex + 1, weekday: 7, review: true, topics: days.flatMap(day => day.topics.slice(0, 1)), goal: definition.review })
    return { number: weekIndex + 1, title: definition.title, goal: definition.goal, days }
  })
}

export const emptyStudyTracker = (): StudyTrackerState => ({ startDate: null, completedDays: [] })

export function validateStudyTracker(value: unknown): StudyTrackerState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyStudyTracker()
  const source = value as Partial<StudyTrackerState>
  return {
    startDate: typeof source.startDate === 'string' && validActivityDate(source.startDate) && source.startDate <= latestStudyStartDate ? source.startDate : null,
    completedDays: Array.isArray(source.completedDays) ? [...new Set(source.completedDays.filter((id): id is string => typeof id === 'string' && allowedDays.has(id)))].sort() : [],
  }
}

export function setStudyDay(state: StudyTrackerState, id: string, complete: boolean): StudyTrackerState {
  if (!allowedDays.has(id)) return state
  return { ...state, completedDays: (complete ? [...new Set([...state.completedDays, id])] : state.completedDays.filter(day => day !== id)).sort() }
}

export function mergeStudyTracker(current: StudyTrackerState, incoming: StudyTrackerState): StudyTrackerState {
  return validateStudyTracker({ startDate: incoming.startDate ?? current.startDate, completedDays: [...current.completedDays, ...incoming.completedDays] })
}

export function studyDayDate(start: string | null, day: number): string | undefined {
  return start && validActivityDate(start) && start <= latestStudyStartDate && Number.isInteger(day) && day >= 1 && day <= 56 ? shiftDay(start, day - 1) : undefined
}

export function studyTrackerReport(plan: StudyWeek[], state: StudyTrackerState, today = localDay()) {
  const validated = validateStudyTracker(state)
  const completed = new Set(validated.completedDays)
  const days = plan.flatMap(week => week.days).map(day => {
    const date = studyDayDate(validated.startDate, day.number)
    const done = completed.has(day.id)
    const status = done ? 'complete' : !date ? 'pending' : date < today ? 'overdue' : date === today ? 'today' : 'upcoming'
    return { ...day, date, complete: done, status }
  })
  const weeks = plan.map(week => {
    const members = days.filter(day => day.week === week.number)
    return { number: week.number, title: week.title, completed: members.filter(day => day.complete).length, total: members.length, lessonsCompleted: members.filter(day => day.complete && !day.review).reduce((total, day) => total + day.topics.length, 0), lessonTotal: members.filter(day => !day.review).reduce((total, day) => total + day.topics.length, 0), reviewComplete: members.some(day => day.review && day.complete) }
  })
  return {
    days,
    weeks,
    completed: days.filter(day => day.complete).length,
    remaining: days.filter(day => !day.complete).length,
    percent: Math.round(days.filter(day => day.complete).length / Math.max(1, days.length) * 100),
    lessonsCompleted: weeks.reduce((total, week) => total + week.lessonsCompleted, 0),
    lessonTotal: weeks.reduce((total, week) => total + week.lessonTotal, 0),
    reviewsCompleted: weeks.filter(week => week.reviewComplete).length,
    overdue: days.filter(day => day.status === 'overdue').length,
    nextDay: days.find(day => !day.complete),
    todayDay: days.find(day => day.date === today),
    endDate: studyDayDate(validated.startDate, 56),
  }
}