import { describe, expect, it } from 'vitest'
import source from '../content/handbook.md?raw'
import { markdown, parseBook } from './book'
import { resolveTopic, systemDesignGroups } from './curriculum'
import { exportGuide } from './guide-export'

const book = parseBook(source)
const output = exportGuide(book)

describe('complete guide download', () => {
  it('starts with the same named concepts and categories as the topic catalog', () => {
    const index = output.split('\n## Topic Index\n')[1].split('\n## Contents\n')[0]
    expect(index).toContain('30 Core Concepts')
    const checklist = markdown.lexer(index).find(token => token.type === 'list' && token.ordered)
    expect(checklist?.type === 'list' && checklist.items).toHaveLength(30)
    for (const topic of systemDesignGroups.flatMap(group => group.topics).filter(topic => topic.core)) {
      expect(checklist?.raw).toContain(`[${topic.title}](#${resolveTopic(book, topic).section})`)
    }
    for (const group of systemDesignGroups) {
      expect(index).toContain(group.title)
      for (const topic of group.topics) {
        const { section } = resolveTopic(book, topic)
        expect(index, topic.title).toContain(`[${topic.title}](#${section})`)
      }
    }
    expect(index).toContain('https://algomaster.io/learn/system-design/top-30-system-design-concepts')
    expect(index).toContain('https://www.geeksforgeeks.org/system-design/system-design-tutorial/')
    expect(output.match(/<a id="system-design-the-complete-topic-map"><\/a>/g)).toHaveLength(1)
  })
  it('uses sequential numbers within both physical document sections', () => {
    const system = output.split('\n## System Design\n')[1].split('\n## Other Topics\n')[0]
    const other = output.split('\n## Other Topics\n')[1].split('\n## Reference Material\n')[0]
    for (const [section, count] of [[system, 25], [other, 7]] as const) {
      expect([...section.matchAll(/^### Chapter (\d+)\./gm)].map(match => Number(match[1]))).toEqual(Array.from({ length: count }, (_, index) => index + 1))
    }
    expect(output).toContain('### Chapter 02. Data Structures and Algorithmic Cost')
    expect(output).toContain('### Chapter 25. Interview Practice and a Learning Plan')
  })
  it('keeps all diagrams, code, legacy anchors, references, and source identities', () => {
    const code = (value: string) => markdown.lexer(value).filter(token => token.type === 'code').map(token => JSON.stringify(token)).sort()
    expect(code(output)).toEqual(code(source))
    const anchors = new Set([...output.matchAll(/<a id="([^"]+)"><\/a>/g)].map(match => match[1]))
    for (const id of book.anchors.keys()) expect(anchors.has(id), id).toBe(true)
    for (const match of output.matchAll(/\]\(#([^)]*)\)/g)) expect(anchors.has(match[1]), match[1]).toBe(true)
    for (const video of book.videos) expect(output).toContain(video.url)
    expect(book.chapters[3].id).toBe('4-data-structures-and-algorithmic-cost')
  })
})