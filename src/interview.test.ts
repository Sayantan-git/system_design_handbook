import { describe, expect, it } from 'vitest'
import { interviewCases } from './interview-cases'
import { interviewQuestion, interviewTopics, parseInterviewId, questionsPerTopic, shuffledInterviewIds, validateInterviewAnswers } from './interview'

describe('offline practical interview bank', () => {
  it('provides exactly 100 complete scenario variants for every main and supporting topic', () => {
    expect(questionsPerTopic).toBe(100)
    expect(interviewTopics).toHaveLength(176)
    expect(new Set(interviewTopics.map(topic => topic.id)).size).toBe(interviewTopics.length)
    const profiles = new Set(Object.keys(interviewCases).map(title => title.toLowerCase()))
    for (const topic of interviewTopics) {
      expect(profiles.has(topic.title.toLowerCase()), topic.title).toBe(true)
      const questions = Array.from({ length: 100 }, (_, index) => interviewQuestion(topic.id, index + 1))
      expect(new Set(questions.map(question => question.prompt)).size, topic.title).toBe(100)
      expect(new Set(questions.map(question => question.angle)).size).toBe(20)
      expect(new Set(questions.map(question => question.scenario)).size).toBe(5)
      for (const question of questions) {
        expect(question.options).toHaveLength(4)
        expect(new Set(question.options).size).toBe(4)
        expect(question.options[question.correct]).toBeTruthy()
        expect(question.prompt).not.toMatch(/^what is|^define|^which definition/i)
        expect(question.explanation.split(/\s+/).length).toBeGreaterThan(65)
        expect(parseInterviewId(question.id)).toEqual({ topicId: topic.id, number: question.number })
      }
    }
  })
  it('draws from only selected topics without replacement and preserves stable answers', () => {
    const selected = interviewTopics.slice(0, 2).map(topic => topic.id)
    const ids = shuffledInterviewIds([...selected, selected[0], 'unknown'], () => 0.3)
    expect(ids).toHaveLength(200)
    expect(new Set(ids).size).toBe(200)
    expect(ids.every(id => selected.includes(parseInterviewId(id)!.topicId))).toBe(true)
    expect(interviewQuestion(selected[0], 1)).toEqual(interviewQuestion(selected[0], 1))
    expect(shuffledInterviewIds([])).toEqual([])
    expect(() => interviewQuestion(selected[0], 101)).toThrow()
  })
  it('validates saved choices without accepting unknown or malformed questions', () => {
    const id = interviewQuestion(interviewTopics[0].id, 1).id
    expect(validateInterviewAnswers({ [id]: { selected: 2, revealed: false, updatedAt: 100 }, bogus: { selected: 1, revealed: true, updatedAt: 100 } })).toEqual({ [id]: { selected: 2, revealed: false, updatedAt: 100 } })
    expect(validateInterviewAnswers({ [id]: { selected: 5, revealed: false, updatedAt: 100 } })).toEqual({})
    expect(validateInterviewAnswers({ [id]: { selected: null, revealed: true, updatedAt: 100 } })[id].revealed).toBe(true)
    expect(parseInterviewId('iv1:bad:1')).toBeUndefined()
  })
})