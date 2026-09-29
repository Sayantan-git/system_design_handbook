import { describe, expect, it } from 'vitest'
import source from '../content/handbook.md?raw'
import { parseBook } from './book'
import { courseStages, displayChapterNumber, filterTopicGroups, formatChapterReferences, otherTopicGroups, resolveTopic, scenarios, sectionForChapter, supportingChapters, systemDesignGroups, topicReading } from './curriculum'
import { requestFlowConcerns, requestFlowConnections, requestFlowNodes, requestFlows, requestFlowTopics } from './request-flow'

const book = parseBook(source)

describe('all-in-one study curriculum', () => {
  it('numbers each section sequentially without changing stored chapter identities', () => {
    const originalIds = book.chapters.map(chapter => chapter.id)
    for (const [section, count] of [['system-design', 25], ['other-topics', 7]] as const) {
      const entries = book.chapters.filter(entry => sectionForChapter(entry.number) === section)
      expect(entries.map(entry => displayChapterNumber(book, entry))).toEqual(Array.from({ length: count }, (_, index) => index + 1))
    }
    expect(displayChapterNumber(book, book.chapters[3])).toBe(2)
    expect(displayChapterNumber(book, book.chapters[31])).toBe(25)
    expect(book.chapters.map(chapter => chapter.id)).toEqual(originalIds)
    expect(displayChapterNumber(book, book.entries.find(entry => entry.number === null)!)).toBeNull()
  })
  it('translates old prose references into unambiguous section-local numbers', () => {
    expect(formatChapterReferences(book, 'Chapter 4: data structures.')).toBe('Other Topics chapter 02: data structures.')
    expect(formatChapterReferences(book, 'Chapters 2-3: resource costs.')).toBe('System Design chapter 02 and Other Topics chapter 01: resource costs.')
    expect(formatChapterReferences(book, 'CHAPTERS 2 AND 3')).toBe('System Design chapter 02 and Other Topics chapter 01')
    expect(formatChapterReferences(book, 'Chapters 2, 8, 10-14')).toBe('System Design chapters 02, 05-10')
    expect(formatChapterReferences(book, 'Chapters 15-16 and 21-25')).toBe('System Design chapters 11-12, 16-20')
    expect(formatChapterReferences(book, 'Chapter 999 and HTTP/3')).toBe('Chapter 999 and HTTP/3')
    expect(formatChapterReferences(book, '99.9% availability')).toBe('99.9% availability')
  })
  it('organizes named concepts into distinct learning categories', () => {
    expect(systemDesignGroups).toHaveLength(15)
    expect(new Set(systemDesignGroups.map(group => group.id)).size).toBe(15)
    expect(systemDesignGroups.every(group => group.topics.length >= 4)).toBe(true)
    const titles = systemDesignGroups.flatMap(group => group.topics.map(topic => topic.title))
    expect(new Set(titles).size).toBe(titles.length)
  })
  it('names all thirty core concepts as direct section links', () => {
    const titles = [
      'Client-Server Model', 'IP Addresses', 'DNS (Domain Name System)', 'Forward Proxy vs Reverse Proxy',
      'Latency', 'HTTP and HTTPS', 'APIs', 'REST API', 'GraphQL', 'WebSockets', 'Webhooks',
      'Databases', 'SQL vs NoSQL', 'Database Indexing', 'Vertical Partitioning', 'Caching',
      'Denormalization', 'Blob and Object Storage', 'Vertical Scaling', 'Horizontal Scaling',
      'Load Balancing', 'Database Replication', 'Database Sharding', 'CAP Theorem',
      'CDN (Content Delivery Network)', 'Idempotency', 'Microservices', 'Message Queues',
      'Rate Limiting', 'API Gateway',
    ]
    const topics = systemDesignGroups.flatMap(group => group.topics)
    expect(topics.filter(topic => topic.core).map(topic => topic.title).sort()).toEqual([...titles].sort())
    for (const title of titles) {
      const topic = topics.find(item => item.title === title)
      expect(topic, title).toBeDefined()
      expect(topic?.heading, title).toBeTruthy()
      expect(resolveTopic(book, topic!).section, title).toBeTruthy()
    }
  })
  it('assigns every category to exactly one ordered course stage', () => {
    expect(courseStages).toHaveLength(5)
    const grouped = courseStages.flatMap(stage => stage.groups)
    expect(new Set(grouped).size).toBe(grouped.length)
    expect([...grouped].sort()).toEqual(systemDesignGroups.map(group => group.id).sort())
    for (const stage of courseStages) {
      expect(stage.prerequisite.length).toBeGreaterThan(35)
      expect(stage.outcome.length).toBeGreaterThan(60)
      expect(filterTopicGroups(systemDesignGroups, { stageId: stage.id }).map(group => group.id).sort()).toEqual([...stage.groups].sort())
    }
    expect(filterTopicGroups(systemDesignGroups, { stageId: 'foundations', query: 'LSM' })).toEqual([])
    expect(filterTopicGroups(systemDesignGroups, { stageId: 'build-scale', query: 'LSM' }).flatMap(group => group.topics)).toHaveLength(1)
    expect(filterTopicGroups(systemDesignGroups, { stageId: 'unknown' })).toEqual([])
  })
  it('measures the selected topic instead of the complete chapter', () => {
    const topics = systemDesignGroups.flatMap(group => group.topics)
    const wal = topicReading(book, topics.find(topic => topic.title === 'Write-Ahead Logs (WAL)')!)
    const graphql = topicReading(book, topics.find(topic => topic.title === 'GraphQL')!)
    expect(wal.diagrams).toBe(1)
    expect(wal.minutes).toBeLessThan(wal.entry.minutes)
    expect(graphql.diagrams).toBe(0)
    expect(graphql.minutes).toBeGreaterThan(0)
    expect(topicReading(book, { title: 'Full chapter', chapter: 11, coverage: '' }).diagrams).toBe(book.chapters[10].diagrams)
  })
  it('resolves every topic and scenario to existing complete reading', () => {
    for (const topic of [...systemDesignGroups, ...otherTopicGroups].flatMap(group => group.topics).concat(scenarios)) {
      const resolved = resolveTopic(book, topic)
      expect(resolved.entry.words, topic.title).toBeGreaterThan(650)
      if (resolved.section) expect(book.anchors.get(resolved.section)?.entryId, topic.title).toBe(resolved.entry.id)
    }
  })
  it('combines topic search, category selection, and the core concept filter', () => {
    expect(filterTopicGroups(systemDesignGroups, { coreOnly: true }).flatMap(group => group.topics)).toHaveLength(30)
    expect(filterTopicGroups(systemDesignGroups, { query: '  gRaPhQl  ' }).flatMap(group => group.topics.map(topic => topic.title))).toEqual(['GraphQL'])
    expect(filterTopicGroups(systemDesignGroups, { query: 'indexing database' }).flatMap(group => group.topics.map(topic => topic.title))).toEqual(['Database Indexing'])
    for (const query of ['consensus', 'cache eviction', 'distributed tracing', 'Pulsar', 'Azure Service Bus']) {
      expect(filterTopicGroups(systemDesignGroups, { query }).length, query).toBeGreaterThan(0)
    }
    const networking = filterTopicGroups(systemDesignGroups, { groupId: 'traffic-networking', coreOnly: true })
    expect(networking.map(group => group.id)).toEqual(['traffic-networking'])
    expect(networking[0].topics.every(topic => topic.core)).toBe(true)
    expect(filterTopicGroups(systemDesignGroups, { query: 'GraphQL', groupId: 'data-storage' })).toEqual([])
    expect(filterTopicGroups(systemDesignGroups, { groupId: 'testing-delivery', coreOnly: true })).toEqual([])
    expect(filterTopicGroups(systemDesignGroups)).toEqual(systemDesignGroups)
  })
  it('connects each request-flow concept to existing system-design reading', () => {
    for (const item of [...requestFlowNodes, ...requestFlowConcerns]) {
      const topics = requestFlowTopics(item.topics)
      expect(topics.length, item.id).toBeGreaterThan(0)
      for (const topic of topics) {
        const resolved = resolveTopic(book, topic)
        expect(sectionForChapter(resolved.entry.number), topic.title).toBe('system-design')
        if (resolved.section) expect(book.anchors.get(resolved.section)?.entryId).toBe(resolved.entry.id)
      }
    }
  })
  it('traces requests back to the user and keeps DNS and background work honest', () => {
    const nodeIds = requestFlowNodes.map(node => node.id)
    const connections = new Set(requestFlowConnections.flatMap(([from, to]) => [`${from}:${to}`, `${to}:${from}`]))
    expect(new Set(nodeIds).size).toBe(nodeIds.length)
    for (const flow of requestFlows) {
      expect(flow.steps[0].node, flow.id).toBe('client')
      expect(flow.steps.at(-1)?.node, flow.id).toBe('client')
      expect(flow.steps.at(-1)?.phase, flow.id).toBe('response')
      for (const step of flow.steps) {
        expect(nodeIds, step.title).toContain(step.node)
        if (step.from) {
          expect(nodeIds, step.title).toContain(step.from)
          expect(connections.has(`${step.from}:${step.node}`), step.title).toBe(true)
        }
        for (const topic of requestFlowTopics(step.topics ?? [])) expect(() => resolveTopic(book, topic)).not.toThrow()
        expect(step.explanation.length, step.title).toBeGreaterThan(50)
        expect(step.payload.length, step.title).toBeGreaterThan(5)
        if (step.from === 'dns') expect(step.node).toBe('client')
      }
    }
    expect(requestFlows.find(flow => flow.id === 'edge-hit')!.steps.map(step => step.node)).toEqual(['client', 'dns', 'client', 'edge', 'client'])
    const write = requestFlows.find(flow => flow.id === 'write')!.steps
    const accepted = write.findIndex(step => step.node === 'client' && step.from === 'edge')
    expect(accepted).toBeGreaterThan(write.findIndex(step => step.node === 'database'))
    expect(write.findIndex(step => step.phase === 'background')).toBeGreaterThan(accepted)
    expect(write.filter(step => step.phase === 'background').map(step => step.node)).toEqual(['relay', 'queue', 'worker', 'database', 'service'])
  })
  it('keeps supporting reading separate without losing existing chapters', () => {
    expect(otherTopicGroups.flatMap(group => group.topics.map(topic => topic.chapter))).toEqual(supportingChapters)
    const systemChapters = new Set(systemDesignGroups.flatMap(group => group.topics.map(topic => topic.chapter)))
    for (const chapter of book.chapters) {
      if (sectionForChapter(chapter.number) === 'system-design') expect(systemChapters.has(chapter.number!) || [30, 31, 32].includes(chapter.number!), chapter.title).toBe(true)
    }
    expect(scenarios).toHaveLength(25)
  })
})