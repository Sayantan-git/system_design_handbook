import { describe, expect, it } from 'vitest'
import handbook from '../content/handbook.md?raw'
import { escapeHtml, parseBook, readRoute } from './book'
import { allLearningTopics, conciseLessonHtml, learningTopics, lessonText, numberedTopic, otherTopicsSectionNumber, referenceHeadings, renderLessonComparison, supportingSubtopics, topicForReading, topicGuide, topicLesson, topicRoute } from './lessons'
import { lessonComparisons } from './lesson-comparisons'

const book = parseBook(handbook)
describe('guided numbered lessons', () => {
  it('gives every main and supporting topic a stable hierarchical identity', () => {
    expect(learningTopics.filter(topic => topic.section === 'system-design')).toHaveLength(170)
    expect(learningTopics.filter(topic => topic.section === 'other-topics')).toHaveLength(7)
    expect(new Set(learningTopics.map(topic => topic.key)).size).toBe(177)
    expect(learningTopics[0].number).toBe('1.1')
    expect(learningTopics.find(topic => topic.title === 'DNS (Domain Name System)')!.number).toBe('2.3')
    expect(otherTopicsSectionNumber).toBe(16)
    expect(learningTopics.filter(topic => topic.section === 'other-topics').map(topic => topic.number)).toEqual(['16.1', '16.2', '16.3', '16.4', '16.5', '16.6', '16.7'])
    expect(new Set(learningTopics.map(topic => topic.number)).size).toBe(learningTopics.length)
    const memory = learningTopics.find(topic => topic.title === 'Memory, storage, and runtimes')!
    expect(readRoute(topicRoute(book, memory), book.chapters[0].id)).toMatchObject({ entryId: '3-memory-storage-and-runtime-behavior', topic: 'other-topics:computing-foundations:memory-storage-and-runtimes' })
    for (const topic of learningTopics) expect(numberedTopic(topic)).toEqual(topic)
  })
  it('provides a concept, practical example, mechanism, limitation and verification for every topic', () => {
    for (const topic of learningTopics) {
      const lesson = topicLesson(topic)
      for (const text of Object.values(lesson)) expect(text.length, topic.title).toBeGreaterThan(25)
      const rendered = conciseLessonHtml(book, topic)
      expect(rendered.words, topic.title).toBeLessThan(800)
      expect(rendered.html).toContain('Real-life example')
      expect(rendered.html).toContain('Watch out')
      expect(rendered.html).toContain(topic.number)
    }
  })
  it('distinguishes topics that share a source heading without changing chapter identities', () => {
    const functional = learningTopics.find(topic => topic.title === 'Functional Requirements')!
    const quality = learningTopics.find(topic => topic.title === 'Non-Functional Requirements')!
    const first = readRoute(topicRoute(book, functional), book.chapters[0].id)
    const second = readRoute(topicRoute(book, quality), book.chapters[0].id)
    expect(first.entryId).toBe(second.entryId)
    expect(first.section).toBe(second.section)
    expect(first.topic).not.toBe(second.topic)
    expect(topicForReading(book, book.chapters[0], second.section, second.topic)).toEqual(quality)
  })
  it('covers the supporting subtopics with short practical lessons and deeper numbering', () => {
    const topics = supportingSubtopics(book)
    expect(topics.length).toBeGreaterThanOrEqual(60)
    expect(new Set(topics.map(topic => topic.key)).size).toBe(topics.length)
    expect(new Set(topics.map(topic => topic.number)).size).toBe(topics.length)
    for (const topic of topics) {
      const lesson = topicLesson(topic)
      for (const text of Object.values(lesson)) expect(text.length, topic.title).toBeGreaterThan(25)
      expect(conciseLessonHtml(book, topic).words, topic.title).toBeLessThan(800)
      expect(topic.number).toMatch(/^\d+\.\d+\.\d+(\.\d+)?$/)
      const route = readRoute(topicRoute(book, topic), book.chapters[0].id)
      expect(topicForReading(book, book.chapters.find(entry => entry.id === route.entryId)!, route.section, route.topic)).toEqual(topic)
    }
    expect(allLearningTopics(book)).toHaveLength(177 + topics.length)
    const linux = topics.find(topic => topic.title === 'Files, directories, and mounts')!
    expect(linux.number).toBe('16.7.3')
    expect(topicLesson(linux).example).toContain('deleted log')
  })
  it('numbers reference topics and subtopics without changing source heading identities', () => {
    const entry = book.chapters.find(chapter => chapter.number === 28)!
    const headings = referenceHeadings(book, entry)
    expect(headings[0].number).toBe('16.6.1')
    expect(headings[1].number).toBe('16.6.1.1')
    expect(headings.map(heading => heading.id)).toEqual(entry.headings.map(heading => heading.id))
  })
  it('teaches HTTP and HTTPS with paragraphs, bullets, steps and a semantic comparison table', () => {
    const topic = learningTopics.find(topic => topic.title === 'HTTP and HTTPS')!
    const guide = topicGuide(topic)!
    const rendered = conciseLessonHtml(book, topic)
    expect(guide.steps).toHaveLength(3)
    expect(rendered.words).toBeGreaterThan(350)
    expect(rendered.html).toContain('class="lesson-key-points"')
    expect(rendered.html).toContain('class="lesson-steps"')
    expect(rendered.html).toContain('<caption>HTTP vs HTTPS</caption>')
    expect(rendered.html).toContain('scope="col"')
    expect(rendered.html).toContain('scope="row"')
    expect(rendered.html).toContain('still be enforced by the application')
    expect(rendered.html).toContain('HTTP/3 uses QUIC')
    expect(guide.example).toContain('invoice 42')
    expect(guide.reasoning).toContain('trusted certificate authority')
    expect(rendered.html).toContain(`<p class="lesson-reasoning">${escapeHtml(guide.reasoning!)}</p>`)
    expect(lessonText(topic)).toContain(guide.reasoning)
    expect(rendered.words).toBe(lessonText(topic).split(/\s+/).length)
    expect(renderLessonComparison({ title: '<test>', columns: ['Key', 'Value'], rows: [['Name', '<script>']], takeaway: 'A & B' })).toContain('&lt;script&gt;')
  })
  it('gives every lesson original explanation paragraphs, key bullets, numbered steps, and a worked scenario', () => {
    const topics = allLearningTopics(book)
    expect(topics).toHaveLength(242)
    for (const topic of topics) {
      const guide = topicGuide(topic)
      expect(guide, topic.title).toBeDefined()
      expect(guide!.explanation.split(/\s+/).length, topic.title).toBeGreaterThan(25)
      expect(guide!.keyPoints, topic.title).toHaveLength(3)
      expect(guide!.steps, topic.title).toHaveLength(3)
      expect(guide!.example.split(/\s+/).length, topic.title).toBeGreaterThan(30)
      expect(guide!.decision.length, topic.title).toBeGreaterThan(60)
      expect(guide!.remember.length, topic.title).toBeGreaterThan(30)
      const rendered = conciseLessonHtml(book, topic)
      expect(rendered.words, topic.title).toBeGreaterThan(190)
      expect(rendered.words, topic.title).toBeLessThan(850)
      expect(rendered.html).toContain('<ul class="lesson-key-points">')
      expect(rendered.html).toContain('<ol class="lesson-steps">')
      expect(rendered.html).toContain('Remember:')
    }
  })
  it('provides rectangular comparison tables only for matching lesson topics', () => {
    expect(lessonComparisons.length).toBeGreaterThanOrEqual(25)
    const topics = allLearningTopics(book)
    for (const comparison of lessonComparisons) {
      expect(comparison.rows.length, comparison.title).toBeGreaterThanOrEqual(4)
      for (const row of comparison.rows) {
        expect(row.length, comparison.title).toBe(comparison.columns.length)
        expect(row.every(cell => cell.trim().length > 0)).toBe(true)
      }
      expect(topics.some(topic => topicGuide(topic)?.comparison?.title === comparison.title), comparison.title).toBe(true)
    }
  })
  it('adds exactly one bounded reasoning paragraph to every lesson and its reading context', () => {
    for (const topic of allLearningTopics(book)) {
      const reasoning = topicGuide(topic)!.reasoning
      expect(reasoning, topic.title).toBeTruthy()
      const addedWords = reasoning.trim().split(/\s+/).length
      expect(addedWords, topic.title).toBeGreaterThanOrEqual(30)
      expect(addedWords, topic.title).toBeLessThanOrEqual(65)
      expect(reasoning, topic.title).not.toMatch(/[\r\n]/)
      const rendered = conciseLessonHtml(book, topic)
      expect(rendered.html.match(/class="lesson-reasoning"/g), topic.title).toHaveLength(1)
      expect(rendered.html, topic.title).toContain(`<p class="lesson-reasoning">${escapeHtml(reasoning)}</p>`)
      expect(lessonText(topic), topic.title).toContain(reasoning)
      expect(rendered.words, topic.title).toBe(lessonText(topic).split(/\s+/).length)
      expect(rendered.html.indexOf('class="lesson-reasoning"')).toBeGreaterThan(rendered.html.indexOf('class="lesson-steps"'))
    }
  })
})