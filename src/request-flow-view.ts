import { escapeHtml, type Book } from './book'
import { resolveTopic } from './curriculum'
import { requestFlowConcerns, requestFlowConnections, requestFlowNodes, requestFlows, requestFlowTopics } from './request-flow'

const viewState = { scenario: 'read', step: 0, speed: 1 }
const phaseLabels = { request: 'Request', response: 'Response', background: 'Background work' }
const layerLabels = { client: 'Client', edge: 'Edge', compute: 'Application', data: 'Data', async: 'Background' }
const flowIcon = (name: string) => `<i data-lucide="${name}" aria-hidden="true"></i>`
const flowButton = (name: string, action: string, label: string) => `<button type="button" class="icon-button" data-flow-action="${action}" aria-label="${label}" title="${label}">${flowIcon(name)}</button>`

export function renderRequestFlow(): string {
  return `<section class="request-flow" aria-labelledby="request-flow-title">
    <header class="flow-heading"><div><span class="eyebrow">THE LIFE OF A REQUEST</span><h2 id="request-flow-title">From the user. Back to the user.</h2></div><div class="segmented flow-scenarios" role="group" aria-label="Request scenario">${requestFlows.map(flow => `<button type="button" data-flow-scenario="${flow.id}" aria-pressed="${flow.id === viewState.scenario}" class="${flow.id === viewState.scenario ? 'active' : ''}">${escapeHtml(flow.label)}</button>`).join('')}</div></header>
    <div class="flow-context"><code data-flow-request></code><p data-flow-summary></p></div>
    <div class="flow-toolbar"><div class="flow-playback" role="group" aria-label="Playback controls">${flowButton('rotate-ccw', 'restart', 'Restart request flow')}${flowButton('arrow-left', 'previous', 'Previous flow step')}${flowButton('play', 'play', 'Play request flow')}${flowButton('arrow-right', 'next', 'Next flow step')}</div><label class="flow-step-select"><span class="sr-only">Request flow step</span><select data-flow-step></select></label><label class="flow-speed"><span class="sr-only">Playback speed</span><select data-flow-speed><option value="0.5">0.5x</option><option value="1">1x</option><option value="1.5">1.5x</option><option value="2">2x</option></select></label><output data-flow-count aria-label="Step count"></output></div>
    <div class="flow-timeline"><input type="range" min="1" max="1" value="1" data-flow-progress aria-label="Request flow progress" /><div class="flow-legend"><span class="flow-request">${flowIcon('arrow-right')}Request</span><span class="flow-response">${flowIcon('arrow-left')}Response</span><span class="flow-background">${flowIcon('workflow')}Background</span></div></div>
    <div class="flow-layout"><div class="flow-map-wrap"><div class="flow-map" role="group" aria-label="Request and response architecture">
      <svg class="flow-connections" aria-hidden="true"><defs><marker id="request-flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker></defs>${requestFlowConnections.map(([from, to]) => `<path class="flow-wire" data-flow-wire="${from}:${to}" fill="none" marker-end="url(#request-flow-arrow)" />`).join('')}<circle class="flow-packet" r="4.5" visibility="hidden" /></svg>
      ${requestFlowNodes.map(node => `<button type="button" class="flow-node" data-flow-node="${node.id}" data-layer="${node.layer}" aria-pressed="false" title="${escapeHtml(node.label)}"><span class="flow-node-symbol">${flowIcon(node.icon)}</span><strong>${escapeHtml(node.label)}</strong><span class="flow-node-layer">${layerLabels[node.layer]}</span></button>`).join('')}
    </div><p class="flow-scope">One illustrative deployment. DNS is a lookup, not a proxy. Edge caches and background workers are optional; gateways and load balancers may be combined.</p></div><aside class="flow-detail" aria-label="Flow explanation"></aside></div>
    <div class="flow-concerns"><span class="eyebrow">ACROSS EVERY HOP</span><div role="group" aria-label="Cross-cutting concepts">${requestFlowConcerns.map(concern => `<button type="button" data-flow-concern="${concern.id}" aria-pressed="false">${flowIcon(concern.icon)}<span>${escapeHtml(concern.label)}</span>${flowIcon('chevron-right')}</button>`).join('')}</div></div>
    <span class="sr-only" data-flow-announcement role="status" aria-live="polite"></span>
  </section>`
}

export function mountRequestFlow(container: HTMLElement, book: Book, enhanceIcons: () => void): () => void {
  const root = container.querySelector<HTMLElement>('.request-flow')!
  const query = <ElementType extends Element = HTMLElement>(selector: string) => root.querySelector<ElementType>(selector)!
  const map = query('.flow-map')
  const svg = query<SVGSVGElement>('.flow-connections')
  const packet = query<SVGCircleElement>('.flow-packet')
  const detail = query('.flow-detail')
  const stepSelect = query<HTMLSelectElement>('[data-flow-step]')
  const progress = query<HTMLInputElement>('[data-flow-progress]')
  const playButton = query<HTMLButtonElement>('[data-flow-action="play"]')
  const listeners = new AbortController()
  const listenerOptions = { signal: listeners.signal }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  let flow = requestFlows.find(flow => flow.id === viewState.scenario) ?? requestFlows[0]
  let stepIndex = Math.min(viewState.step, flow.steps.length - 1)
  let playing = false
  let inspectedNode: string | null = null
  let inspectedConcern: string | null = null
  let frame = 0
  let elapsed = 0
  let previousFrame = 0
  let activePath: SVGPathElement | null = null
  let reversePath = false

  const topicLinks = (titles: string[]) => requestFlowTopics(titles).map(topic => {
    const { entry, section } = resolveTopic(book, topic)
    const href = `#/read/${encodeURIComponent(entry.id)}${section ? `?section=${encodeURIComponent(section)}` : ''}`
    return `<a href="${href}" class="flow-topic-link"><span>${escapeHtml(topic.title)}</span><span>View more${flowIcon('arrow-up-right')}</span></a>`
  }).join('')

  const updatePlayback = () => {
    root.classList.toggle('is-playing', playing)
    root.dataset.playing = String(playing)
    playButton.innerHTML = flowIcon(playing ? 'pause' : 'play')
    playButton.title = reducedMotion.matches ? 'Playback disabled for reduced motion' : playing ? 'Pause request flow' : 'Play request flow'
    playButton.setAttribute('aria-label', playButton.title)
    playButton.disabled = reducedMotion.matches
    query<HTMLButtonElement>('[data-flow-action="previous"]').disabled = stepIndex === 0
    query<HTMLButtonElement>('[data-flow-action="next"]').disabled = stepIndex === flow.steps.length - 1
    enhanceIcons()
  }

  const pause = () => {
    playing = false
    cancelAnimationFrame(frame)
    frame = 0
    previousFrame = 0
    updatePlayback()
  }

  const paintPacket = () => {
    if (!activePath || inspectedNode || inspectedConcern || reducedMotion.matches) {
      packet.setAttribute('visibility', 'hidden')
      return
    }
    const fraction = Math.min(1, elapsed / (2600 / viewState.speed))
    const point = activePath.getPointAtLength(activePath.getTotalLength() * (reversePath ? 1 - fraction : fraction))
    packet.setAttribute('cx', String(point.x))
    packet.setAttribute('cy', String(point.y))
    packet.setAttribute('visibility', 'visible')
  }

  const updateMap = () => {
    const step = flow.steps[stepIndex]
    const visited = new Set(flow.steps.slice(0, stepIndex).map(step => step.node))
    const used = new Set(flow.steps.map(step => step.node))
    for (const control of root.querySelectorAll<HTMLElement>('[data-flow-node]')) {
      const nodeId = control.dataset.flowNode!
      const selected = nodeId === (inspectedNode ?? step.node) && !inspectedConcern
      control.classList.toggle('is-current', selected)
      control.classList.toggle('is-visited', visited.has(nodeId))
      control.classList.toggle('is-unused', !used.has(nodeId))
      control.setAttribute('aria-pressed', String(selected))
    }
    activePath = null
    for (const path of root.querySelectorAll<SVGPathElement>('[data-flow-wire]')) {
      const [from, to] = path.dataset.flowWire!.split(':')
      const direct = step.from === from && step.node === to
      const reverse = step.from === to && step.node === from
      const active = (direct || reverse) && !inspectedNode && !inspectedConcern
      path.classList.toggle('is-active', active)
      path.classList.toggle('is-unused', !used.has(from) || !used.has(to))
      path.setAttribute('marker-start', active && reverse ? 'url(#request-flow-arrow)' : 'none')
      path.setAttribute('marker-end', active && reverse ? 'none' : 'url(#request-flow-arrow)')
      if (active) { activePath = path; reversePath = reverse }
    }
    root.dataset.phase = step.phase
    paintPacket()
  }

  const drawConnections = () => {
    const bounds = map.getBoundingClientRect()
    svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`)
    for (const path of root.querySelectorAll<SVGPathElement>('[data-flow-wire]')) {
      const [from, to] = path.dataset.flowWire!.split(':')
      const start = query(`[data-flow-node="${from}"]`).getBoundingClientRect()
      const end = query(`[data-flow-node="${to}"]`).getBoundingClientRect()
      const startX = start.left - bounds.left + start.width / 2
      const startY = start.top - bounds.top + start.height / 2
      const endX = end.left - bounds.left + end.width / 2
      const endY = end.top - bounds.top + end.height / 2
      let route: string
      if (from === 'worker' && to === 'database') {
        const returnLane = end.bottom - bounds.top + 20
        route = `M ${start.right - bounds.left} ${startY} H ${bounds.width - 6} V ${returnLane} H ${endX} V ${end.bottom - bounds.top}`
      } else if (from === 'service' && to === 'database' && Math.abs(startY - endY) < 2) {
        const lane = start.top - bounds.top - 23
        route = `M ${startX} ${start.top - bounds.top} V ${lane} H ${endX} V ${end.top - bounds.top}`
      } else if (Math.abs(startY - endY) < 2) {
        route = `M ${startX + (endX > startX ? start.width / 2 : -start.width / 2)} ${startY} H ${endX + (endX > startX ? -end.width / 2 : end.width / 2)}`
      } else if (Math.abs(startX - endX) < 2) {
        route = `M ${startX} ${startY + (endY > startY ? start.height / 2 : -start.height / 2)} V ${endY + (endY > startY ? -end.height / 2 : end.height / 2)}`
      } else {
        const sourceY = startY + (endY > startY ? start.height / 2 : -start.height / 2)
        const targetY = endY + (endY > startY ? -end.height / 2 : end.height / 2)
        route = `M ${startX} ${sourceY} V ${(sourceY + targetY) / 2} H ${endX} V ${targetY}`
      }
      path.setAttribute('d', route)
    }
    paintPacket()
  }

  const showStep = (announce = true) => {
    const step = flow.steps[stepIndex]
    const node = requestFlowNodes.find(node => node.id === (inspectedNode ?? step.node))!
    const concern = requestFlowConcerns.find(concern => concern.id === inspectedConcern)
    const title = concern?.label ?? (inspectedNode ? node.label : step.title)
    const explanation = concern?.explanation ?? (inspectedNode ? node.summary : step.explanation)
    const topics = concern?.topics ?? (!inspectedNode && step.topics ? step.topics : node.topics)
    viewState.scenario = flow.id
    viewState.step = stepIndex
    stepSelect.value = String(stepIndex)
    progress.value = String(stepIndex + 1)
    progress.setAttribute('aria-valuetext', `Step ${stepIndex + 1} of ${flow.steps.length}: ${step.title}`)
    query('[data-flow-count]').textContent = `${String(stepIndex + 1).padStart(2, '0')} / ${flow.steps.length}`
    detail.innerHTML = `<div class="flow-detail-heading"><span class="flow-detail-icon">${flowIcon(concern?.icon ?? node.icon)}</span><span class="eyebrow">${concern ? 'ACROSS EVERY HOP' : inspectedNode ? layerLabels[node.layer] : `${phaseLabels[step.phase]} / STEP ${String(stepIndex + 1).padStart(2, '0')}`}</span></div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(explanation)}</p>${!concern && !inspectedNode ? `<div class="flow-payload"><span>DATA IN FLIGHT</span><code>${escapeHtml(step.payload)}</code></div>` : ''}<h4>Concepts here</h4><div class="flow-topic-links">${topicLinks(topics)}</div>`
    detail.scrollTop = 0
    root.querySelectorAll<HTMLButtonElement>('[data-flow-concern]').forEach(control => control.setAttribute('aria-pressed', String(control.dataset.flowConcern === inspectedConcern)))
    if (announce && !playing) query('[data-flow-announcement]').textContent = title
    updateMap()
    updatePlayback()
  }

  const animate = (timestamp: number) => {
    if (listeners.signal.aborted) return
    if (previousFrame) elapsed += timestamp - previousFrame
    previousFrame = timestamp
    paintPacket()
    if (elapsed >= 5200 / viewState.speed) {
      if (playing && stepIndex < flow.steps.length - 1) {
        stepIndex += 1
        elapsed = 0
        showStep(false)
      } else {
        pause()
        return
      }
    }
    frame = requestAnimationFrame(animate)
  }

  const jumpTo = (index: number) => {
    pause()
    inspectedNode = null
    inspectedConcern = null
    stepIndex = Math.min(flow.steps.length - 1, Math.max(0, index))
    elapsed = 0
    showStep()
    if (!reducedMotion.matches) frame = requestAnimationFrame(animate)
  }

  const setScenario = (id: string, restore = false) => {
    pause()
    flow = requestFlows.find(flow => flow.id === id) ?? requestFlows[0]
    stepSelect.innerHTML = flow.steps.map((step, index) => `<option value="${index}">${String(index + 1).padStart(2, '0')} / ${escapeHtml(step.title)}</option>`).join('')
    progress.max = String(flow.steps.length)
    query('[data-flow-request]').textContent = flow.request
    query('[data-flow-summary]').textContent = flow.summary
    root.querySelectorAll<HTMLButtonElement>('[data-flow-scenario]').forEach(control => {
      control.classList.toggle('active', control.dataset.flowScenario === flow.id)
      control.setAttribute('aria-pressed', String(control.dataset.flowScenario === flow.id))
    })
    jumpTo(restore ? stepIndex : 0)
  }

  root.addEventListener('click', event => {
    const target = event.target as Element
    const scenario = target.closest<HTMLButtonElement>('[data-flow-scenario]')
    if (scenario) { setScenario(scenario.dataset.flowScenario!); return }
    const component = target.closest<HTMLButtonElement>('[data-flow-node]')
    const concern = target.closest<HTMLButtonElement>('[data-flow-concern]')
    if (component || concern) {
      pause()
      inspectedNode = component?.dataset.flowNode ?? null
      inspectedConcern = concern?.dataset.flowConcern ?? null
      showStep()
      if (matchMedia('(max-width: 760px)').matches) detail.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'instant' : 'smooth' })
      return
    }
    const action = target.closest<HTMLButtonElement>('[data-flow-action]')?.dataset.flowAction
    if (action === 'previous') jumpTo(stepIndex - 1)
    if (action === 'next') jumpTo(stepIndex + 1)
    if (action === 'restart') jumpTo(0)
    if (action === 'play' && !reducedMotion.matches) {
      if (playing) { pause(); return }
      cancelAnimationFrame(frame)
      if (stepIndex === flow.steps.length - 1) { stepIndex = 0; elapsed = 0 }
      inspectedNode = null
      inspectedConcern = null
      playing = true
      previousFrame = 0
      showStep(false)
      frame = requestAnimationFrame(animate)
    }
    if (target.closest('.flow-topic-link')) pause()
  }, listenerOptions)
  root.addEventListener('change', event => {
    const target = event.target as HTMLSelectElement
    if (target.matches('[data-flow-step]')) jumpTo(Number(target.value))
    if (target.matches('[data-flow-speed]')) viewState.speed = Number(target.value)
  }, listenerOptions)
  progress.addEventListener('input', () => jumpTo(Number(progress.value) - 1), listenerOptions)
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') pause()
  }, listenerOptions)
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause() }, listenerOptions)
  reducedMotion.addEventListener('change', () => { pause(); paintPacket() }, listenerOptions)
  window.addEventListener('resize', drawConnections, listenerOptions)
  const resize = new ResizeObserver(drawConnections)
  resize.observe(map)
  const visibility = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) pause() })
  visibility.observe(root)
  query<HTMLSelectElement>('[data-flow-speed]').value = String(viewState.speed)
  setScenario(flow.id, true)
  drawConnections()
  return () => {
    listeners.abort()
    cancelAnimationFrame(frame)
    resize.disconnect()
    visibility.disconnect()
  }
}