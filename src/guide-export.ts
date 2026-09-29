import type { Tokens } from 'marked'
import { escapeHtml, type Book, type Entry } from './book'
import { displayChapterNumber, formatChapterReferences, sectionForChapter, sectionLabels, type StudySection } from './curriculum'

export function exportGuide(book: Book): string {
  const sections: StudySection[] = ['system-design', 'other-topics']
  const references = book.entries.filter(entry => entry.number === null)
  const topicMap = references.find(entry => entry.title === 'System Design: The Complete Topic Map')
  const titleFor = (entry: Entry) => entry.number === null ? entry.title : `Chapter ${String(displayChapterNumber(book, entry)).padStart(2, '0')}. ${entry.title}`
  const contents = (entries: Entry[]) => entries.map(entry => `- [${titleFor(entry)}](#${entry.id})`).join('\n')
  const render = (entry: Entry) => {
    let headingIndex = 0
    const body = entry.tokens.map(token => {
      if (token.type === 'heading') {
        const heading = entry.headings[headingIndex++]
        const depth = Math.min(6, (token as Tokens.Heading).depth + 1)
        return `<a id="${escapeHtml(heading.id)}"></a>\n\n${'#'.repeat(depth)} ${formatChapterReferences(book, (token as Tokens.Heading).text)}\n\n`
      }
      return token.type === 'code' ? token.raw : formatChapterReferences(book, token.raw)
    }).join('')
    return `<a id="${escapeHtml(entry.id)}"></a>\n\n### ${titleFor(entry)}\n\n${body.trim()}\n`
  }
  const output = ['# System Design Concepts: The Complete Study Guide']
  if (topicMap) output.push('## Topic Index', render(topicMap))
  output.push('## Contents')
  for (const section of sections) {
    const entries = book.chapters.filter(entry => sectionForChapter(entry.number) === section)
    output.push(`### ${sectionLabels[section]}`, contents(entries))
  }
  output.push('### Reference Material', contents(references))
  for (const section of sections) {
    output.push(`## ${sectionLabels[section]}`)
    output.push(...book.chapters.filter(entry => sectionForChapter(entry.number) === section).map(render))
  }
  output.push('## Reference Material', ...references.filter(entry => entry !== topicMap).map(render))
  return `${output.join('\n\n')}\n`
}