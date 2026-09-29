import DOMPurify from 'dompurify'
import { Marked } from 'marked'
import { askGemini, GeminiError, listGeminiModels, type GeminiMessage, type GeminiReading } from './gemini-client'

const markdown = new Marked({ breaks: true })
const icon = (name: string) => `<i data-lucide="${name}" aria-hidden="true"></i>`
const control = (name: string, action: string, label: string) => `<button type="button" class="icon-button" data-gemini-action="${action}" aria-label="${label}" title="${label}">${icon(name)}</button>`

export function mountGeminiChat(host: HTMLElement, getReading: () => GeminiReading | undefined, enhanceIcons: () => void, beforeOpen: () => void) {
  host.innerHTML = `<button type="button" class="gemini-launcher" data-gemini-action="toggle" aria-controls="gemini-panel" aria-expanded="false" title="Ask Gemini">${icon('sparkles')}<span>Ask Gemini</span></button>
    <aside id="gemini-panel" class="gemini-panel" role="dialog" aria-modal="false" aria-labelledby="gemini-title" hidden>
      <header class="gemini-header"><div><span class="gemini-heading-icon">${icon('sparkles')}</span><div><h2 id="gemini-title">Ask Gemini</h2><span data-gemini-connection>Not connected</span></div></div><div>${control('rotate-ccw', 'clear', 'Start a new Gemini chat')}${control('x', 'close', 'Close Gemini chat')}</div></header>
      <div class="gemini-body">
        <form class="gemini-key-form" data-gemini-key-form autocomplete="off">
          <label for="gemini-key">Your Gemini API key</label><input id="gemini-key" name="gemini-key" type="password" autocomplete="off" spellcheck="false" autocapitalize="none" maxlength="512" placeholder="Enter your API key" required />
          <div class="gemini-key-actions"><a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Get an API key${icon('arrow-up-right')}</a><button type="submit" class="primary-button" data-gemini-connect>${icon('key-round')}Connect</button></div>
          <p class="gemini-privacy">Your key stays in this tab's memory, not browser storage or progress exports. Requests go directly to Google. Only use a personal, restricted key on a site you trust; browser code can access it.</p>
        </form>
        <div class="gemini-model-row" data-gemini-connected hidden><label for="gemini-model" class="sr-only">Gemini model</label><select id="gemini-model" aria-label="Gemini model"></select><button type="button" class="text-button" data-gemini-action="disconnect">Disconnect</button></div>
        <div class="gemini-context"><label><input type="checkbox" id="gemini-include-reading" checked />Include current reading</label><details><summary data-gemini-context-title>No reading selected</summary><p data-gemini-context-preview></p></details></div>
        <div class="gemini-messages" data-gemini-messages role="log" aria-label="Gemini conversation" aria-live="polite" aria-relevant="additions text"></div>
        <div class="gemini-request-status"><p data-gemini-status role="status"></p><button type="button" class="text-button" data-gemini-action="retry" hidden>${icon('rotate-ccw')}Retry question</button><button type="button" class="text-button" data-gemini-action="stop" hidden>${icon('square')}Stop request</button></div>
      </div>
      <form class="gemini-compose" data-gemini-question-form><label for="gemini-question" class="sr-only">Your question for Gemini</label><textarea id="gemini-question" rows="3" maxlength="4000" placeholder="Ask a question about what you're reading..." disabled></textarea><div class="gemini-compose-footer"><small>Google's data terms and usage charges apply. Answers may be wrong.</small><button type="submit" class="icon-button gemini-send" aria-label="Send question to Gemini" title="Send question to Gemini" disabled>${icon('send')}</button></div></form>
    </aside>`

  const query = <ElementType extends HTMLElement>(selector: string) => host.querySelector<ElementType>(selector)!
  const panel = query('#gemini-panel')
  const launcher = query<HTMLButtonElement>('.gemini-launcher')
  const keyInput = query<HTMLInputElement>('#gemini-key')
  const question = query<HTMLTextAreaElement>('#gemini-question')
  const model = query<HTMLSelectElement>('#gemini-model')
  const includeReading = query<HTMLInputElement>('#gemini-include-reading')
  const log = query('[data-gemini-messages]')
  const status = query('[data-gemini-status]')
  const listeners = new AbortController()
  const options = { signal: listeners.signal }
  const home = host.parentElement!
  const supportsPopover = typeof host.showPopover === 'function'
  if (supportsPopover) host.setAttribute('popover', 'manual')
  const placeWidget = () => {
    if (!supportsPopover) return
    const modal = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].filter(dialog => dialog.matches(':modal')).at(-1)
    const parent = modal ?? home
    if (host.parentElement !== parent) {
      if (host.matches(':popover-open')) host.hidePopover()
      parent.append(host)
    }
    if (!host.matches(':popover-open')) host.showPopover()
  }
  const overlays = new MutationObserver(placeWidget)
  overlays.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] })
  placeWidget()
  let key = ''
  let messages: GeminiMessage[] = []
  let reading: GeminiReading | undefined
  let failedReading: GeminiReading | undefined
  let canRetry = false
  let pending: 'connect' | 'answer' | null = null
  let requestController: AbortController | undefined
  let requestId = 0
  let timeout = 0

  const setStatus = (text: string, error = false) => {
    status.textContent = text
    status.classList.toggle('is-error', error)
  }
  const refreshReading = () => {
    if (panel.hidden) return
    reading = getReading()
    includeReading.disabled = !reading
    query('[data-gemini-context-title]').textContent = includeReading.checked && reading ? reading.title : 'No reading context attached'
    query('[data-gemini-context-preview]').textContent = includeReading.checked && reading ? reading.text.slice(0, 10000) : 'Only your question and recent conversation will be sent.'
  }
  const updateControls = () => {
    query('[data-gemini-key-form]').hidden = Boolean(key)
    query('[data-gemini-connected]').hidden = !key
    query('[data-gemini-connection]').textContent = pending === 'connect' ? 'Connecting...' : key ? 'Connected · key in memory' : 'Not connected'
    query<HTMLButtonElement>('[data-gemini-connect]').disabled = Boolean(pending) || !keyInput.value.trim()
    keyInput.disabled = Boolean(pending)
    question.disabled = !key
    model.disabled = Boolean(pending)
    query<HTMLButtonElement>('.gemini-send').disabled = !key || Boolean(pending) || !question.value.trim()
    query('[data-gemini-action="stop"]').hidden = !pending
    query('[data-gemini-action="retry"]').hidden = !key || Boolean(pending) || !canRetry
    log.setAttribute('aria-busy', String(pending === 'answer'))
    enhanceIcons()
  }
  const appendMessage = (message: GeminiMessage, contextTitle?: string, truncated = false) => {
    const article = document.createElement('article')
    article.className = `gemini-message gemini-message-${message.role}`
    const heading = document.createElement('header')
    heading.textContent = message.role === 'user' ? 'You' : 'Gemini'
    const content = document.createElement('div')
    content.className = 'gemini-message-content'
    if (message.role === 'user') content.textContent = message.text
    else {
      content.innerHTML = DOMPurify.sanitize(markdown.parse(message.text, { async: false }), {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a'],
        ALLOWED_ATTR: ['href', 'title'],
      })
      for (const link of content.querySelectorAll<HTMLAnchorElement>('a')) {
        if (!/^https?:\/\//i.test(link.getAttribute('href') ?? '')) link.removeAttribute('href')
        else { link.target = '_blank'; link.rel = 'noopener noreferrer' }
      }
    }
    article.append(heading, content)
    if (contextTitle || truncated) {
      const note = document.createElement('small')
      note.textContent = truncated ? 'Response reached its length limit. Ask a follow-up to continue.' : `Reading attached: ${contextTitle}`
      article.append(note)
    }
    log.append(article)
    while (log.children.length > 40) log.firstElementChild?.remove()
    article.scrollIntoView({ block: 'nearest', behavior: 'instant' })
  }
  const cancel = () => {
    requestId += 1
    requestController?.abort()
    requestController = undefined
    window.clearTimeout(timeout)
    pending = null
    updateControls()
  }
  const begin = (kind: 'connect' | 'answer') => {
    cancel()
    pending = kind
    const controller = new AbortController()
    requestController = controller
    const id = requestId
    timeout = window.setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), kind === 'connect' ? 20000 : 90000)
    updateControls()
    return { controller, id }
  }
  const finish = (id: number) => {
    if (id !== requestId) return
    window.clearTimeout(timeout)
    pending = null
    requestController = undefined
    updateControls()
  }
  const errorText = (error: unknown, controller: AbortController) => controller.signal.aborted ? 'The request timed out. Try again when your connection is stable.' : error instanceof GeminiError ? error.message : 'The request could not be completed. Please try again.'
  const close = () => {
    panel.hidden = true
    launcher.setAttribute('aria-expanded', 'false')
    launcher.focus({ preventScroll: true })
  }
  const open = () => {
    beforeOpen()
    panel.hidden = false
    launcher.setAttribute('aria-expanded', 'true')
    refreshReading()
    ;(key ? question : keyInput).focus({ preventScroll: true })
  }

  const send = async (retry = false) => {
    if (!key || pending) return
    const prompt = retry ? messages.at(-1)?.text ?? '' : question.value.trim()
    if (!prompt) return
    if (prompt.includes(key)) { setStatus('Do not include your API key in a question.', true); return }
    refreshReading()
    const context = includeReading.checked ? retry ? failedReading : reading : undefined
    if (!retry) {
      messages.push({ role: 'user', text: prompt })
      messages = messages.slice(-24)
      appendMessage(messages.at(-1)!, context?.title)
      question.value = ''
    }
    failedReading = context
    canRetry = false
    const { controller, id } = begin('answer')
    setStatus('Gemini is thinking...')
    try {
      const result = await askGemini(key, model.value, messages, context, controller.signal)
      if (id !== requestId) return
      const answer: GeminiMessage = { role: 'model', text: result.text.replaceAll(key, '[key removed]') }
      messages.push(answer)
      messages = messages.slice(-24)
      appendMessage(answer, undefined, result.truncated)
      failedReading = undefined
      setStatus('')
    } catch (error) {
      if (id !== requestId) return
      canRetry = true
      setStatus(errorText(error, controller), true)
    } finally { finish(id) }
  }

  query<HTMLFormElement>('[data-gemini-key-form]').addEventListener('submit', event => {
    event.preventDefault()
    if (pending || !keyInput.value.trim()) return
    const suppliedKey = keyInput.value.trim()
    keyInput.value = ''
    const { controller, id } = begin('connect')
    setStatus('Checking available models...')
    void listGeminiModels(suppliedKey, controller.signal).then(models => {
      if (id !== requestId) return
      key = suppliedKey
      model.replaceChildren(...models.map(item => new Option(`${item.label} (${item.name.slice(7)})`, item.name)))
      setStatus('Connected. Your key will be cleared when this page reloads.')
      finish(id)
      question.focus({ preventScroll: true })
    }).catch(error => {
      if (id !== requestId) return
      setStatus(errorText(error, controller), true)
      finish(id)
    })
  }, options)
  query<HTMLFormElement>('[data-gemini-question-form]').addEventListener('submit', event => { event.preventDefault(); void send() }, options)
  question.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); void send() }
  }, options)
  question.addEventListener('input', updateControls, options)
  keyInput.addEventListener('input', updateControls, options)
  includeReading.addEventListener('change', refreshReading, options)
  host.addEventListener('click', event => {
    const action = (event.target as Element).closest<HTMLElement>('[data-gemini-action]')?.dataset.geminiAction
    if (action === 'toggle') { if (panel.hidden) open(); else close() }
    if (action === 'close') close()
    if (action === 'stop') { canRetry = pending === 'answer'; cancel(); setStatus('Request stopped. Google may still count work already processed.') }
    if (action === 'retry') void send(true)
    if (action === 'clear' || action === 'disconnect') {
      cancel()
      messages = []
      failedReading = undefined
      canRetry = false
      log.replaceChildren()
      question.value = ''
      if (action === 'disconnect') { key = ''; keyInput.value = ''; model.replaceChildren() }
      setStatus(action === 'disconnect' ? 'Disconnected. Key and conversation cleared from this page.' : 'New conversation.')
      updateControls()
      ;(key ? question : keyInput).focus({ preventScroll: true })
    }
  }, options)
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
  }, options)
  window.addEventListener('pagehide', () => { cancel(); key = ''; messages = []; failedReading = undefined; keyInput.value = ''; log.replaceChildren(); updateControls() }, options)
  updateControls()
  return { refreshReading, close, destroy: () => { cancel(); key = ''; messages = []; listeners.abort(); overlays.disconnect(); if (supportsPopover && host.matches(':popover-open')) host.hidePopover(); host.replaceChildren() } }
}