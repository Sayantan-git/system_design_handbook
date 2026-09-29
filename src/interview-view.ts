import { escapeHtml, type Book } from './book'
import { interviewQuestion, interviewTopics, parseInterviewId, questionsPerTopic, shuffledInterviewIds, type InterviewAnswer, type InterviewQuestion } from './interview'
import { numberedTopic, topicRoute } from './lessons'

interface InterviewOptions {
  selected: () => string[]
  select: (topics: string[]) => void
  answers: () => Record<string, InterviewAnswer>
  answer: (id: string, answer: InterviewAnswer) => void
  enhanceIcons: () => void
}
const icon = (name: string) => `<i data-lucide="${name}" aria-hidden="true"></i>`
const button = (action: string, label: string, iconName: string, disabled = false) => `<button type="button" class="secondary-button" data-interview-action="${action}" ${disabled ? 'disabled' : ''}>${icon(iconName)}${label}</button>`
const lessonTopics = new Map(interviewTopics.map(topic => [topic.id, numberedTopic(topic)!]))
const topicLabel = (id: string) => { const topic = lessonTopics.get(id)!; return `${topic.number} ${topic.title}` }

export function mountInterview(root: HTMLElement, book: Book, options: InterviewOptions) {
  const listeners = new AbortController()
  const events = { signal: listeners.signal }
  let mode: 'revise' | 'browse' = 'revise'
  let filter = ''
  let questionFilter = ''
  let deck: string[] = []
  let index = 0
  let pending: number | undefined
  let browsePage = 0
  let active: InterviewQuestion | undefined
  const selected = () => interviewTopics.filter(topic => options.selected().includes(topic.id))
  const selectionKey = () => [...new Set(options.selected())].sort().join('|')
  let previousSelection = selectionKey()
  const href = (topicId: string) => topicRoute(book, lessonTopics.get(topicId)!)
  root.innerHTML = `<div class="view-content interview-view"><header class="view-heading"><div><span class="eyebrow">PRACTICAL REVISION</span><h1>Interview</h1><p class="interview-caption">${interviewTopics.length} topics · 100 scenario variants per topic · No API required</p></div></header>
    <div class="interview-layout"><aside class="interview-picker" aria-label="Interview topic selection"><div class="interview-picker-top"><h2>Choose topics</h2><div>${button('select-all', 'All', 'check-check')}${button('select-none', 'Clear', 'x')}</div></div><label class="sr-only" for="interview-topic-search">Find interview topics</label><input type="search" id="interview-topic-search" placeholder="Find topics" /><div data-interview-topics></div></aside>
    <div class="interview-workspace"><div class="interview-toolbar"><div class="segmented" role="group" aria-label="Interview mode"><button type="button" data-interview-mode="revise">${icon('shuffle')}Random revision</button><button type="button" data-interview-mode="browse">${icon('book-open')}Browse questions</button></div><span data-interview-selection role="status"></span></div><div data-interview-content></div></div></div></div>`
  const topicsRoot = root.querySelector<HTMLElement>('[data-interview-topics]')!
  const content = root.querySelector<HTMLElement>('[data-interview-content]')!

  const renderPicker = () => {
    const terms = filter.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const topics = interviewTopics.filter(topic => terms.every(term => `${topicLabel(topic.id)} ${topic.group} ${topic.coverage}`.toLowerCase().includes(term)))
    const groupNames = [...new Set(topics.map(topic => topic.group))]
    topicsRoot.innerHTML = groupNames.map(group => `<details class="interview-topic-group" ${filter || group === groupNames[0] || topics.some(topic => topic.group === group && options.selected().includes(topic.id)) ? 'open' : ''}><summary>${escapeHtml(group)}</summary>${topics.filter(topic => topic.group === group).map(topic => `<label><input type="checkbox" data-interview-topic="${topic.id}" ${options.selected().includes(topic.id) ? 'checked' : ''} /><span>${escapeHtml(topicLabel(topic.id))}</span><small>100</small></label>`).join('')}</details>`).join('') || '<p class="interview-empty">No matching topics.</p>'
    options.enhanceIcons()
  }
  const feedback = (question: InterviewQuestion, revealed: boolean) => `<div class="interview-explanation"><strong>${revealed ? 'Answer revealed' : 'Answer explanation'}: ${String.fromCharCode(65 + question.correct)}. ${escapeHtml(question.options[question.correct])}</strong><p>${escapeHtml(question.explanation)}</p><a href="${href(question.topicId)}">Read ${escapeHtml(topicLabel(question.topicId))}${icon('arrow-up-right')}</a></div>`
  const currentQuestion = () => { const entry = parseInterviewId(deck[index] ?? ''); return entry ? interviewQuestion(entry.topicId, entry.number) : undefined }
  const renderRevision = () => {
    active = currentQuestion()
    if (!deck.length) {
      content.innerHTML = `<section class="interview-intro"><h2>${selected().length ? 'Ready for a practical interview?' : 'Select one or more topics'}</h2><p>${selected().length ? `${selected().length * questionsPerTopic} questions in the selected bank. A session visits them in shuffled order without repeating a question.` : 'Your revision pool will contain only the topics you select.'}</p>${button('start', 'Start revision', 'shuffle', !selected().length)}<p class="interview-bank-note">Scenario variants revisit topic-specific decisions through 20 interview angles and five operating contexts. They are not a list of unrelated definition questions.</p></section>`
      return
    }
    if (!active) {
      const saved = deck.map(id => options.answers()[id]).filter(Boolean)
      content.innerHTML = `<section class="interview-intro"><h2>Session complete</h2><p>${deck.length} questions visited. ${saved.filter(answer => answer.selected !== null && !answer.revealed).length} answered and ${saved.filter(answer => answer.revealed).length} revealed.</p>${button('start', 'Start a new shuffled session', 'shuffle')}${button('previous', 'Review previous question', 'arrow-left')}</section>`
      return
    }
    const question = active
    const saved = options.answers()[question.id]
    const done = Boolean(saved)
    content.innerHTML = `<section class="interview-question" data-interview-question="${question.id}" data-topic-heading="${escapeHtml(topicLabel(question.topicId))}"><div class="interview-question-meta"><a href="${href(question.topicId)}">${escapeHtml(topicLabel(question.topicId))}</a><span>${index + 1} / ${deck.length}</span></div><div class="interview-tags"><span>${question.scenario}</span><span>${question.angle}</span><span>Topic question ${question.number} / 100</span></div><h2 id="interview-question-title">${escapeHtml(question.prompt)}</h2><fieldset class="answer-options" ${done ? 'disabled' : ''}><legend class="sr-only">Choose the best answer</legend>${question.options.map((option, choice) => `<label class="answer-option ${done && choice === question.correct ? 'correct' : ''} ${done && choice === saved?.selected && choice !== question.correct ? 'incorrect' : ''}"><input type="radio" name="interview-choice" value="${choice}" ${choice === (saved?.selected ?? pending) ? 'checked' : ''} /><span class="answer-letter">${String.fromCharCode(65 + choice)}</span><span>${escapeHtml(option)}</span></label>`).join('')}</fieldset>${done ? `<p class="interview-result" role="status">${saved?.revealed ? 'Reviewed without scoring' : saved?.selected === question.correct ? 'Correct' : 'Not quite. Review the reasoning below.'}</p>${feedback(question, Boolean(saved?.revealed))}` : ''}<div class="interview-question-actions">${button('previous', 'Previous', 'arrow-left', index === 0)}${!done ? button('reveal', 'Show answer', 'eye') + `<button type="button" class="primary-button" data-interview-action="check" ${pending === undefined ? 'disabled' : ''}>${icon('check')}Check answer</button>` : button('retry', 'Try again', 'rotate-ccw')}${button('next', index === deck.length - 1 ? 'Finish session' : 'Next random question', 'arrow-right')}</div><button class="text-button" type="button" data-interview-action="end">Change topics</button></section>`
  }
  const browseIds = () => selected().flatMap(topic => Array.from({ length: questionsPerTopic }, (_, index) => ({ topicId: topic.id, number: index + 1 })))
  const renderBrowse = () => {
    active = undefined
    const terms = questionFilter.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const pool = browseIds().filter(item => !terms.length || terms.every(term => { const question = interviewQuestion(item.topicId, item.number); return `${question.topic} ${question.prompt}`.toLowerCase().includes(term) }))
    const pages = Math.max(1, Math.ceil(pool.length / 10))
    browsePage = Math.min(browsePage, pages - 1)
    content.innerHTML = `<div class="interview-browse-search"><label class="sr-only" for="interview-question-search">Search selected questions</label><input id="interview-question-search" type="search" placeholder="Search selected questions" value="${escapeHtml(questionFilter)}" /><span>${pool.length.toLocaleString()} questions</span></div><div class="interview-bank">${pool.slice(browsePage * 10, browsePage * 10 + 10).map(item => {
      const question = interviewQuestion(item.topicId, item.number)
      return `<article class="interview-bank-question" data-topic-heading="${escapeHtml(topicLabel(question.topicId))}"><header><a href="${href(question.topicId)}">${escapeHtml(topicLabel(question.topicId))}</a><span>${question.number} / 100</span></header><h2>${escapeHtml(question.prompt)}</h2><ol type="A">${question.options.map(option => `<li>${escapeHtml(option)}</li>`).join('')}</ol><details><summary>Show answer and explanation${icon('chevron-down')}</summary>${feedback(question, true)}</details></article>`
    }).join('') || '<p class="interview-empty">Choose topics or clear the search to view their questions.</p>'}</div><div class="interview-bank-pagination">${button('page-back', 'Previous page', 'arrow-left', browsePage === 0)}<span>${browsePage + 1} / ${pages}</span>${button('page-next', 'Next page', 'arrow-right', browsePage >= pages - 1)}</div>`
  }
  const renderContent = () => {
    root.querySelector('[data-interview-selection]')!.textContent = `${selected().length} topic${selected().length === 1 ? '' : 's'} · ${(selected().length * questionsPerTopic).toLocaleString()} questions`
    root.querySelectorAll<HTMLElement>('[data-interview-mode]').forEach(button => { button.classList.toggle('active', button.dataset.interviewMode === mode); button.setAttribute('aria-pressed', String(button.dataset.interviewMode === mode)) })
    if (mode === 'revise') renderRevision()
    else renderBrowse()
    options.enhanceIcons()
  }
  const resetPool = () => { deck = []; index = 0; pending = undefined; browsePage = 0; previousSelection = selectionKey(); renderContent() }
  root.addEventListener('input', event => {
    const input = event.target as HTMLInputElement
    if (input.id === 'interview-topic-search') { filter = input.value; renderPicker() }
    if (input.name === 'interview-choice') { pending = Number(input.value); content.querySelector<HTMLButtonElement>('[data-interview-action="check"]')!.disabled = false }
  }, events)
  root.addEventListener('change', event => {
    const input = event.target as HTMLInputElement
    if (input.dataset.interviewTopic) {
      options.select(input.checked ? [...new Set([...options.selected(), input.dataset.interviewTopic])] : options.selected().filter(id => id !== input.dataset.interviewTopic))
      resetPool()
    }
    if (input.id === 'interview-question-search') { questionFilter = input.value; browsePage = 0; renderContent() }
  }, events)
  root.addEventListener('click', event => {
    const target = event.target as Element
    const modeControl = target.closest<HTMLElement>('[data-interview-mode]')
    if (modeControl) { mode = modeControl.dataset.interviewMode as typeof mode; renderContent(); return }
    const action = target.closest<HTMLElement>('[data-interview-action]')?.dataset.interviewAction
    if (action === 'select-all' || action === 'select-none') {
      options.select(action === 'select-all' ? interviewTopics.map(topic => topic.id) : [])
      resetPool(); renderPicker(); return
    }
    if (action === 'start') { deck = shuffledInterviewIds(options.selected()); index = 0; pending = undefined; renderContent() }
    if (action === 'next' || action === 'previous') { index = Math.max(0, Math.min(deck.length, index + (action === 'next' ? 1 : -1))); pending = undefined; renderContent() }
    if (action === 'check' && active && pending !== undefined) { options.answer(active.id, { selected: pending, revealed: false, updatedAt: Date.now() }); renderContent() }
    if (action === 'reveal' && active) { options.answer(active.id, { selected: pending ?? null, revealed: true, updatedAt: Date.now() }); renderContent() }
    if (action === 'retry' && active) { options.answer(active.id, { selected: null, revealed: false, updatedAt: Date.now() }); pending = undefined; renderContent() }
    if (action === 'end') resetPool()
    if (action === 'page-back' || action === 'page-next') { browsePage += action === 'page-next' ? 1 : -1; renderContent(); content.scrollIntoView({ block: 'start' }) }
    if (action && ['start', 'next', 'previous'].includes(action)) { content.scrollIntoView({ block: 'start' }); content.querySelector<HTMLElement>('h2')?.setAttribute('tabindex', '-1'); content.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true }) }
  }, events)
  renderPicker(); renderContent()
  return {
    refresh: () => { renderPicker(); if (selectionKey() !== previousSelection) resetPool(); else renderContent() },
    context: () => active ? { heading: topicLabel(active.topicId), chapter: active.chapter, text: `${active.prompt}\n${active.options.join('\n')}` } : undefined,
    destroy: () => listeners.abort(),
  }
}