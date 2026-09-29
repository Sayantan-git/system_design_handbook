import { describe, expect, it } from 'vitest'
import { createNotebookNote, groupNotebook, validateNotebook } from './notebook'
import { emptyState, mergeState, validateState } from './state'
import { notesDocument, notesPdf } from './notes-pdf'

describe('topic notebook', () => {
  it('preserves selected text, line breaks, and the topic heading as plain text', () => {
    expect(createNotebookNote('  Cache misses\r\nneed bounded fallback.  ', 'chapter-one', 'Cache-aside', 'note-one', 100)).toEqual({ id: 'note-one', entryId: 'chapter-one', heading: 'Cache-aside', text: 'Cache misses\nneed bounded fallback.', createdAt: 100, updatedAt: 100 })
    expect(createNotebookNote('<script>example</script>', null, '', 'note-two').text).toBe('<script>example</script>')
    expect(() => createNotebookNote('  ', null, '')).toThrow('Select')
    expect(() => createNotebookNote('a'.repeat(20001), null, '')).toThrow('shorter')
  })
  it('round-trips new notes without dropping existing chapter notes or accepting unknown sources', () => {
    const note = createNotebookNote('Keep this passage.', 'chapter-one', 'Caching', 'note-one', 100)
    const state = { ...emptyState('chapter-one'), notes: { 'chapter-one': 'Existing notes' }, notebook: [note] }
    expect(validateState(JSON.parse(JSON.stringify(state)), ['chapter-one'])).toEqual(state)
    expect(validateNotebook([note, { ...note, id: 'bad', entryId: 'unknown' }], ['chapter-one'])).toEqual([note])
    expect(validateState({ version: 1, notes: state.notes }, ['chapter-one']).notebook).toEqual([])
    expect(mergeState(state, state).notebook).toHaveLength(1)
  })
  it('groups passages in creation order for a structured export', () => {
    const first = createNotebookNote('First', null, 'DNS', 'one', 100)
    const second = createNotebookNote('Second', null, 'Caching', 'two', 200)
    const third = createNotebookNote('Third', null, 'DNS', 'three', 300)
    expect(groupNotebook([third, second, first])).toEqual([{ heading: 'DNS', notes: [first, third] }, { heading: 'Caching', notes: [second] }])
  })
  it('exports a real PDF with grouped topic headings and complete passages', async () => {
    const notes = [createNotebookNote('A cache hit skips the database.\nA miss requires bounded fallback.', null, 'Caching', 'one', 100)]
    const definition = notesDocument(notes, new Date('2026-09-28T00:00:00Z'))
    expect(JSON.stringify(definition.content)).toContain('Caching')
    expect(JSON.stringify(definition.content)).toContain('bounded fallback')
    const bytes = await notesPdf(notes)
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    expect(bytes.length).toBeGreaterThan(2000)
  })
})