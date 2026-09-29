import { describe, expect, it } from 'vitest'
import handbook from '../content/handbook.md?raw'
import { parseBook, readRoute } from './book'
import { allLearningTopics, topicRoute } from './lessons'
import { createStudyPlan, emptyStudyTracker, mergeStudyTracker, setStudyDay, studyDayDate, studyDayIds, studyTrackerReport, validateStudyTracker } from './study-tracker'

const book = parseBook(handbook)

describe('eight-week project study tracker', () => {
  it('has 56 stable days with six learning days and one review day every week', () => {
    const plan = createStudyPlan(book)
    expect(plan).toHaveLength(8)
    expect(readRoute('#/tracker?view=report&week=3', book.chapters[0].id).view).toBe('tracker')
    expect(plan.flatMap(week => week.days.map(day => day.id))).toEqual(studyDayIds)
    expect(plan.flatMap(week => week.days.map(day => day.number))).toEqual(Array.from({ length: 56 }, (_, index) => index + 1))
    for (const week of plan) {
      expect(week.days).toHaveLength(7)
      expect(week.days.filter(day => !day.review)).toHaveLength(6)
      expect(week.days[6].review).toBe(true)
      const learned = new Set(week.days.slice(0, 6).flatMap(day => day.topics.map(topic => topic.key)))
      expect(week.days[6].topics.every(topic => learned.has(topic.key))).toBe(true)
      for (const day of week.days) {
        expect(day.topics.length).toBeGreaterThan(0)
        expect(day.topics.length).toBeLessThanOrEqual(8)
        expect(day.goal.length).toBeGreaterThan(30)
      }
    }
  })
  it('assigns every current main and supporting lesson once before review with valid project links', () => {
    const learned = createStudyPlan(book).flatMap(week => week.days.filter(day => !day.review).flatMap(day => day.topics))
    const catalog = allLearningTopics(book)
    expect(learned).toHaveLength(242)
    expect(new Set(learned.map(topic => topic.key)).size).toBe(242)
    expect(learned.map(topic => topic.key).sort()).toEqual(catalog.map(topic => topic.key).sort())
    expect(learned.some(topic => topic.number === '16.7.3')).toBe(true)
    for (const topic of learned) {
      const route = readRoute(topicRoute(book, topic), book.chapters[0].id)
      expect(book.entries.some(entry => entry.id === route.entryId)).toBe(true)
      expect(route.topic).toBe(topic.key)
      if (route.section) expect(book.anchors.has(route.section)).toBe(true)
    }
  })
  it('validates optional dates and checkboxes, merges imports, and supports undo', () => {
    expect(validateStudyTracker(undefined)).toEqual(emptyStudyTracker())
    expect(validateStudyTracker({ startDate: '2026-02-30', completedDays: [studyDayIds[0], studyDayIds[0], 'unknown', 1] })).toEqual({ startDate: null, completedDays: [studyDayIds[0]] })
    const checked = setStudyDay(emptyStudyTracker(), studyDayIds[0], true)
    expect(setStudyDay(checked, studyDayIds[0], true)).toEqual(checked)
    expect(setStudyDay(checked, studyDayIds[0], false)).toEqual(emptyStudyTracker())
    expect(setStudyDay(checked, 'unknown', true)).toEqual(checked)
    expect(mergeStudyTracker({ ...checked, startDate: '2026-09-29' }, { startDate: null, completedDays: [studyDayIds[1]] })).toEqual({ startDate: '2026-09-29', completedDays: studyDayIds.slice(0, 2) })
  })
  it('calculates scheduled dates across month and leap-day boundaries', () => {
    expect(studyDayDate('2026-09-29', 1)).toBe('2026-09-29')
    expect(studyDayDate('2026-09-29', 56)).toBe('2026-11-23')
    expect(studyDayDate('2024-02-28', 2)).toBe('2024-02-29')
    expect(studyDayDate(null, 1)).toBeUndefined()
    expect(studyDayDate('2026-09-29', 57)).toBeUndefined()
    expect(validateStudyTracker({ startDate: '9999-12-31' }).startDate).toBeNull()
  })
  it('reports checked days and unique learning coverage without counting reviews as new lessons', () => {
    const plan = createStudyPlan(book)
    const state = { startDate: '2026-09-29', completedDays: [studyDayIds[0], studyDayIds[6]] }
    const report = studyTrackerReport(plan, state, '2026-10-01')
    expect(report.completed).toBe(2)
    expect(report.remaining).toBe(54)
    expect(report.lessonsCompleted).toBe(plan[0].days[0].topics.length)
    expect(report.lessonTotal).toBe(242)
    expect(report.reviewsCompleted).toBe(1)
    expect(report.overdue).toBe(1)
    expect(report.nextDay?.number).toBe(2)
    expect(report.todayDay?.number).toBe(3)
    expect(report.weeks[0]).toMatchObject({ completed: 2, total: 7, reviewComplete: true })
    expect(report.days[1].status).toBe('overdue')
    expect(report.days[2].status).toBe('today')
    expect(report.days[3].status).toBe('upcoming')
    const finished = studyTrackerReport(plan, { startDate: null, completedDays: studyDayIds })
    expect(finished).toMatchObject({ completed: 56, remaining: 0, percent: 100, lessonsCompleted: 242, reviewsCompleted: 8, overdue: 0 })
    expect(finished.nextDay).toBeUndefined()
    expect(studyTrackerReport(plan, emptyStudyTracker()).days.every(day => day.status === 'pending')).toBe(true)
  })
})