export interface DiagramConnection {
  source: { element: SVGGraphicsElement; label: string }
  target: { element: SVGGraphicsElement; label: string }
  path: SVGPathElement
  label?: SVGGraphicsElement
}

interface FlowStep {
  path: SVGGeometryElement
  from: string
  to: string
  message: string
  fromElements: SVGGraphicsElement[]
  toElements: SVGGraphicsElement[]
  label?: Element
  reverse: boolean
  directed: boolean
  lost: boolean
}

let activePlayback: { pause: (clear?: boolean) => void } | undefined
const travelTime = 1600
const stepTime = 2800
const textOf = (element?: Element | null) => {
  const rows = element ? [...element.querySelectorAll('.row')] : []
  return (rows.length ? rows.map(row => row.textContent).join(' ') : element?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function rootPoint(svg: SVGSVGElement, element: SVGGraphicsElement, point: DOMPointInit): DOMPoint {
  const rootMatrix = svg.getCTM()
  const elementMatrix = element.getCTM()
  const position = new DOMPoint(point.x, point.y)
  return rootMatrix && elementMatrix ? position.matrixTransform(rootMatrix.inverse().multiply(elementMatrix)) : position
}

function flowSteps(svg: SVGSVGElement, connections: DiagramConnection[]): FlowStep[] {
  if (connections.length) {
    return connections.flatMap(connection => {
      const startMarker = connection.path.getAttribute('marker-start') ?? ''
      const endMarker = connection.path.getAttribute('marker-end') ?? ''
      const starts = startMarker.includes('url(')
      const ends = endMarker.includes('url(')
      const directions = starts && ends ? [false, true] : [starts && !ends]
      return directions.map(reverse => ({
        path: connection.path,
        from: reverse ? connection.target.label : connection.source.label,
        to: reverse ? connection.source.label : connection.target.label,
        message: textOf(connection.label),
        fromElements: [reverse ? connection.target.element : connection.source.element],
        toElements: [reverse ? connection.source.element : connection.target.element],
        label: connection.label,
        reverse,
        directed: starts || ends,
        lost: /cross/i.test(reverse ? startMarker : endMarker),
      }))
    })
  }

  const transitions = [...svg.querySelectorAll<SVGPathElement>('path.transition')]
  if (transitions.length) {
    const states = [...svg.querySelectorAll<SVGGraphicsElement>('.node')].map(element => {
      const bounds = element.getBBox()
      const start = rootPoint(svg, element, { x: bounds.x, y: bounds.y })
      const end = rootPoint(svg, element, { x: bounds.x + bounds.width, y: bounds.y + bounds.height })
      return { element, label: textOf(element) || (element.id.includes('_start-') ? 'Start' : 'End'), start, end }
    })
    const stateAt = (position: DOMPoint) => states.reduce<typeof states[number] | undefined>((nearest, state) => {
      const distance = (candidate: typeof state) => Math.hypot(Math.max(candidate.start.x - position.x, 0, position.x - candidate.end.x), Math.max(candidate.start.y - position.y, 0, position.y - candidate.end.y))
      return !nearest || distance(state) < distance(nearest) ? state : nearest
    }, undefined)
    return transitions.map(path => {
      const from = stateAt(rootPoint(svg, path, path.getPointAtLength(0)))
      const to = stateAt(rootPoint(svg, path, path.getPointAtLength(path.getTotalLength())))
      const label = [...svg.querySelectorAll('.edgeLabel')].find(element => element.querySelector('[data-id]')?.getAttribute('data-id') === path.getAttribute('data-id'))
      return {
        path, from: from?.label ?? 'Start', to: to?.label ?? 'End', message: textOf(label),
        fromElements: from ? [from.element] : [], toElements: to ? [to.element] : [], label,
        reverse: false, directed: true, lost: false,
      }
    })
  }

  const actors = [...svg.querySelectorAll<SVGGraphicsElement>('text.actor')].map(element => {
    const bounds = element.getBBox()
    return { element, label: textOf(element), position: rootPoint(svg, element, { x: bounds.x + bounds.width / 2, y: bounds.y }) }
  })
  const actorAt = (position: DOMPoint) => actors.reduce<typeof actors[number] | undefined>((nearest, actor) => !nearest || Math.abs(actor.position.x - position.x) < Math.abs(nearest.position.x - position.x) ? actor : nearest, undefined)
  const elementsFor = (actor: typeof actors[number] | undefined) => actor ? actors.filter(candidate => candidate.label === actor.label && Math.abs(candidate.position.x - actor.position.x) < 1).map(candidate => candidate.element) : []
  const labels = [...svg.querySelectorAll('.messageText')]
  return [...svg.querySelectorAll<SVGGeometryElement>('.messageLine0, .messageLine1')].map((path, index) => {
    const from = actorAt(rootPoint(svg, path, path.getPointAtLength(0)))
    const to = actorAt(rootPoint(svg, path, path.getPointAtLength(path.getTotalLength())))
    return {
      path, from: from?.label ?? 'Sender', to: to?.label ?? 'Receiver', message: textOf(labels[index]),
      fromElements: elementsFor(from), toElements: elementsFor(to), label: labels[index],
      reverse: false, directed: true, lost: /cross/i.test(path.getAttribute('marker-end') ?? ''),
    }
  })
}

export function mountDiagramPlayback(container: HTMLElement, svg: SVGSVGElement, connections: DiagramConnection[], beforeStep: () => void, expanded: boolean) {
  const root = container.querySelector<HTMLElement>('[data-diagram-playback]')
  if (!root) return undefined
  const steps = flowSteps(svg, connections)
  root.hidden = steps.length === 0
  if (!steps.length) return undefined

  const stage = container.querySelector<HTMLElement>('.diagram-stage')!
  const query = <ElementType extends HTMLElement>(selector: string) => root.querySelector<ElementType>(selector)!
  const control = (action: string) => query<HTMLButtonElement>(`[data-diagram-playback-action="${action}"]`)
  const stepSelect = query<HTMLSelectElement>('[data-diagram-flow-step]')
  const speedSelect = query<HTMLSelectElement>('[data-diagram-flow-speed]')
  const progress = query<HTMLInputElement>('[data-diagram-flow-progress]')
  const history = query('[data-diagram-flow-history]')
  const participants = query('[data-diagram-flow-participants]')
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const listeners = new AbortController()
  const options = { signal: listeners.signal }
  const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  packet.classList.add('diagram-flow-packet')
  packet.setAttribute('aria-hidden', 'true')
  packet.setAttribute('visibility', 'hidden')
  svg.append(packet)

  let stepIndex = 0
  let speed = 1
  let playing = false
  let previewing = false
  let showing = false
  let ended = false
  let frame = 0
  let elapsed = 0
  let previousFrame = 0
  let visible = false

  const stepColor = (step: FlowStep) => step.toElements[0]?.style.getPropertyValue('--component-color') || step.fromElements[0]?.style.getPropertyValue('--component-color') || 'var(--teal)'
  const historyButtons = steps.map((step, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.diagramStep = String(index)
    button.style.setProperty('--component-color', stepColor(step))
    button.title = `${index + 1}. ${step.from} to ${step.to}${step.message ? `: ${step.message}` : ''}`
    button.setAttribute('aria-label', button.title)
    const number = document.createElement('span')
    number.className = 'diagram-history-number'
    number.textContent = String(index + 1).padStart(2, '0')
    const target = document.createElement('span')
    target.textContent = step.to
    button.append(number, target)
    return button
  })
  history.replaceChildren(...historyButtons)
  const participantLabels = [...new Set(steps.flatMap(step => [step.from, step.to]))]
  const participantButtons = participantLabels.map(label => {
    const index = steps.findIndex(step => step.from === label || step.to === label)
    const step = steps[index]
    const element = step.from === label ? step.fromElements[0] : step.toElements[0]
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.diagramStep = String(index)
    button.style.setProperty('--component-color', element?.style.getPropertyValue('--component-color') || stepColor(step))
    button.textContent = label
    button.title = `First step involving ${label}`
    return button
  })
  participants.replaceChildren(...participantButtons)

  stepSelect.replaceChildren(...steps.map((step, index) => new Option(`${String(index + 1).padStart(2, '0')}. ${step.from} -> ${step.to}${step.message ? `: ${step.message}` : ''}`, String(index))))
  stepSelect.disabled = false
  progress.max = String(steps.length)
  progress.disabled = false
  speedSelect.value = '1'
  const kind = connections.length ? 'connections' : svg.querySelector('path.transition') ? 'transitions' : 'messages'
  query('[data-diagram-flow-kind]').textContent = kind === 'connections' ? 'Connection tour' : kind === 'transitions' ? 'State transitions' : 'Message sequence'
  root.dataset.flowKind = kind
  root.setAttribute('role', 'group')
  root.setAttribute('aria-label', kind === 'messages' ? 'Message sequence playback' : kind === 'transitions' ? 'State transition playback' : 'Connection playback')
  root.setAttribute('aria-description', kind === 'messages' ? 'Messages follow the sequence shown in the diagram.' : 'Connections are shown individually. Branches may be alternatives, not one continuous execution.')

  const updateControls = () => {
    root.dataset.playing = String(playing)
    root.dataset.step = String(stepIndex)
    const play = control('play')
    const label = reducedMotion.matches ? 'Playback disabled for reduced motion' : playing ? 'Pause data flow' : ended ? 'Replay data flow' : 'Play data flow'
    play.title = label
    play.setAttribute('aria-label', label)
    play.setAttribute('aria-pressed', String(playing))
    play.disabled = reducedMotion.matches
    control('restart').disabled = false
    control('previous').disabled = stepIndex === 0
    control('next').disabled = stepIndex === steps.length - 1
    speedSelect.disabled = reducedMotion.matches
    query('[data-diagram-play-icon]').hidden = playing
    query('[data-diagram-pause-icon]').hidden = !playing
  }

  const clearHighlight = () => {
    showing = false
    svg.classList.remove('diagram-flow-focused')
    svg.querySelectorAll('.diagram-flow-active, .diagram-flow-source, .diagram-flow-target, .diagram-flow-arrived').forEach(element => element.classList.remove('diagram-flow-active', 'diagram-flow-source', 'diagram-flow-target', 'diagram-flow-arrived'))
    packet.setAttribute('visibility', 'hidden')
  }

  const paint = () => {
    const step = steps[stepIndex]
    const color = stepColor(step)
    stage.style.setProperty('--flow-color', color)
    root.style.setProperty('--flow-color', color)
    step.path.style.setProperty('--flow-color', color)
    for (const [index, button] of historyButtons.entries()) {
      button.classList.toggle('is-current', index === stepIndex)
      button.classList.toggle('is-visited', index < stepIndex)
      if (index === stepIndex) button.setAttribute('aria-current', 'step')
      else button.removeAttribute('aria-current')
    }
    for (const [index, button] of participantButtons.entries()) button.classList.toggle('is-current', participantLabels[index] === step.from || participantLabels[index] === step.to)
    const fraction = Math.min(1, elapsed / travelTime)
    for (const element of step.toElements) element.classList.toggle('diagram-flow-arrived', showing && fraction === 1 && !step.lost)
    if (!showing || reducedMotion.matches || !step.directed) {
      packet.setAttribute('visibility', 'hidden')
      return
    }
    const distance = step.path.getTotalLength()
    const travel = step.lost ? Math.min(fraction, 0.9) : fraction
    const point = rootPoint(svg, step.path, step.path.getPointAtLength(distance * (step.reverse ? 1 - travel : travel)))
    const matrix = svg.getScreenCTM()
    const scale = matrix ? Math.hypot(matrix.a, matrix.b) : 1
    packet.setAttribute('cx', String(point.x))
    packet.setAttribute('cy', String(point.y))
    packet.setAttribute('r', String(5 / Math.max(scale, 0.01)))
    packet.setAttribute('visibility', 'visible')
    packet.style.opacity = step.lost ? String(Math.max(0, 1 - Math.max(0, fraction - 0.75) * 4)) : '1'
    packet.classList.toggle('is-lost', step.lost)
  }

  const pause = (clear = false) => {
    playing = false
    previewing = false
    cancelAnimationFrame(frame)
    frame = 0
    previousFrame = 0
    if (activePlayback === controller) activePlayback = undefined
    if (clear) clearHighlight()
    updateControls()
  }

  const showStep = (announce = true, highlight = true) => {
    clearHighlight()
    const step = steps[stepIndex]
    if (highlight) {
      beforeStep()
      showing = true
      svg.classList.add('diagram-flow-focused')
      step.path.classList.add('diagram-flow-active')
      step.label?.classList.add('diagram-flow-active')
      step.fromElements.forEach(element => element.classList.add('diagram-flow-source'))
      step.toElements.forEach(element => element.classList.add('diagram-flow-target'))
    }
    stepSelect.value = String(stepIndex)
    progress.value = String(stepIndex + 1)
    progress.setAttribute('aria-valuetext', `${stepIndex + 1} of ${steps.length}: ${step.from} to ${step.to}`)
    query('[data-diagram-flow-count]').textContent = `${stepIndex + 1} / ${steps.length}`
    query('[data-diagram-flow-route]').textContent = `${step.from} ${step.directed ? '\u2192' : '\u2014'} ${step.to}`
    const message = step.lost ? `${step.message}. Not delivered.` : step.message || (step.directed ? '' : 'Undirected relationship')
    query('[data-diagram-flow-message]').textContent = message
    root.dataset.delivery = step.lost ? 'lost' : step.directed ? 'directed' : 'undirected'
    if (announce) query('[data-diagram-flow-announcement]').textContent = `${stepIndex + 1} of ${steps.length}. ${step.from} to ${step.to}. ${message}`
    paint()
    updateControls()
  }

  const animate = (timestamp: number) => {
    if (listeners.signal.aborted || (!playing && !previewing)) return
    if (previousFrame) elapsed += Math.min(timestamp - previousFrame, 100) * speed
    previousFrame = timestamp
    paint()
    if (previewing && elapsed >= travelTime) { pause(); return }
    if (playing && elapsed >= stepTime) {
      if (stepIndex === steps.length - 1) { ended = true; pause(); return }
      stepIndex += 1
      elapsed = 0
      showStep(false)
    }
    frame = requestAnimationFrame(animate)
  }

  const start = (preview = false) => {
    if (reducedMotion.matches || document.hidden) return
    if (!visible) stage.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    activePlayback?.pause()
    activePlayback = controller
    playing = !preview
    previewing = preview
    previousFrame = 0
    frame = requestAnimationFrame(animate)
    updateControls()
  }

  const jumpTo = (index: number) => {
    if (!Number.isFinite(index)) return
    pause()
    stepIndex = Math.max(0, Math.min(steps.length - 1, index))
    elapsed = 0
    ended = false
    showStep()
    start(true)
  }

  root.addEventListener('click', event => {
    const activity = (event.target as Element).closest<HTMLButtonElement>('[data-diagram-step]')
    if (activity) { jumpTo(Number(activity.dataset.diagramStep)); return }
    const action = (event.target as Element).closest<HTMLButtonElement>('[data-diagram-playback-action]')?.dataset.diagramPlaybackAction
    if (action === 'previous') jumpTo(stepIndex - 1)
    if (action === 'next') jumpTo(stepIndex + 1)
    if (action === 'restart') jumpTo(0)
    if (action === 'play') {
      if (playing) pause()
      else {
        pause()
        if (ended) { stepIndex = 0; elapsed = 0; ended = false }
        showStep()
        start()
      }
    }
  }, options)
  stepSelect.addEventListener('change', () => jumpTo(Number(stepSelect.value)), options)
  progress.addEventListener('input', () => jumpTo(Number(progress.value) - 1), options)
  speedSelect.addEventListener('change', () => { speed = Number(speedSelect.value) || 1 }, options)
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause() }, options)
  reducedMotion.addEventListener('change', () => { pause(); paint() }, options)
  const observer = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? false
    if (!visible) pause()
  }, { threshold: 0 })

  const controller = {
    pause,
    refresh: paint,
    destroy: () => {
      pause(true)
      listeners.abort()
      observer.disconnect()
      packet.remove()
      root.hidden = true
    },
  }
  if (expanded) activePlayback?.pause()
  observer.observe(stage)
  showStep(false, false)
  return controller
}