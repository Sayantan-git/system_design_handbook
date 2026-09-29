import Panzoom from '@panzoom/panzoom'
import { mountDiagramPlayback } from './diagram-playback'
import { colorizeDiagram } from './diagram-appearance'

interface DiagramController {
  action: (action: string) => void
  snapshot: () => { svg: SVGSVGElement; title: string }
  destroy: () => void
}

const mountedDiagrams = new Map<HTMLElement, DiagramController>()
const minimumZoom = 1
const maximumZoom = 8

export function disposeDiagrams(root: HTMLElement) {
  for (const [container, controller] of mountedDiagrams) {
    if (container === root || root.contains(container)) {
      controller.destroy()
      mountedDiagrams.delete(container)
    }
  }
}

export function diagramSnapshot(container: HTMLElement | null) {
  return container ? mountedDiagrams.get(container)?.snapshot() : undefined
}

export function handleDiagramAction(control: HTMLButtonElement) {
  const container = control.closest<HTMLElement>('[data-diagram], .diagram-dialog')
  if (container) mountedDiagrams.get(container)?.action(control.dataset.action ?? '')
}

function namespaceExpandedSvg(svg: SVGSVGElement) {
  const originalId = svg.id
  const expandedId = `${originalId}-expanded`
  for (const element of [svg, ...svg.querySelectorAll('*')]) {
    for (const attribute of [...element.attributes]) {
      if (attribute.name === 'id' && attribute.value.startsWith(originalId)) {
        element.setAttribute(attribute.name, expandedId + attribute.value.slice(originalId.length))
      } else if (attribute.value.includes(`url(#${originalId}`) || attribute.value.startsWith(`#${originalId}`)) {
        element.setAttribute(attribute.name, attribute.value.replaceAll(originalId, expandedId))
      }
    }
  }
  for (const style of svg.querySelectorAll('style')) {
    style.textContent = style.textContent?.replaceAll(`#${originalId}`, `#${expandedId}`) ?? ''
  }
}

export function mountDiagram(container: HTMLElement, svg: SVGSVGElement, title: string, expanded = false) {
  disposeDiagrams(container)
  if (expanded) namespaceExpandedSvg(svg)
  colorizeDiagram(svg)
  const original = svg.cloneNode(true) as SVGSVGElement
  const stage = container.querySelector<HTMLElement>('.diagram-stage')!
  const output = container.querySelector<HTMLOutputElement>('[data-diagram-zoom]')!
  const selection = container.querySelector<HTMLElement>('.diagram-selection')!
  const panButton = container.querySelector<HTMLButtonElement>('[data-action="pan-diagram"]')!
  const zoomIn = container.querySelector<HTMLButtonElement>('[data-action="zoom-in"]')!
  const zoomOut = container.querySelector<HTMLButtonElement>('[data-action="zoom-out"]')!
  const listeners = new AbortController()
  const listenerOptions = { signal: listeners.signal }
  const canvas = document.createElement('div')
  canvas.className = 'diagram-canvas'
  svg.style.width = '100%'
  svg.style.height = '100%'
  svg.style.maxWidth = 'none'
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  canvas.append(svg)
  stage.replaceChildren(canvas)
  stage.setAttribute('aria-label', `${title} diagram`)
  stage.setAttribute('aria-description', 'Plus and minus zoom, arrow keys pan, and zero fits the diagram. Enter selects a focused component. Escape clears the selection.')
  stage.setAttribute('aria-busy', 'false')
  const bounds = svg.viewBox.baseVal
  stage.style.setProperty('--diagram-ratio', `${bounds.width || 2} / ${bounds.height || 1}`)
  container.querySelectorAll<HTMLButtonElement>('.diagram-controls button').forEach(control => { control.disabled = false })

  const panzoom = Panzoom(canvas, {
    canvas: true, noBind: true, minScale: minimumZoom, maxScale: maximumZoom,
    step: 0.3, animate: false, touchAction: 'pan-y', cursor: 'default',
  })
  let playback: ReturnType<typeof mountDiagramPlayback>
  let panMode = false
  let dragged = false
  let gesture: { x: number; y: number; scale: number } | null = null
  const trackGesture = () => {
    const position = panzoom.getPan()
    if (gesture && (Math.hypot(position.x - gesture.x, position.y - gesture.y) > 3 || Math.abs(panzoom.getScale() - gesture.scale) > 0.01)) dragged = true
  }
  const setPanMode = (enabled: boolean) => {
    panzoom.destroy()
    panMode = enabled
    panzoom.setOptions({ cursor: enabled ? 'grab' : 'default', touchAction: enabled ? 'none' : 'pan-y' })
    if (enabled) panzoom.bind()
    stage.classList.toggle('is-pannable', enabled)
    panButton.setAttribute('aria-pressed', String(enabled))
  }
  const updateZoom = () => {
    const scale = panzoom.getScale()
    output.value = `${Math.round(scale * 100)}%`
    zoomIn.disabled = scale >= maximumZoom - 0.001
    zoomOut.disabled = scale <= minimumZoom + 0.001
  }

  const nodes = [...svg.querySelectorAll<SVGGElement>('.node')].map(node => ({
    element: node,
    key: node.id.match(/(?:^|-)flowchart-(.+)-\d+$/)?.[1] ?? node.id,
    label: [...node.querySelectorAll('.label .row')].map(row => row.textContent?.trim()).join(' ') || node.querySelector('.label')?.textContent?.trim() || node.textContent?.trim() || 'Component',
  }))
  const edges = [...svg.querySelectorAll<SVGPathElement>('.flowchart-link')].flatMap(path => {
    const edgeId = path.getAttribute('data-id') ?? ''
    for (const source of nodes) {
      for (const target of nodes) {
        const prefix = `L_${source.key}_${target.key}_`
        if (edgeId.startsWith(prefix) && /^\d+$/.test(edgeId.slice(prefix.length))) {
          const label = [...svg.querySelectorAll<SVGGElement>('.edgeLabel')].find(label => label.querySelector('[data-id]')?.getAttribute('data-id') === edgeId)
          return [{ source, target, path, label }]
        }
      }
    }
    return []
  })
  const componentPicker = document.createElement('select')
  componentPicker.className = 'diagram-component-picker'
  componentPicker.setAttribute('aria-label', 'Diagram component')
  componentPicker.append(new Option('Overview', ''), ...nodes.map((node, index) => new Option(node.label, String(index))))
  const status = document.createElement('span')
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  selection.removeAttribute('role')
  selection.removeAttribute('aria-live')
  selection.replaceChildren(componentPicker, status)
  let selected: SVGGElement | null = null
  const selectNode = (node: SVGGElement | null) => {
    selected = selected === node ? null : node
    const connectedEdges = edges.filter(edge => edge.source.element === selected || edge.target.element === selected)
    const neighbors = new Set(connectedEdges.flatMap(edge => [edge.source.element, edge.target.element]))
    for (const item of nodes) {
      item.element.classList.toggle('diagram-node-selected', item.element === selected)
      item.element.classList.toggle('diagram-muted', Boolean(selected && item.element !== selected && !neighbors.has(item.element)))
      item.element.setAttribute('aria-pressed', String(item.element === selected))
    }
    for (const edge of edges) {
      const active = connectedEdges.includes(edge)
      edge.path.classList.toggle('diagram-edge-active', Boolean(selected && active))
      edge.path.classList.toggle('diagram-muted', Boolean(selected && !active))
      edge.label?.classList.toggle('diagram-muted', Boolean(selected && !active))
    }
    const selectedIndex = nodes.findIndex(item => item.element === selected)
    componentPicker.value = selectedIndex < 0 ? '' : String(selectedIndex)
    status.textContent = selected ? `${connectedEdges.length} connection${connectedEdges.length === 1 ? '' : 's'}` : `${nodes.length} components`
  }
  selection.hidden = nodes.length === 0
  if (nodes.length) {
    svg.setAttribute('role', 'group')
    svg.setAttribute('aria-label', `${title} components`)
    for (const node of nodes) {
      node.element.setAttribute('role', 'button')
      node.element.setAttribute('tabindex', '0')
      node.element.setAttribute('aria-label', node.label)
    }
  }
  selectNode(null)

  const fit = () => {
    playback?.pause(true)
    panzoom.reset({ animate: false })
    selectNode(null)
    setPanMode(expanded)
    updateZoom()
  }
  const inspectNode = (node: SVGGElement | null) => {
    playback?.pause(true)
    selectNode(node)
    if (!selected) return
    const scale = panzoom.getScale()
    const svgMatrix = svg.getCTM()
    const nodeMatrix = selected.getCTM()
    if (!svgMatrix || !nodeMatrix || !bounds.width || !bounds.height) return
    const nodeBounds = selected.getBBox()
    const center = new DOMPoint(nodeBounds.x + nodeBounds.width / 2, nodeBounds.y + nodeBounds.height / 2).matrixTransform(svgMatrix.inverse().multiply(nodeMatrix))
    const fittedScale = Math.min(svg.clientWidth / bounds.width, svg.clientHeight / bounds.height)
    const offsetX = (center.x - bounds.x - bounds.width / 2) * fittedScale
    const offsetY = (center.y - bounds.y - bounds.height / 2) * fittedScale
    panzoom.zoom(Math.max(scale, Math.min(maximumZoom, 0.9 / fittedScale)), { animate: false })
    setPanMode(expanded || panzoom.getScale() > minimumZoom)
    requestAnimationFrame(() => {
      if (!listeners.signal.aborted) panzoom.pan(-offsetX, -offsetY)
    })
  }
  componentPicker.addEventListener('change', () => {
    if (componentPicker.value === '') fit()
    else inspectNode(nodes[Number(componentPicker.value)]?.element ?? null)
  }, listenerOptions)
  const action = (action: string) => {
    if (action === 'pan-diagram') setPanMode(!panMode)
    if (action === 'zoom-reset') fit()
    if (action === 'zoom-in' || action === 'zoom-out') {
      if (action === 'zoom-in') panzoom.zoomIn({ animate: false })
      else panzoom.zoomOut({ animate: false })
      setPanMode(expanded || panzoom.getScale() > minimumZoom)
      updateZoom()
    }
  }
  canvas.addEventListener('panzoomchange', () => {
    updateZoom()
    trackGesture()
    playback?.refresh()
  }, listenerOptions)
  canvas.addEventListener('panzoomstart', () => {
    gesture = { ...panzoom.getPan(), scale: panzoom.getScale() }
    stage.classList.add('is-dragging')
  }, listenerOptions)
  canvas.addEventListener('panzoomend', () => {
    trackGesture()
    gesture = null
    stage.classList.remove('is-dragging')
  }, listenerOptions)
  stage.addEventListener('pointerdown', () => { dragged = false }, { ...listenerOptions, capture: true })
  stage.addEventListener('click', event => {
    if (dragged) return
    const node = (event.target as Element).closest<SVGGElement>('.node')
    inspectNode(node)
  }, listenerOptions)
  stage.addEventListener('wheel', event => {
    if (!panMode && !event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    panzoom.zoomWithWheel(event)
    if (panzoom.getScale() > minimumZoom) setPanMode(true)
  }, { ...listenerOptions, passive: false })
  stage.addEventListener('dblclick', event => {
    if ((event.target as Element).closest('.node')) return
    event.preventDefault()
    panzoom.zoomToPoint(panzoom.getScale() * (event.shiftKey ? 0.5 : 2), event)
    setPanMode(expanded || panzoom.getScale() > minimumZoom)
  }, listenerOptions)
  stage.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    const node = (event.target as Element).closest<SVGGElement>('.node')
    if (node && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      inspectNode(node)
      return
    }
    if (['+', '=', '-', '0', 'Home'].includes(event.key)) {
      event.preventDefault()
      action(event.key === '-' ? 'zoom-out' : event.key === '0' || event.key === 'Home' ? 'zoom-reset' : 'zoom-in')
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault()
      const distance = 60 / panzoom.getScale()
      panzoom.pan(event.key === 'ArrowLeft' ? distance : event.key === 'ArrowRight' ? -distance : 0, event.key === 'ArrowUp' ? distance : event.key === 'ArrowDown' ? -distance : 0, { relative: true })
    }
  }, listenerOptions)
  container.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented) return
    if (selected || expanded) {
      event.preventDefault()
      event.stopPropagation()
      if (selected) selectNode(null)
      else (container as HTMLDialogElement).close()
    }
  }, listenerOptions)

  playback = mountDiagramPlayback(container, svg, edges, () => selectNode(null), expanded)
  setPanMode(expanded)
  updateZoom()
  mountedDiagrams.set(container, {
    action,
    snapshot: () => ({ svg: original.cloneNode(true) as SVGSVGElement, title }),
    destroy: () => { playback?.destroy(); listeners.abort(); panzoom.destroy() },
  })
}