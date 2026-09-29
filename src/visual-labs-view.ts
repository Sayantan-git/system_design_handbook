import { escapeHtml, type Book } from './book'
import { resolveTopic } from './curriculum'
import { visualLabs, type LabFrame, type VisualLab } from './visual-labs'

let sceneId = 0
const icon = (name: string) => `<i data-lucide="${name}" aria-hidden="true"></i>`
const control = (iconName: string, action: string, label: string) => `<button type="button" class="icon-button" data-lab-action="${action}" title="${label}" aria-label="${label}">${icon(iconName)}</button>`

export function renderVisualLab(lab: VisualLab, book: Book, expanded = false): string {
  const { entry, section } = resolveTopic(book, lab.topic)
  return `<figure class="visual-lab ${expanded ? 'visual-lab-expanded' : ''}" data-visual-lab="${lab.id}" data-tone="${lab.tone}">
    <figcaption class="visual-lab-heading"><div><h3>${lab.title}</h3><span>${lab.subtitle}</span></div><div>${expanded ? control('x', 'close', 'Close expanded simulation') : control('maximize-2', 'expand', `Expand ${lab.title.toLowerCase()}`)}<a class="icon-button" href="#/read/${entry.id}?section=${section}" title="Read ${lab.title.toLowerCase()}" aria-label="Read ${lab.title.toLowerCase()}">${icon('book-open')}</a></div></figcaption>
    <div class="visual-lab-scene" role="group" aria-label="${lab.title} simulation"></div>
    <p class="visual-lab-caption" data-lab-caption></p>
    <div class="visual-lab-metrics" data-lab-metrics></div>
    <div class="visual-lab-controls"><div>${control('rotate-ccw', 'reset', 'Reset simulation')}${control('arrow-left', 'previous', 'Previous simulation step')}<button type="button" class="icon-button lab-play" data-lab-action="play" aria-label="Play simulation" title="Play simulation"><span data-lab-play-icon>${icon('play')}</span><span data-lab-pause-icon hidden>${icon('pause')}</span></button>${control('arrow-right', 'next', 'Next simulation step')}</div><label><span class="sr-only">Simulation speed</span><select data-lab-speed><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select></label><output data-lab-count aria-label="Simulation step count"></output></div>
    <div class="visual-lab-timeline" role="group" aria-label="Simulation steps">${lab.frames.map((frame, index) => `<button type="button" data-lab-step="${index}" title="${escapeHtml(frame.caption)}" aria-label="Step ${index + 1}: ${escapeHtml(frame.caption)}">${String(index + 1).padStart(2, '0')}</button>`).join('')}</div>
    <details class="visual-lab-reasoning"><summary>Tradeoffs${icon('chevron-down')}</summary><p data-lab-detail></p></details>
    <span class="sr-only" data-lab-announcement role="status" aria-live="polite"></span>
  </figure>`
}

export function renderVisualLabs(book: Book): string {
  return `<section class="visual-labs"><header class="visual-labs-heading"><div><span class="eyebrow">SIX BUILDING BLOCKS</span><h2>System design fundamentals</h2></div><div>${control('play', 'play-all', 'Play all simulations')}${control('pause', 'pause-all', 'Pause all simulations')}${control('rotate-ccw', 'reset-all', 'Reset all simulations')}</div></header><div class="visual-lab-grid">${visualLabs.map(lab => renderVisualLab(lab, book)).join('')}</div></section>`
}

function scene(lab: VisualLab, frame: LabFrame, id: string): string {
  const value = (key: string) => frame.values[key] ?? ''
  const box = (name: string, horizontal: number, vertical: number, width: number, height: number, label: string, detail = '', filled = false, shape: 'box' | 'database' | 'circle' = 'box') => {
    const form = shape === 'database' ? `<path d="M 0 9 C 0 -2 ${width} -2 ${width} 9 V ${height - 9} C ${width} ${height + 2} 0 ${height + 2} 0 ${height - 9} Z" /><ellipse cx="${width / 2}" cy="9" rx="${width / 2}" ry="8" />` : shape === 'circle' ? `<circle cx="${width / 2}" cy="${height / 2}" r="${width / 2}" />` : `<rect width="${width}" height="${height}" rx="5" />`
    return `<g class="lab-component ${filled ? 'is-filled' : ''} ${shape === 'database' ? 'lab-database' : ''}" data-lab-node="${name}" role="button" tabindex="0" aria-pressed="false" aria-label="${escapeHtml(`${label}${detail ? ': ' + detail : ''}` || name)}" transform="translate(${horizontal} ${vertical})"><title>${escapeHtml(`${label}${detail ? ': ' + detail : ''}` || name)}</title>${form}<text x="${width / 2}" y="${detail ? height / 2 - 2 : height / 2 + 4}" text-anchor="middle">${escapeHtml(label)}</text>${detail ? `<text class="lab-node-detail" x="${width / 2}" y="${height / 2 + 13}" text-anchor="middle">${escapeHtml(detail)}</text>` : ''}</g>`
  }
  const path = (name: string, data: string, label = '', horizontal = 0, vertical = 0) => `<path data-lab-path="${name}" class="lab-wire ${frame.path === name ? 'is-active' : ''}" d="${data}" fill="none" marker-end="url(#${id}-arrow)" />${label ? `<text class="lab-wire-label" x="${horizontal}" y="${vertical}" text-anchor="middle">${label}</text>` : ''}`
  let drawing = ''
  if (lab.id === 'balancer') {
    drawing = Array.from({ length: 4 }, (_, index) => path(`dispatch-${index}`, `M 72 111 H 144 L 273 ${39 + index * 45}`)).join('')
    drawing += box('clients', 10, 93, 62, 36, 'Client') + box('balancer', 116, 91, 58, 40, 'LB', '', true)
    drawing += Array.from({ length: 4 }, (_, index) => `<g style="--lab-node-accent: var(--lab-server-${index})">${box(`server${index}`, 273, 20 + index * 45, 77, 38, `web-0${index + 1}`, `${value(`server${index}`)} routed`, Number(value('delivered')) > 0 && (Number(value('delivered')) - 1) % 4 === index)}</g>`).join('')
    drawing += `<text class="lab-note" x="144" y="160" text-anchor="middle">next: web-0${Number(value('next')) + 1}</text><circle class="lab-origin" cx="10" cy="111" r="3" />`
  } else if (lab.id === 'cache') {
    drawing = `<rect class="lab-container" x="60" y="84" width="240" height="49" rx="7" />${path('hit-a', 'M 103 92 V 60 H 180 V 43')}${path('lookup-b', 'M 180 43 V 92')}${path('read-db', 'M 180 121 V 174')}${path('fill-b', 'M 180 174 V 121')}${path('hit-b', 'M 180 92 V 43')}`
    drawing += box('get', 143, 14, 74, 29, frame.path === 'hit-a' ? 'get A' : 'get B', '', true)
    drawing += box('cache-a', 73, 93, 60, 29, 'A', '', true) + box('cache-b', 150, 93, 60, 29, String(value('cacheB') || '-'), '', Boolean(value('cacheB'))) + box('cache-c', 227, 93, 60, 29, '-')
    drawing += box('database', 139, 174, 82, 35, 'DB', '', frame.path === 'read-db' || frame.path === 'fill-b', 'database')
    drawing += '<text class="lab-note" x="285" y="75" text-anchor="end">cache</text>'
  } else if (lab.id === 'queue') {
    drawing = `<rect class="lab-container" x="85" y="89" width="190" height="40" rx="7" />${path('enqueue-a', 'M 47 58 L 85 109 H 110')}${path('enqueue-b', 'M 47 161 L 85 109 H 149')}${path('deliver-a', 'M 246 109 H 275 L 310 58')}${path('deliver-b', 'M 246 109 H 275 L 310 161')}${path('ack-a', 'M 310 58 L 275 109 H 246')}${path('ack-b', 'M 310 161 L 275 109 H 246')}`
    drawing += box('producer-a', 22, 43, 28, 28, 'P', '', frame.path === 'enqueue-a', 'circle') + box('producer-b', 22, 147, 28, 28, 'P', '', frame.path === 'enqueue-b', 'circle')
    drawing += box('consumer-a', 310, 43, 28, 28, 'C', '', value('consumer') === 'A', 'circle') + box('consumer-b', 310, 147, 28, 28, 'C', '', value('consumer') === 'B', 'circle')
    drawing += Array.from({ length: 4 }, (_, index) => box(`slot${index}`, 100 + index * 40, 98, 28, 23, String(value(`slot${index}`)), '', Boolean(value(`slot${index}`)))).join('')
    drawing += `<text class="lab-note" x="180" y="158" text-anchor="middle">queue depth ${value('depth')}</text>`
  } else if (lab.id === 'replication') {
    drawing = `${path('write', 'M 180 10 V 44')}${path('replicate-a', 'M 180 84 L 86 156')}${path('replicate-b', 'M 180 84 L 274 156')}${path('stale-read', 'M 274 195 V 214 H 330')}`
    drawing += box('primary', 125, 44, 110, 40, `primary v${value('primary')}`, '', true, 'database')
    drawing += box('replica-a', 31, 156, 110, 40, `replica A v${value('replicaA')}`, '', value('primary') === value('replicaA'), 'database')
    drawing += `<g style="--lab-node-accent: var(--lab-server-0)">${box('replica-b', 219, 156, 110, 40, `replica B v${value('replicaB')}`, '', value('primary') === value('replicaB'), 'database')}</g>`
    drawing += '<circle class="lab-origin" cx="180" cy="10" r="3" />'
  } else if (lab.id === 'limiter') {
    drawing = `${path('allow', 'M 185 47 V 177')}${path('reject', 'M 197 93 V 47', '429', 230, 74)}${path('refill', 'M 60 110 H 139')}`
    drawing += box('client', 147, 17, 76, 30, 'Client', '', frame.path === 'reject') + box('limiter', 147, 93, 76, 34, 'Limiter', '', true) + box('server', 147, 177, 76, 30, 'Server', '', frame.path === 'allow')
    drawing += Array.from({ length: 3 }, (_, index) => box(`token${index}`, 37 + index * 30, 101, 23, 16, '', '', index < Number(value('tokens')))).join('')
    drawing += `<text class="lab-note" x="81" y="141" text-anchor="middle">${value('tokens')} tokens</text>`
  } else {
    drawing = '<path class="lab-lifeline" d="M 64 47 V 212 M 296 47 V 212" />'
    drawing += `${path('upgrade', 'M 64 82 H 296', 'GET Upgrade', 180, 72)}${path('switch', 'M 296 111 H 64', '101 Switching Protocols', 180, 103)}${path('client-message', 'M 64 143 H 296')}${path('server-message', 'M 296 173 H 64')}${path('server-push', 'M 296 201 H 64')}`
    drawing += box('client', 26, 17, 76, 30, 'Client', '', true) + box('server', 258, 17, 76, 30, 'Server', '', value('connected') === 'open')
  }
  return `<svg viewBox="0 0 360 225" aria-label="${lab.title}: ${escapeHtml(frame.caption)}" role="group"><defs><marker id="${id}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 1 1 L 8 5 L 1 9" fill="none" stroke="context-stroke" stroke-width="1.5" /></marker></defs>${drawing}<circle class="visual-lab-packet" data-lab-packet r="4" cx="0" cy="0" visibility="hidden" /></svg>`
}

export function mountVisualLabs(root: HTMLElement, book: Book, enhanceIcons: () => void): () => void {
  const controllers: { play: () => void; pause: () => void; reset: () => void; destroy: () => void }[] = []
  const listeners = new AbortController()
  let dialog: HTMLDialogElement | undefined
  let expandedController: ReturnType<typeof mount> | undefined

  function mount(figure: HTMLElement, lab: VisualLab, initial = 0) {
    const uid = `lab-scene-${++sceneId}`
    const query = <ElementType extends HTMLElement>(selector: string) => figure.querySelector<ElementType>(selector)!
    const sceneRoot = query('.visual-lab-scene')
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
    const events = new AbortController()
    const options = { signal: events.signal }
    let index = initial
    let speed = 1
    let playing = false
    let timer = 0
    let animation: Animation | undefined

    const controls = () => {
      figure.dataset.playing = String(playing)
      figure.dataset.frame = String(index)
      const play = query<HTMLButtonElement>('[data-lab-action="play"]')
      const label = reducedMotion.matches ? 'Autoplay disabled for reduced motion' : playing ? 'Pause simulation' : index === lab.frames.length - 1 ? 'Replay simulation' : 'Play simulation'
      play.title = label
      play.setAttribute('aria-label', label)
      play.setAttribute('aria-pressed', String(playing))
      play.disabled = reducedMotion.matches
      query('[data-lab-play-icon]').hidden = playing
      query('[data-lab-pause-icon]').hidden = !playing
      query<HTMLButtonElement>('[data-lab-action="previous"]').disabled = index === 0
      query<HTMLButtonElement>('[data-lab-action="next"]').disabled = index === lab.frames.length - 1
      query('[data-lab-count]').textContent = `${index + 1} / ${lab.frames.length}`
      figure.querySelectorAll<HTMLButtonElement>('[data-lab-step]').forEach(button => { if (Number(button.dataset.labStep) === index) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current') })
    }
    const pause = () => { playing = false; window.clearTimeout(timer); animation?.pause(); controls() }
    const draw = (announce = true) => {
      animation?.cancel()
      const frame = lab.frames[index]
      figure.dataset.phase = frame.phase ?? 'request'
      sceneRoot.innerHTML = scene(lab, frame, uid)
      query('[data-lab-caption]').textContent = frame.caption
      query('[data-lab-detail]').textContent = frame.detail
      query('[data-lab-metrics]').innerHTML = frame.metrics.map(([label, value]) => `<span>${escapeHtml(label)}<strong>${escapeHtml(value)}</strong></span>`).join('')
      const path = sceneRoot.querySelector<SVGPathElement>('.lab-wire.is-active')
      const packet = sceneRoot.querySelector<SVGCircleElement>('[data-lab-packet]')!
      if (path && !reducedMotion.matches) {
        const length = path.getTotalLength()
        const frames = Array.from({ length: 25 }, (_, position) => { const point = path.getPointAtLength(length * position / 24); return { transform: `translate(${point.x}px, ${point.y}px)`, opacity: position === 24 ? 0 : 1 } })
        packet.setAttribute('visibility', 'visible')
        animation = packet.animate(frames, { duration: 1250 / speed, fill: 'forwards', easing: 'linear' })
      }
      if (announce && !playing) query('[data-lab-announcement]').textContent = frame.caption
      controls()
    }
    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (!playing) return
        if (index === lab.frames.length - 1) { pause(); return }
        index += 1
        draw(false)
        schedule()
      }, 2400 / speed)
    }
    const play = () => {
      if (reducedMotion.matches || document.hidden) return
      if (index === lab.frames.length - 1) index = 0
      playing = true
      draw(false)
      schedule()
    }
    const seek = (next: number) => { pause(); index = Math.max(0, Math.min(lab.frames.length - 1, next)); draw() }
    figure.addEventListener('click', event => {
      const target = event.target as Element
      const step = target.closest<HTMLElement>('[data-lab-step]')
      if (step) { seek(Number(step.dataset.labStep)); return }
      const node = target.closest<SVGGraphicsElement>('[data-lab-node]')
      if (node) {
        pause()
        const selected = node.classList.contains('is-inspected')
        sceneRoot.querySelectorAll('.is-inspected').forEach(item => { item.classList.remove('is-inspected'); item.setAttribute('aria-pressed', 'false') })
        node.classList.toggle('is-inspected', !selected)
        node.setAttribute('aria-pressed', String(!selected))
        query('[data-lab-caption]').textContent = selected ? lab.frames[index].caption : node.getAttribute('aria-label')
        return
      }
      const action = target.closest<HTMLElement>('[data-lab-action]')?.dataset.labAction
      if (action === 'play') { if (playing) pause(); else play() }
      if (action === 'reset') seek(0)
      if (action === 'previous') seek(index - 1)
      if (action === 'next') seek(index + 1)
      if (action === 'close') dialog?.close()
      if (action === 'expand') {
        controllers.forEach(controller => controller.pause())
        expandedController?.destroy()
        if (!dialog) {
          dialog = document.createElement('dialog')
          dialog.className = 'visual-lab-dialog'
          dialog.setAttribute('aria-label', 'Expanded concept simulation')
          dialog.addEventListener('close', () => { expandedController?.destroy(); expandedController = undefined; dialog?.replaceChildren() }, { signal: listeners.signal })
          dialog.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); dialog?.close() } }, { signal: listeners.signal })
          document.body.append(dialog)
        }
        dialog.innerHTML = renderVisualLab(lab, book, true)
        dialog.showModal()
        expandedController = mount(dialog.querySelector<HTMLElement>('[data-visual-lab]')!, lab, index)
        enhanceIcons()
      }
    }, options)
    figure.addEventListener('keydown', event => {
      const target = (event.target as Element).closest<SVGGraphicsElement>('[data-lab-node]')
      if (target && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); target.dispatchEvent(new MouseEvent('click', { bubbles: true })) }
    }, options)
    query<HTMLSelectElement>('[data-lab-speed]').addEventListener('change', event => { speed = Number((event.target as HTMLSelectElement).value); if (playing) { draw(false); schedule() } }, options)
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause() }, options)
    reducedMotion.addEventListener('change', () => { pause(); draw(false) }, options)
    const observer = new IntersectionObserver(entries => { if (!entries[0]?.isIntersecting) pause() })
    observer.observe(figure)
    draw(false)
    return { play, pause, reset: () => seek(0), destroy: () => { pause(); animation?.cancel(); events.abort(); observer.disconnect() } }
  }

  for (const figure of root.querySelectorAll<HTMLElement>('[data-visual-lab]')) {
    const lab = visualLabs.find(item => item.id === figure.dataset.visualLab)
    if (lab) controllers.push(mount(figure, lab))
  }
  root.addEventListener('click', event => {
    const action = (event.target as Element).closest<HTMLElement>('[data-lab-action]')?.dataset.labAction
    if (action === 'play-all') controllers.forEach(controller => controller.play())
    if (action === 'pause-all') controllers.forEach(controller => controller.pause())
    if (action === 'reset-all') controllers.forEach(controller => controller.reset())
  }, { signal: listeners.signal })
  enhanceIcons()
  return () => { controllers.forEach(controller => controller.destroy()); expandedController?.destroy(); listeners.abort(); dialog?.remove() }
}