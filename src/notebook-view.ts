import { escapeHtml } from './book'
import { createNotebookNote, groupNotebook, type NotebookNote } from './notebook'
import { notesPdf } from './notes-pdf'

interface NotebookOptions {
  notes: () => NotebookNote[]
  save: (notes: NotebookNote[]) => void
  source: (node: Node) => { entryId: string | null; heading: string }
  exportNotes: () => NotebookNote[]
  beforeOpen: () => void
  enhanceIcons: () => void
}
const icon = (name: string) => `<i data-lucide="${name}" aria-hidden="true"></i>`

export function mountNotebook(host: HTMLElement, options: NotebookOptions) {
  host.innerHTML = `<button type="button" class="notebook-launcher" data-notebook-action="toggle" aria-controls="notebook-panel" aria-expanded="false">${icon('notebook-pen')}<span>My Notes</span><span data-notebook-count>0</span></button>
    <aside id="notebook-panel" class="notebook-panel" role="dialog" aria-modal="false" aria-labelledby="notebook-title" hidden>
      <header class="notebook-header"><div><h2 id="notebook-title">My Notes</h2><span>Personal revision notebook</span></div><button class="icon-button" type="button" data-notebook-action="close" aria-label="Close My Notes" title="Close My Notes">${icon('x')}</button></header>
      <div class="notebook-tools"><label><input type="checkbox" id="notebook-capture" checked />Capture selected text</label><button type="button" class="text-button" data-notebook-action="pdf">${icon('arrow-down-to-line')}Download PDF</button></div>
      <p class="notebook-status" data-notebook-status role="status"></p><div class="notebook-list" data-notebook-list></div>
    </aside>`
  const panel = host.querySelector<HTMLElement>('#notebook-panel')!
  const launcher = host.querySelector<HTMLButtonElement>('.notebook-launcher')!
  const list = host.querySelector<HTMLElement>('[data-notebook-list]')!
  const status = host.querySelector<HTMLElement>('[data-notebook-status]')!
  const capture = host.querySelector<HTMLInputElement>('#notebook-capture')!
  const listeners = new AbortController()
  const events = { signal: listeners.signal }
  let exporting = false

  const refresh = () => {
    const notes = options.notes()
    host.querySelector('[data-notebook-count]')!.textContent = String(notes.length)
    host.querySelector<HTMLButtonElement>('[data-notebook-action="pdf"]')!.disabled = exporting || options.exportNotes().length === 0
    if (panel.hidden || list.contains(document.activeElement)) return
    list.innerHTML = notes.length ? groupNotebook(notes).map(group => `<section class="notebook-topic"><h3>${escapeHtml(group.heading)}</h3>${group.notes.map(note => `<article class="notebook-passage"><label class="sr-only" for="note-${note.id}">Note under ${escapeHtml(note.heading)}</label><textarea id="note-${note.id}" data-notebook-edit="${note.id}" maxlength="20000" rows="4">${escapeHtml(note.text)}</textarea><div><time>${new Date(note.createdAt).toLocaleDateString()}</time>${note.entryId ? `<a href="#/read/${encodeURIComponent(note.entryId)}" title="Open source chapter">Source${icon('arrow-up-right')}</a>` : ''}<button type="button" class="icon-button" data-notebook-delete="${note.id}" aria-label="Delete note" title="Delete note">${icon('trash-2')}</button></div></article>`).join('')}</section>`).join('') : '<p class="notebook-empty">Select a passage in the reading or interview view to add your first note.</p>'
    options.enhanceIcons()
  }
  const close = () => { panel.hidden = true; launcher.setAttribute('aria-expanded', 'false'); launcher.focus({ preventScroll: true }) }
  const open = () => { options.beforeOpen(); panel.hidden = false; launcher.setAttribute('aria-expanded', 'true'); status.textContent = 'Select text in the page. It will be saved with its topic heading.'; refresh() }
  const captureSelection = () => {
    if (panel.hidden || !capture.checked) return
    const selection = window.getSelection()
    if (!selection?.rangeCount || selection.isCollapsed) return
    const range = selection.getRangeAt(0)
    const content = document.querySelector('#main-content')
    if (!content?.contains(range.startContainer) || !content.contains(range.endContainer)) return
    const start = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement
    if (start?.closest('input, textarea, [contenteditable="true"]')) return
    try {
      const source = options.source(range.startContainer)
      const note = createNotebookNote(selection.toString(), source.entryId, source.heading)
      if (options.notes().some(saved => saved.entryId === note.entryId && saved.heading === note.heading && saved.text === note.text)) { status.textContent = 'This passage is already in your notes.'; return }
      if (options.notes().length >= 1000) throw new Error('Your notebook has 1,000 passages. Export and remove older notes before adding more.')
      options.save([...options.notes(), note])
      status.textContent = `Saved under ${note.heading}.`
      refresh()
    } catch (error) { status.textContent = error instanceof Error ? error.message : 'The selection could not be saved.' }
  }
  document.addEventListener('pointerup', event => { if (!host.contains(event.target as Node)) captureSelection() }, events)
  document.addEventListener('keyup', event => { if (event.key === 'Shift' || event.shiftKey) captureSelection() }, events)
  host.addEventListener('input', event => {
    const target = event.target as HTMLTextAreaElement
    if (!target.dataset.notebookEdit) return
    options.save(options.notes().map(note => note.id === target.dataset.notebookEdit ? { ...note, text: target.value, updatedAt: Date.now() } : note))
    status.textContent = 'Note saved.'
  }, events)
  host.addEventListener('click', event => {
    const target = event.target as Element
    const remove = target.closest<HTMLElement>('[data-notebook-delete]')?.dataset.notebookDelete
    if (remove) { options.save(options.notes().filter(note => note.id !== remove)); (document.activeElement as HTMLElement | null)?.blur(); refresh(); status.textContent = 'Note deleted.'; return }
    const action = target.closest<HTMLElement>('[data-notebook-action]')?.dataset.notebookAction
    if (action === 'toggle') { if (panel.hidden) open(); else close() }
    if (action === 'close') close()
    if (action === 'pdf' && !exporting && options.exportNotes().length) {
      exporting = true
      refresh()
      status.textContent = 'Preparing your PDF locally...'
      void notesPdf(options.exportNotes()).then(bytes => {
        const url = URL.createObjectURL(new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' }))
        const link = document.createElement('a')
        link.href = url
        link.download = `study-notes-${new Date().toISOString().slice(0, 10)}.pdf`
        link.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 30000)
        status.textContent = 'PDF downloaded with topic headings and page numbers.'
      }).catch(() => { status.textContent = 'Could not create the PDF. Your notes are still saved.' }).finally(() => { exporting = false; refresh() })
    }
  }, events)
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() } }, events)
  refresh()
  return { refresh, close, destroy: () => { listeners.abort(); host.remove() } }
}