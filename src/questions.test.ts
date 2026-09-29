import { describe, expect, it } from 'vitest'
import { questions } from './questions'

describe('chapter review content', () => {
  it('keeps original reviews and adds new course lesson reviews', () => {
    expect(questions.slice(0, 32).map(question => question.chapter)).toEqual(Array.from({ length: 32 }, (_, index) => index + 1))
    expect(new Set(questions.map(question => question.id)).size).toBe(58)
    expect(new Set(questions.slice(32).map(question => question.cardId)).size).toBe(26)
  })
  it('keeps saved question identities and correct-answer positions stable', () => {
    expect(questions.map(question => question.id)).toEqual(Array.from({ length: 58 }, (_, index) => `q${index + 1}`))
    expect(questions.slice(0, 32).map(question => question.correct)).toEqual(Array.from({ length: 32 }, (_, index) => [1, 2, 0, 3][index % 4]))
  })
  it('has valid answers, feedback, and flashcard definitions', () => {
    for (const question of questions) {
      expect(question.options).toHaveLength(4)
      expect(question.options[question.correct]).toBeTruthy()
      expect(question.explanation.length).toBeGreaterThan(100)
      expect(question.definition.length).toBeGreaterThan(70)
      expect(question.explanation.split(/\s+/).length, question.id).toBeGreaterThanOrEqual(45)
      expect(question.definition.split(/\s+/).length, question.id).toBeGreaterThanOrEqual(30)
    }
  })
})