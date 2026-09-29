import { describe, expect, it } from 'vitest'
import type { Tokens } from 'marked'
import source from '../content/handbook.md?raw'
import { markdown, parseBook, readRoute, renderDiagramControls, renderEntry } from './book'

const book = parseBook(source)

describe('complete handbook content', () => {
  it('retains all 32 full chapters and the original diagrams alongside new explanations', () => {
    expect(book.chapters.map(entry => entry.number)).toEqual(Array.from({ length: 32 }, (_, index) => index + 1))
    expect(book.diagrams).toBe(58)
    expect(book.chapters.every(entry => entry.words > 650)).toBe(true)
  })
  it('resolves every source cross-reference to the correct destination', () => {
    for (const match of source.matchAll(/\]\(#([^)]*)\)/g)) expect(book.anchors.has(match[1]), match[1]).toBe(true)
    expect(book.anchors.get('the-stale-fill-race')?.entryId).toBe(book.chapters[12].id)
  })
  it('extracts all 103 video references and twelve study weeks', () => {
    expect(book.videos).toHaveLength(103)
    expect(new Set(book.videos.map(video => video.url)).size).toBe(103)
    expect(book.weeks).toHaveLength(12)
    expect(book.weeks[0].chapters).toEqual([1, 2])
    expect(book.weeks[11].chapters).toEqual([30, 31, 32])
  })
  it('renders math, accessible diagram containers, and source anchors', () => {
    expect(renderEntry(book.chapters[1])).toContain('katex')
    expect(renderEntry(book.chapters[5])).toContain('data-diagram')
    expect(renderEntry(book.chapters[12])).toContain('id="the-stale-fill-race"')
  })
  it('gives diagrams accessible controls and preserves their escaped source', () => {
    const rendered = markdown.parse('```mermaid\nflowchart LR\n  Client --> Cache["<Cache>"]\n```') as string
    for (const action of ['pan-diagram', 'zoom-out', 'zoom-in', 'zoom-reset', 'download-diagram', 'expand-diagram']) {
      expect(rendered).toContain(`data-action="${action}"`)
    }
    expect(rendered).toContain('role="group" aria-label="Diagram controls"')
    expect(rendered).toContain('tabindex="0" role="region"')
    expect(rendered).toContain('aria-busy="true"')
    expect(rendered).toContain('aria-pressed="false" disabled')
    expect(rendered).toContain('&lt;Cache&gt;')
    expect(rendered).not.toContain('<Cache>')
    expect(renderDiagramControls(true)).toContain('aria-label="Close diagram"')
    expect(renderDiagramControls(true)).not.toContain('data-action="expand-diagram"')
  })
  it('offers accessible data-flow playback on every supported diagram type', () => {
    for (const diagram of ['flowchart LR\n  Client -->|Request| Server', 'sequenceDiagram\n  Client->>Server: Request\n  Server-->>Client: Response', 'stateDiagram-v2\n  Pending --> Completed: Commit succeeds']) {
      const rendered = markdown.parse(`\`\`\`mermaid\n${diagram}\n\`\`\``) as string
      expect(rendered).toContain('data-diagram-playback')
      for (const action of ['restart', 'previous', 'play', 'next']) {
        expect(rendered).toContain(`data-diagram-playback-action="${action}"`)
      }
      expect(rendered).toContain('aria-label="Play data flow"')
      expect(rendered).toContain('aria-label="Data flow step"')
      expect(rendered).toContain('aria-label="Data flow speed"')
      expect(rendered).toContain('aria-label="Data flow progress"')
      expect(rendered).toContain('data-diagram-pause-icon hidden')
      expect(rendered).toContain('data-diagram-flow-announcement role="status" aria-live="polite"')
      expect(rendered).toContain('data-diagram-flow-history')
      expect(rendered).toContain('aria-label="Diagram activity"')
      expect(rendered).toContain('data-diagram-flow-participants')
    }
  })
  it('indexes body text as well as headings', () => {
    expect(book.search.some(result => /poison message/i.test(result.text))).toBe(true)
    expect(book.search.length).toBeGreaterThan(200)
  })
  it('includes tailored revision notes on all 32 chapters in rendering, navigation, and search', () => {
    const catches: string[] = []
    for (const entry of book.chapters) {
      const headings = entry.headings.filter(heading => ['Key Points to Remember', 'Interview Catch'].includes(heading.title))
      expect(headings, entry.title).toHaveLength(2)
      const rendered = renderEntry(entry)
      for (const heading of headings) {
        expect(book.anchors.get(heading.id)).toEqual({ entryId: entry.id, headingId: heading.id })
        expect(rendered).toContain(`id="${heading.id}"`)
        const indexed = book.search.find(result => result.entryId === entry.id && result.id === heading.id)
        expect(indexed, `${entry.title}: ${heading.title}`).toBeDefined()
        if (heading.title === 'Interview Catch') catches.push(indexed!.text)
      }
      const pointsIndex = entry.tokens.findIndex(token => token.type === 'heading' && (token as Tokens.Heading).text === 'Key Points to Remember')
      const list = entry.tokens.slice(pointsIndex + 1).find(token => token.type === 'list') as Tokens.List
      expect(list.items, entry.title).toHaveLength(4)
      for (const label of ['The question:', 'The trap:', 'A stronger answer:', 'Follow-up to expect:']) expect(rendered).toContain(label)
    }
    expect(new Set(catches).size).toBe(32)
    expect([...source.matchAll(/^### Key Points to Remember$/gm)]).toHaveLength(32)
    expect([...source.matchAll(/^### Interview Catch$/gm)]).toHaveLength(32)
  })
  it('supports static hash routes without a server rewrite', () => {
    expect(readRoute('', book.chapters[0].id).view).toBe('system-design')
    expect(readRoute('#/system-design', book.chapters[0].id).view).toBe('system-design')
    expect(readRoute('#/other-topics', book.chapters[0].id).view).toBe('other-topics')
    expect(readRoute('#/read/13-caching-and-freshness?section=the-stale-fill-race', book.chapters[0].id)).toEqual({ view: 'read', entryId: '13-caching-and-freshness', section: 'the-stale-fill-race' })
    expect(readRoute('#/read/%E0%A4%A', book.chapters[0].id).entryId).toBe(book.chapters[0].id)
  })
})