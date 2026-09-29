const darkColors = ['#ffb454', '#45dbb0', '#4ed6ed', '#cd9cff', '#ff829c', '#8cacff']
const lightColors = ['#9a5700', '#08775a', '#08798c', '#7950bd', '#b23359', '#345eb1']

export function diagramColor(index: number, dark: boolean): string {
  const palette = dark ? darkColors : lightColors
  return palette[((index % palette.length) + palette.length) % palette.length]
}

export function colorizeDiagram(svg: SVGSVGElement) {
  if (svg.querySelector('[data-diagram-appearance]')) return
  const dark = document.documentElement.dataset.theme === 'dark'
  const surface = dark ? '#191c21' : '#ffffff'
  const ink = dark ? '#eff2f6' : '#262d38'
  const line = dark ? '#798390' : '#85909e'
  svg.style.setProperty('--diagram-ink', ink)
  svg.style.setProperty('--diagram-card', surface)
  const nodes = [...svg.querySelectorAll<SVGGElement>('.node')]
  for (const [index, node] of nodes.entries()) {
    const slot = node.hasAttribute('data-color-slot') ? Number(node.getAttribute('data-color-slot')) : index
    const color = diagramColor(slot, dark)
    node.style.setProperty('--component-color', color)
    const rectangle = node.querySelector<SVGRectElement>(':scope > rect')
    if (rectangle && rectangle.width.baseVal.value > 40 && rectangle.height.baseVal.value > 25) {
      rectangle.setAttribute('rx', '6')
      rectangle.setAttribute('ry', '6')
      const accent = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      accent.classList.add('diagram-node-accent')
      accent.setAttribute('x', String(rectangle.x.baseVal.value + 1))
      accent.setAttribute('y', String(rectangle.y.baseVal.value + 5))
      accent.setAttribute('width', '4')
      accent.setAttribute('height', String(rectangle.height.baseVal.value - 10))
      accent.setAttribute('rx', '2')
      accent.setAttribute('aria-hidden', 'true')
      rectangle.after(accent)
    }
  }
  const actorTexts = [...svg.querySelectorAll<SVGTextElement>('text.actor')]
  const actorNames = [...new Set(actorTexts.map(actor => actor.textContent?.trim() ?? ''))].sort((left, right) => {
    const position = (label: string) => Number(actorTexts.find(actor => actor.textContent?.trim() === label)?.getAttribute('x') ?? 0)
    return position(left) - position(right)
  })
  for (const actor of actorTexts) actor.style.setProperty('--component-color', diagramColor(actorNames.indexOf(actor.textContent?.trim() ?? ''), dark))
  for (const actor of svg.querySelectorAll<SVGRectElement>('rect.actor')) {
    const center = actor.x.baseVal.value + actor.width.baseVal.value / 2
    const label = actorTexts.reduce<SVGTextElement | undefined>((nearest, candidate) => !nearest || Math.abs(Number(candidate.getAttribute('x')) - center) < Math.abs(Number(nearest.getAttribute('x')) - center) ? candidate : nearest, undefined)
    actor.style.setProperty('--component-color', label?.style.getPropertyValue('--component-color') ?? diagramColor(0, dark))
    actor.setAttribute('rx', '6')
    actor.setAttribute('ry', '6')
  }
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.setAttribute('data-diagram-appearance', '')
  const scope = `#${svg.id}`
  style.textContent = `
    ${scope} .node > :is(rect, polygon, circle, ellipse, path):not(.diagram-node-accent) { fill: var(--diagram-card) !important; stroke: var(--component-color) !important; stroke-width: 1.5px !important; }
    ${scope} .node > .diagram-node-accent { fill: var(--component-color) !important; stroke: none !important; pointer-events: none; }
    ${scope} .node .label, ${scope} .node text { color: var(--diagram-ink) !important; fill: var(--diagram-ink) !important; }
    ${scope} rect.actor { fill: var(--diagram-card) !important; stroke: var(--component-color) !important; stroke-width: 1.5px !important; }
    ${scope} text.actor { fill: var(--component-color) !important; font-weight: 600 !important; }
    ${scope} :is(.flowchart-link, .transition) { stroke: ${line}; stroke-width: 1.5px; }
    ${scope} .edge-pattern-solid { stroke-dasharray: 5 5; }
    ${scope} .actor-line { stroke: ${line}; stroke-dasharray: 4 6; opacity: .5; }
    ${scope} :is(.messageText, .edgeLabel text, .state-title) { fill: var(--diagram-ink) !important; }
    ${scope} .edgeLabel .background { fill: var(--diagram-card) !important; }
  `
  svg.append(style)
}