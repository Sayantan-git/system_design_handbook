import { Marked, type Token, type Tokens } from 'marked'
import markedKatex from 'marked-katex-extension'

export type Part = 'foundations' | 'systems' | 'applied' | 'reference'
export interface Heading { id: string; title: string; depth: number }
export interface Entry {
  id: string
  title: string
  number: number | null
  part: Part
  tokens: Token[]
  headings: Heading[]
  text: string
  words: number
  minutes: number
  diagrams: number
}
export interface Anchor { entryId: string; headingId?: string }
export interface Video { number: number; title: string; url: string; coverage: string }
export interface SearchRecord { id: string; entryId: string; title: string; chapter: string; text: string; topicKey?: string }
export interface Week { number: number; reading: string; outcome: string; chapters: number[] }
export interface Book {
  entries: Entry[]
  chapters: Entry[]
  anchors: Map<string, Anchor>
  videos: Video[]
  weeks: Week[]
  search: SearchRecord[]
  words: number
  diagrams: number
}

type AnchoredHeading = Tokens.Heading & { anchor?: string }
export const slug = (value: string) => value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/ /g, '-')
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!))

export function renderDiagramControls(expanded = false): string {
  const control = (icon: string, action: string, label: string, attributes = '') => `<button type="button" class="icon-button" data-action="${action}" title="${label}" aria-label="${label}" ${attributes}><i data-lucide="${icon}" aria-hidden="true"></i></button>`
  return `<div class="diagram-controls" role="group" aria-label="Diagram controls">${control('hand', 'pan-diagram', 'Pan diagram', 'aria-pressed="false" disabled')}${control('minus', 'zoom-out', 'Zoom out', 'disabled')}<output data-diagram-zoom aria-label="Diagram zoom">100%</output>${control('plus', 'zoom-in', 'Zoom in', 'disabled')}${control('scan', 'zoom-reset', 'Fit diagram', 'disabled')}${control('arrow-down-to-line', 'download-diagram', 'Download diagram SVG', 'disabled')}${expanded ? control('x', 'close-dialog', 'Close diagram') : control('maximize-2', 'expand-diagram', 'Expand diagram', 'disabled')}</div>`
}

export function renderDiagramPlayback(): string {
  const control = (icon: string, action: string, label: string) => `<button type="button" class="icon-button" data-diagram-playback-action="${action}" title="${label}" aria-label="${label}" disabled>${action === 'play' ? '<span data-diagram-play-icon><i data-lucide="play" aria-hidden="true"></i></span><span data-diagram-pause-icon hidden><i data-lucide="pause" aria-hidden="true"></i></span>' : `<i data-lucide="${icon}" aria-hidden="true"></i>`}</button>`
  return `<div class="diagram-playback" data-diagram-playback hidden>
    <div class="diagram-playback-heading"><strong>Data flow</strong><span data-diagram-flow-kind></span><output data-diagram-flow-count aria-label="Data flow step count"></output></div>
    <div class="diagram-flow-participants" data-diagram-flow-participants role="group" aria-label="Diagram participants"></div>
    <div class="diagram-playback-toolbar"><div class="diagram-playback-buttons" role="group" aria-label="Data flow playback">${control('rotate-ccw', 'restart', 'Restart data flow')}${control('arrow-left', 'previous', 'Previous data flow step')}${control('play', 'play', 'Play data flow')}${control('arrow-right', 'next', 'Next data flow step')}</div><select data-diagram-flow-step aria-label="Data flow step" disabled></select><select data-diagram-flow-speed aria-label="Data flow speed" disabled><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="1.5">1.5x</option><option value="2">2x</option></select></div>
    <div class="diagram-flow-detail"><strong data-diagram-flow-route></strong><p data-diagram-flow-message></p></div>
    <div class="diagram-flow-history" data-diagram-flow-history role="group" aria-label="Diagram activity"></div>
    <input type="range" data-diagram-flow-progress aria-label="Data flow progress" min="1" max="1" value="1" disabled />
    <span class="sr-only" data-diagram-flow-announcement role="status" aria-live="polite"></span>
  </div>`
}

export const markdown = new Marked(markedKatex({ throwOnError: false, output: 'html', strict: 'ignore' }))
markdown.use({ renderer: {
  heading(token: Tokens.Heading) {
    const id = (token as AnchoredHeading).anchor ?? slug(token.text)
    return `<h${token.depth} id="${escapeHtml(id)}">${this.parser.parseInline(token.tokens)}</h${token.depth}>`
  },
  link(token: Tokens.Link) {
    const safe = /^(https?:|#)/i.test(token.href)
    if (!safe) return this.parser.parseInline(token.tokens)
    const external = /^https?:/i.test(token.href)
    return `<a href="${escapeHtml(token.href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${this.parser.parseInline(token.tokens)}</a>`
  },
  code(token: Tokens.Code) {
    if (token.lang === 'mermaid') {
      return `<figure class="diagram" data-diagram><figcaption class="diagram-bar"><span class="diagram-caption"><i data-lucide="network" aria-hidden="true"></i><span data-diagram-title>Architecture diagram</span></span>${renderDiagramControls()}</figcaption><div class="diagram-stage" tabindex="0" role="region" aria-label="Architecture diagram" aria-busy="true"><span class="diagram-loading">Loading the diagram...</span></div><div class="diagram-selection" role="status" aria-live="polite" hidden></div>${renderDiagramPlayback()}<pre class="diagram-source" hidden>${escapeHtml(token.text)}</pre></figure>`
    }
    return `<div class="code-block"><div class="code-bar"><span>${escapeHtml(token.lang || 'text')}</span><button type="button" class="icon-button" data-action="copy-code" title="Copy code" aria-label="Copy code"><i data-lucide="copy"></i></button></div><pre><code>${escapeHtml(token.text)}</code></pre></div>`
  },
  table(token: Tokens.Table) {
    const row = (cells: Tokens.TableCell[], tag: string) => `<tr>${cells.map(cell => `<${tag}>${this.parser.parseInline(cell.tokens)}</${tag}>`).join('')}</tr>`
    return `<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable reference table"><table><thead>${row(token.header, 'th')}</thead><tbody>${token.rows.map(cells => row(cells, 'td')).join('')}</tbody></table></div>`
  },
} })

export function plainText(tokens: Token[]): string {
  return tokens.map(token => {
    if (token.type === 'table') {
      const table = token as Tokens.Table
      return [...table.header, ...table.rows.flat()].map(cell => plainText(cell.tokens)).join(' ')
    }
    if (token.type === 'list') return (token as Tokens.List).items.map(item => plainText(item.tokens)).join(' ')
    if ('tokens' in token && Array.isArray(token.tokens)) return plainText(token.tokens)
    if ('text' in token && typeof token.text === 'string') return token.text
    return ''
  }).join(' ').replace(/\s+/g, ' ').trim()
}

export function parseBook(source: string): Book {
  const entries: Entry[] = []
  const anchors = new Map<string, Anchor>()
  const used = new Map<string, number>()
  const search: SearchRecord[] = []
  let current: Entry | null = null
  let searchHeading: Heading | null = null
  let searchTokens: Token[] = []
  const nextAnchor = (title: string) => {
    const base = slug(title)
    const count = used.get(base) ?? 0
    used.set(base, count + 1)
    return count ? `${base}-${count}` : base
  }
  const flushSearch = () => {
    if (current && searchTokens.length) search.push({
      id: searchHeading?.id ?? current.id,
      entryId: current.id,
      title: searchHeading?.title ?? current.title,
      chapter: current.title,
      text: plainText(searchTokens),
    })
    searchTokens = []
  }
  for (const token of markdown.lexer(source)) {
    if (token.type === 'heading') {
      const heading = token as AnchoredHeading
      const id = nextAnchor(plainText(heading.tokens))
      heading.anchor = id
      if (heading.depth === 1) continue
      if (heading.depth === 2) {
        flushSearch()
        searchHeading = null
        if (heading.text === 'Contents') { current = null; continue }
        const number = /^(\d+)\. /.exec(heading.text)
        const chapterNumber = number ? Number(number[1]) : null
        current = {
          id, title: heading.text.replace(/^\d+\. /, ''), number: chapterNumber,
          part: chapterNumber === null ? 'reference' : chapterNumber <= 18 ? 'foundations' : chapterNumber <= 29 ? 'systems' : 'applied',
          tokens: [], headings: [], text: '', words: 0, minutes: 0, diagrams: 0,
        }
        entries.push(current)
        anchors.set(id, { entryId: id })
        continue
      }
      if (current) {
        flushSearch()
        searchHeading = { id, title: plainText(heading.tokens), depth: heading.depth }
        current.headings.push(searchHeading)
        anchors.set(id, { entryId: current.id, headingId: id })
      }
    }
    if (current) {
      current.tokens.push(token)
      searchTokens.push(token)
    }
  }
  flushSearch()
  for (const entry of entries) {
    entry.text = plainText(entry.tokens)
    entry.words = entry.text.split(/\s+/).filter(Boolean).length
    entry.minutes = Math.max(1, Math.ceil(entry.words / 200))
    entry.diagrams = entry.tokens.filter(token => token.type === 'code' && (token as Tokens.Code).lang === 'mermaid').length
  }
  const videos: Video[] = []
  const weeks: Week[] = []
  for (const entry of entries) for (const token of entry.tokens) {
    if (token.type !== 'table') continue
    const table = token as Tokens.Table
    const first = plainText(table.header[0]?.tokens ?? [])
    if (first === 'No.') for (const cells of table.rows) {
      const link = cells[1]?.tokens.find(item => item.type === 'link') as Tokens.Link | undefined
      if (link && link.href.startsWith('https://www.youtube.com/watch?')) videos.push({
        number: Number(cells[0].text), title: plainText(link.tokens), url: link.href, coverage: plainText(cells[2]?.tokens ?? []),
      })
    }
    if (first === 'Week' && entry.number === 32) for (const cells of table.rows) {
      const reading = plainText(cells[1]?.tokens ?? [])
      const range = /Chapters? (\d+)(?:-(\d+))?/.exec(reading)
      const start = Number(range?.[1] ?? 0)
      const end = Number(range?.[2] ?? start)
      weeks.push({ number: Number(cells[0].text), reading, outcome: plainText(cells[2]?.tokens ?? []), chapters: Array.from({ length: end - start + 1 }, (_, index) => start + index) })
    }
  }
  const chapters = entries.filter(entry => entry.number !== null)
  return { entries, chapters, anchors, videos, weeks, search, words: chapters.reduce((sum, entry) => sum + entry.words, 0), diagrams: entries.reduce((sum, entry) => sum + entry.diagrams, 0) }
}

export function renderEntry(entry: Entry): string {
  return markdown.parser(entry.tokens)
}

export const partLabels: Record<Part, string> = {
  foundations: 'System design foundations', systems: 'Communication & reliability', applied: 'Worked designs & practice', reference: 'Reference library',
}

export function readRoute(hash: string, fallbackId: string): { view: string; entryId: string; section?: string; topic?: string } {
  const path = hash.replace(/^#\/?/, '').split('?')
  const pieces = (path[0] || 'system-design').split('/')
  const view = ['system-design', 'other-topics', 'read', 'practice', 'interview', 'tracker', 'roadmap', 'library'].includes(pieces[0]) ? pieces[0] : 'system-design'
  let entryId = fallbackId
  try { entryId = decodeURIComponent(pieces[1] || fallbackId) } catch { entryId = fallbackId }
  const query = new URLSearchParams(path[1] || '')
  const section = query.get('section') || undefined
  const topic = query.get('topic') || undefined
  return { view, entryId, section, ...(topic ? { topic } : {}) }
}