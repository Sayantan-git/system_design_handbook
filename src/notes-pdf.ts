import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import { groupNotebook, type NotebookNote } from './notebook'

export function notesDocument(notes: NotebookNote[], date = new Date()): TDocumentDefinitions {
  const content: Content[] = [
    { text: 'My Study Notes', style: 'title' },
    { text: `System Design Studio  |  ${date.toISOString().slice(0, 10)}  |  ${notes.length} saved passages`, style: 'subtitle' },
  ]
  for (const group of groupNotebook(notes)) {
    content.push({ text: group.heading, style: 'topic', headlineLevel: 1 })
    for (const note of group.notes) content.push({ text: note.text, style: 'passage' })
  }
  return {
    info: { title: 'My Study Notes', author: 'System Design Studio', subject: 'Personal topic-based revision notes' },
    pageSize: 'A4', pageMargins: [44, 48, 44, 48],
    defaultStyle: { font: 'Roboto', fontSize: 11, color: '#202b38', lineHeight: 1.3 },
    styles: {
      title: { fontSize: 25, bold: true, margin: [0, 0, 0, 8] },
      subtitle: { fontSize: 9, color: '#586675', margin: [0, 0, 0, 26] },
      topic: { fontSize: 16, bold: true, color: '#096c75', margin: [0, 20, 0, 11] },
      passage: { margin: [0, 0, 0, 14] },
    },
    content,
    footer: (page, total) => ({ text: `System Design Studio  |  ${page} / ${total}`, alignment: 'center', fontSize: 9, color: '#687583', margin: [0, 16, 0, 0] }),
    pageBreakBefore: (node, following) => node.headlineLevel === 1 && following.length === 0,
  }
}

export async function notesPdf(notes: NotebookNote[]): Promise<Uint8Array> {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')])
  return new Promise(resolve => pdfMake.createPdf(notesDocument(notes), undefined, undefined, fonts as unknown as typeof pdfMake.vfs).getBuffer(buffer => resolve(Uint8Array.from(buffer))))
}