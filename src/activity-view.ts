import { escapeHtml } from './book'
import { activityLevel, activityStats, localDay, recentActivity, shiftDay, validActivityDate, validateCompletionHistory, yearActivity, type ActivityCalendar, type CompletionHistory } from './activity'

interface ActivityOptions {
  chapters: { id: string; title: string }[]
  history: () => CompletionHistory
  beforeOpen: () => void
  enhanceIcons: () => void
}
const icon = (name: string) => `<i data-lucide="${name}" aria-hidden="true"></i>`
const dateLabel = (date: string) => new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
const dayLabel = (date: string, count: number) => `${dateLabel(date)}: ${count} chapter${count === 1 ? '' : 's'} completed`
const legend = () => `<div class="activity-legend" aria-label="Zero to four or more chapter completions"><span>Less</span>${[0, 1, 2, 3, 4].map(level => `<span class="activity-swatch" data-level="${level}" title="${level === 4 ? '4+' : level} completions" aria-hidden="true"></span>`).join('')}<span>More</span></div>`

export function mountCompletionActivity(host: HTMLElement, options: ActivityOptions) {
  const listeners = new AbortController()
  const events = { signal: listeners.signal }
  const ids = options.chapters.map(chapter => chapter.id)
  const history = () => validateCompletionHistory(options.history(), ids)
  const dialog = document.createElement('dialog')
  dialog.id = 'activity-dialog'
  dialog.className = 'activity-dialog'
  dialog.setAttribute('aria-labelledby', 'activity-title')
  document.body.append(dialog)
  let selectedDate = localDay()
  let selectedYear = Number(selectedDate.slice(0, 4))
  let signature = ''
  let midnightTimer: ReturnType<typeof setTimeout> | undefined

  const availableYears = () => {
    const current = new Date().getFullYear()
    const first = Math.min(current - 1, ...Object.keys(history()).filter(date => date <= localDay()).map(date => Number(date.slice(0, 4))))
    return Array.from({ length: current - first + 1 }, (_, index) => current - index)
  }
  const grid = (calendar: ActivityCalendar, compact: boolean) => {
    const today = localDay()
    const focusDate = calendar.days.some(day => day.date === selectedDate && !day.future) ? selectedDate : calendar.days.filter(day => !day.future).at(-1)?.date
    const offset = compact ? 1 : 2
    const months = compact ? '' : calendar.days.filter(day => day.date.endsWith('-01')).map(day => `<span class="activity-month" aria-hidden="true" style="grid-column:${day.week + 2}/span 3;grid-row:1">${new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`))}</span>`).join('')
    return `<div class="activity-grid" role="group" aria-label="Daily chapter completions" style="--activity-weeks:${calendar.weeks}">${months}${[1, 3, 5].map(weekday => `<span class="activity-weekday" aria-hidden="true" style="grid-column:1;grid-row:${weekday + offset}">${compact ? ['M', 'W', 'F'][(weekday - 1) / 2] : ['Mon', 'Wed', 'Fri'][(weekday - 1) / 2]}</span>`).join('')}${calendar.days.map(day => `<button type="button" class="activity-day ${day.date === today ? 'activity-today' : ''}" data-activity-date="${day.date}" data-level="${activityLevel(day.count)}" data-count="${day.count}" style="grid-column:${day.week + 2};grid-row:${day.weekday + offset}" tabindex="${day.date === focusDate ? '0' : '-1'}" title="${escapeHtml(dayLabel(day.date, day.count))}${day.future ? ' (future date)' : ''}" aria-label="${escapeHtml(dayLabel(day.date, day.count))}" aria-pressed="${day.date === selectedDate}" ${day.future ? 'disabled' : ''}></button>`).join('')}</div>`
  }
  const renderDay = () => {
    const entries = history()[selectedDate] ?? []
    const detail = dialog.querySelector<HTMLElement>('[data-activity-detail]')
    if (!detail) return
    detail.innerHTML = `<header><h3>${dateLabel(selectedDate)}</h3><span>${entries.length} chapter${entries.length === 1 ? '' : 's'} completed</span></header>${entries.length ? `<ul>${entries.map(id => `<li>${icon('circle-check')}<a href="#/read/${encodeURIComponent(id)}">${escapeHtml(options.chapters.find(chapter => chapter.id === id)!.title)}</a></li>`).join('')}</ul>` : '<p class="activity-empty">No chapters completed on this day.</p>'}`
    dialog.querySelectorAll<HTMLButtonElement>('[data-activity-date]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.activityDate === selectedDate)); button.tabIndex = button.dataset.activityDate === selectedDate ? 0 : -1 })
    const input = dialog.querySelector<HTMLInputElement>('[data-activity-day-input]')
    if (input) input.value = selectedDate
    options.enhanceIcons()
  }
  const scrollToDate = () => {
    const scroll = dialog.querySelector<HTMLElement>('.activity-year-scroll')
    const day = dialog.querySelector<HTMLElement>(`[data-activity-date="${selectedDate}"]`)
    if (scroll && day) scroll.scrollLeft = Math.max(0, day.offsetLeft - scroll.clientWidth / 2)
  }
  const renderYear = () => {
    const today = localDay()
    const all = history()
    const years = availableYears()
    const yearly = Object.fromEntries(Object.entries(all).filter(([date]) => date.startsWith(`${selectedYear}-`)))
    const stats = activityStats(yearly, today)
    dialog.innerHTML = `<header class="dialog-heading"><div><span class="eyebrow">CHAPTER ACTIVITY</span><h2 id="activity-title">Completion history</h2></div><button type="button" class="icon-button" data-activity-action="close" title="Close completion history" aria-label="Close completion history">${icon('x')}</button></header><div class="activity-year-controls"><button type="button" class="icon-button" data-activity-action="previous-year" title="Previous year" aria-label="Previous year" ${selectedYear <= years.at(-1)! ? 'disabled' : ''}>${icon('arrow-left')}</button><label>Year<select data-activity-year>${years.map(year => `<option value="${year}" ${year === selectedYear ? 'selected' : ''}>${year}</option>`).join('')}</select></label><button type="button" class="icon-button" data-activity-action="next-year" title="Next year" aria-label="Next year" ${selectedYear >= years[0] ? 'disabled' : ''}>${icon('arrow-right')}</button><label class="activity-date-label">Day<input type="date" data-activity-day-input value="${selectedDate}" min="${years.at(-1)}-01-01" max="${today}" /></label><button type="button" class="secondary-button" data-activity-action="today">${icon('calendar-days')}Today</button></div><div class="activity-year-stats"><div><strong>${stats.total}</strong><span>completions</span></div><div><strong>${stats.activeDays}</strong><span>active days</span></div><div><strong>${stats.longestStreak}</strong><span>longest streak</span></div></div><div class="activity-year-scroll">${grid(yearActivity(all, selectedYear, today), false)}</div>${legend()}<section class="activity-day-detail" data-activity-detail aria-live="polite"></section>`
    renderDay()
    scrollToDate()
  }
  const open = (date = localDay()) => {
    selectedDate = date
    selectedYear = Number(date.slice(0, 4))
    options.beforeOpen()
    renderYear()
    dialog.showModal()
    scrollToDate()
    dialog.querySelector<HTMLSelectElement>('[data-activity-year]')?.focus({ preventScroll: true })
  }
  const selectYear = (year: number) => {
    if (!availableYears().includes(year)) return
    selectedYear = year
    selectedDate = year === new Date().getFullYear() ? localDay() : Object.keys(history()).filter(date => date.startsWith(`${year}-`)).sort().at(-1) ?? `${year}-12-31`
    renderYear()
  }
  const refresh = () => {
    const today = localDay()
    const all = history()
    const next = `${today}:${JSON.stringify(all)}`
    clearTimeout(midnightTimer)
    const now = new Date()
    midnightTimer = setTimeout(refresh, Math.max(1000, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime() + 100))
    if (next === signature) return
    signature = next
    const stats = activityStats(all, today)
    host.innerHTML = `<div class="activity-heading"><h2>Daily completions</h2><button type="button" class="icon-button" data-activity-open title="View yearly completion history" aria-label="View yearly completion history">${icon('calendar-days')}</button></div><div class="activity-compact-stats"><span><strong>${all[today]?.length ?? 0}</strong> today</span><span><strong>${stats.currentStreak}</strong>-day streak</span></div>${grid(recentActivity(all, today), true)}<div class="activity-compact-caption"><span>Last 13 weeks</span>${legend()}</div>`
    if (dialog.open) renderYear()
    options.enhanceIcons()
  }
  host.addEventListener('click', event => {
    const target = event.target as Element
    const date = target.closest<HTMLButtonElement>('[data-activity-date]')?.dataset.activityDate
    if (date) open(date)
    else if (target.closest('[data-activity-open]')) open()
  }, events)
  dialog.addEventListener('click', event => {
    const target = event.target as Element
    const date = target.closest<HTMLButtonElement>('[data-activity-date]')?.dataset.activityDate
    if (date) { selectedDate = date; renderDay() }
    const action = target.closest<HTMLElement>('[data-activity-action]')?.dataset.activityAction
    if (action === 'close') dialog.close()
    if (action === 'previous-year') selectYear(selectedYear - 1)
    if (action === 'next-year') selectYear(selectedYear + 1)
    if (action === 'today') { selectedDate = localDay(); selectedYear = new Date().getFullYear(); renderYear() }
    if (target.closest('a')) dialog.close()
    if (target === dialog) {
      const bounds = dialog.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close()
    }
  }, events)
  dialog.addEventListener('change', event => {
    const target = event.target as HTMLInputElement
    if (target.matches('[data-activity-year]')) selectYear(Number(target.value))
    if (target.matches('[data-activity-day-input]') && target.checkValidity() && validActivityDate(target.value) && target.value <= localDay()) { selectedDate = target.value; selectedYear = Number(selectedDate.slice(0, 4)); renderYear() }
  }, events)
  const keyboard = (event: KeyboardEvent) => {
    const target = event.target as HTMLButtonElement
    if (!target.matches('[data-activity-date]')) return
    const buttons = [...target.closest<HTMLElement>('.activity-grid')!.querySelectorAll<HTMLButtonElement>('[data-activity-date]:not(:disabled)')]
    const offset = ({ ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 } as Record<string, number>)[event.key]
    if (offset === undefined && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const wanted = event.key === 'Home' ? buttons[0].dataset.activityDate! : event.key === 'End' ? buttons.at(-1)!.dataset.activityDate! : shiftDay(target.dataset.activityDate!, offset)
    const destination = buttons.find(button => button.dataset.activityDate === wanted) ?? (wanted < buttons[0].dataset.activityDate! ? buttons[0] : buttons.at(-1)!)
    buttons.forEach(button => { button.tabIndex = button === destination ? 0 : -1 })
    destination.focus()
    if (dialog.contains(destination)) { selectedDate = destination.dataset.activityDate!; renderDay() }
  }
  host.addEventListener('keydown', keyboard, events)
  dialog.addEventListener('keydown', keyboard, events)
  dialog.addEventListener('close', () => {
    const trigger = host.closest('[inert]') ? document.querySelector<HTMLButtonElement>('[data-action="open-sidebar"]') : host.querySelector<HTMLButtonElement>('[data-activity-open]')
    trigger?.focus({ preventScroll: true })
  }, events)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh() }, events)
  refresh()
  return { refresh, destroy: () => { clearTimeout(midnightTimer); listeners.abort(); dialog.remove(); host.replaceChildren() } }
}