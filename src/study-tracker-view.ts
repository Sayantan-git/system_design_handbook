import { localDay } from './activity'
import { escapeHtml, type Book } from './book'
import { topicRoute } from './lessons'
import { createStudyPlan, latestStudyStartDate, setStudyDay, studyTrackerReport, validateStudyTracker, type StudyDay, type StudyTrackerState } from './study-tracker'

interface TrackerOptions { state: () => StudyTrackerState; save: (state: StudyTrackerState) => void; enhanceIcons: () => void }
type TrackerReport = ReturnType<typeof studyTrackerReport>
type ReportDay = TrackerReport['days'][number]
const icon = (name: string) => `<i data-lucide="${name}" aria-hidden="true"></i>`
const dateLabel = (date?: string) => date ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)) : 'Not scheduled'
const statusLabels: Record<string, string> = { complete: 'Completed', pending: 'Pending', overdue: 'Overdue', today: 'Today', upcoming: 'Upcoming' }

export function mountStudyTracker(root: HTMLElement, book: Book, options: TrackerOptions) {
  const listeners = new AbortController()
  const events = { signal: listeners.signal }
  const plan = createStudyPlan(book)
  const query = new URLSearchParams(location.hash.split('?')[1] ?? '')
  const initial = studyTrackerReport(plan, options.state())
  const requestedWeek = Number(query.get('week'))
  let weekNumber = Number.isInteger(requestedWeek) && requestedWeek >= 1 && requestedWeek <= 8 ? requestedWeek : initial.nextDay?.week ?? 8
  let mode: 'plan' | 'report' = query.get('view') === 'report' ? 'report' : 'plan'
  let filter: 'all' | 'pending' | 'completed' = 'all'
  let signature = ''
  let midnightTimer: ReturnType<typeof setTimeout> | undefined
  const openDays = new Set(initial.nextDay ? [initial.nextDay.id] : [])
  const topics = (day: StudyDay) => `<ul class="tracker-topic-list">${day.topics.map(topic => `<li><a href="${topicRoute(book, topic)}"><span class="topic-label-number">${topic.number}</span><span>${escapeHtml(topic.title)}</span>${icon('arrow-up-right')}</a></li>`).join('')}</ul>`
  const matches = (day: ReportDay) => filter === 'all' || (filter === 'completed' ? day.complete : !day.complete)
  const badge = (day: ReportDay) => `<span class="tracker-status" data-status="${day.status}">${day.complete ? icon('circle-check') : ''}${statusLabels[day.status]}</span>`
  const dayHeading = (day: StudyDay) => day.review ? 'Weekly revision' : day.topics[0].title
  const focus = (key: string) => (root.querySelector<HTMLElement>(`[data-tracker-focus="${key}"]`) ?? root.querySelector<HTMLElement>('[data-tracker-filter]'))?.focus({ preventScroll: true })

  const renderPlan = (report: TrackerReport) => {
    const week = plan[weekNumber - 1]
    const progress = report.weeks[weekNumber - 1]
    const days = report.days.filter(day => day.week === weekNumber && matches(day))
    return `<nav class="tracker-weeks" aria-label="Study weeks">${report.weeks.map(item => `<button type="button" data-tracker-week="${item.number}" data-tracker-focus="week-${item.number}" aria-pressed="${item.number === weekNumber}" class="${item.number === weekNumber ? 'active' : ''}" title="${escapeHtml(item.title)}"><span>Week ${item.number}</span><strong>${item.completed} / ${item.total}</strong><progress max="7" value="${item.completed}" aria-label="Week ${item.number} completion"></progress></button>`).join('')}</nav>
      <section class="tracker-week" aria-labelledby="tracker-week-title"><header class="tracker-week-heading"><div><span class="eyebrow">DAYS ${week.days[0].number} TO ${week.days[6].number}</span><h2 id="tracker-week-title">${escapeHtml(week.title)}</h2></div><span>${progress.completed} / 7 days complete</span></header><p class="tracker-week-goal">${escapeHtml(week.goal)}</p>
      <div class="tracker-days">${days.map(day => `<article class="tracker-day ${day.complete ? 'is-complete' : ''}" id="tracker-day-${day.number}" data-tracker-day-row="${day.id}"><div class="tracker-day-line"><label class="tracker-day-check"><input type="checkbox" data-tracker-day="${day.id}" data-tracker-focus="${day.id}" aria-label="Day ${day.number} completed" ${day.complete ? 'checked' : ''} /><strong>Day ${day.number}</strong></label>${day.date ? `<time datetime="${day.date}">${dateLabel(day.date)}</time>` : '<span class="tracker-unscheduled">Not scheduled</span>'}${badge(day)}</div><details data-tracker-detail="${day.id}" ${openDays.has(day.id) ? 'open' : ''}><summary><span>${escapeHtml(dayHeading(day))}<small>${day.topics.length} ${day.review ? 'revision links' : 'lessons'}</small></span>${icon('chevron-down')}</summary>${topics(day)}<div class="tracker-day-task"><strong>${day.review ? 'Revision task' : 'Understanding check'}</strong><p>${day.review ? escapeHtml(day.goal) : 'Explain one example and its failure case from these lessons. Revisit any step you cannot yet explain in your own words.'}</p>${day.review ? '<a class="text-button" href="#/interview">' + icon('target') + 'Interview revision' + icon('arrow-right') + '</a>' : ''}</div></details></article>`).join('') || `<div class="tracker-empty"><h3>No ${filter === 'completed' ? 'completed' : 'pending'} days in this week</h3><button type="button" class="secondary-button" data-tracker-action="show-all">${icon('list-ordered')}Show all days</button></div>`}</div>
      <footer class="tracker-week-pagination"><button type="button" class="secondary-button" data-tracker-action="previous-week" ${weekNumber === 1 ? 'disabled' : ''}>${icon('arrow-left')}Previous week</button><span>Week ${weekNumber} / 8</span><button type="button" class="secondary-button" data-tracker-action="next-week" ${weekNumber === 8 ? 'disabled' : ''}>Next week${icon('arrow-right')}</button></footer></section>`
  }
  const renderReport = (report: TrackerReport) => `<section class="tracker-report" aria-labelledby="tracker-report-title"><header class="tracker-report-heading"><h2 id="tracker-report-title">Study Report</h2><span>${report.percent}% of planned days complete</span></header><dl class="tracker-report-facts"><div><dt>Planned finish</dt><dd>${dateLabel(report.endDate)}</dd></div><div><dt>Next unfinished day</dt><dd>${report.nextDay ? `Day ${report.nextDay.number}` : 'Plan complete'}</dd></div><div><dt>Overdue scheduled days</dt><dd data-tracker-overdue>${report.overdue}</dd></div></dl>
    <div class="table-scroll tracker-table-scroll" tabindex="0" role="region" aria-label="Weekly study progress"><table class="tracker-report-table"><caption>Weekly progress</caption><thead><tr><th scope="col">Week</th><th scope="col">Focus</th><th scope="col">Days</th><th scope="col">Lessons in completed days</th><th scope="col">Revision day</th></tr></thead><tbody>${report.weeks.map(week => `<tr><th scope="row"><button type="button" class="tracker-report-link" data-tracker-report-week="${week.number}" aria-label="Open week ${week.number}">Week ${week.number}${icon('arrow-up-right')}</button></th><td>${escapeHtml(week.title)}</td><td><span>${week.completed} / ${week.total}</span><progress max="${week.total}" value="${week.completed}" aria-label="Week ${week.number} completed days"></progress></td><td>${week.lessonsCompleted} / ${week.lessonTotal}</td><td>${week.reviewComplete ? 'Completed' : 'Pending'}</td></tr>`).join('')}</tbody></table></div>
    <div class="table-scroll tracker-table-scroll tracker-daily-report" tabindex="0" role="region" aria-label="Daily study status"><table class="tracker-report-table"><caption>Day-by-day status</caption><thead><tr><th scope="col">Day</th><th scope="col">Scheduled date</th><th scope="col">Topics</th><th scope="col">Status</th></tr></thead><tbody>${report.days.filter(matches).map(day => `<tr data-tracker-report-day="${day.number}"><th scope="row"><button type="button" class="tracker-report-link" data-tracker-open-day="${day.number}">Day ${day.number}${icon('arrow-up-right')}</button><small>Week ${day.week}</small></th><td>${dateLabel(day.date)}</td><td><details><summary>${day.topics.length} ${day.review ? 'revision links' : 'lessons'}</summary>${topics(day)}</details></td><td>${badge(day)}</td></tr>`).join('') || '<tr><td colspan="4">No days match this status.</td></tr>'}</tbody></table></div></section>`

  const render = () => {
    const state = options.state()
    const report = studyTrackerReport(plan, state)
    signature = `${localDay()}:${JSON.stringify(state)}`
    root.innerHTML = `<div class="view-content tracker-view"><header class="view-heading"><div><span class="eyebrow">DAILY STUDY PLAN</span><h1>8-week Study Tracker</h1><p class="tracker-subtitle">56 days &middot; ${report.lessonTotal} project lessons &middot; 8 revision days</p></div></header><div class="tracker-summary" aria-label="Study tracker totals"><div><strong><output data-tracker-completed>${report.completed}</output><small> / 56</small></strong><span>days completed</span></div><div><strong data-tracker-remaining>${report.remaining}</strong><span>days remaining</span></div><div><strong><output data-tracker-lessons>${report.lessonsCompleted}</output><small> / ${report.lessonTotal}</small></strong><span>lessons in completed days</span></div><div><strong><output data-tracker-reviews>${report.reviewsCompleted}</output><small> / 8</small></strong><span>revision days completed</span></div></div><progress class="tracker-total-progress" value="${report.completed}" max="56" aria-label="Study plan completion"></progress>
      <div class="tracker-schedule"><label for="tracker-start-date">Start date <span>(optional)</span><input id="tracker-start-date" data-tracker-focus="start" type="date" min="1970-01-01" max="${latestStudyStartDate}" value="${escapeHtml(state.startDate ?? '')}" /></label><button type="button" class="icon-button" data-tracker-action="clear-date" data-tracker-focus="clear-date" title="Clear scheduled dates" aria-label="Clear scheduled dates" ${!state.startDate ? 'disabled' : ''}>${icon('x')}</button><button type="button" class="secondary-button" data-tracker-action="start-today">${icon('calendar-days')}Start today</button><button type="button" class="secondary-button tracker-next" data-tracker-action="next-unfinished" ${!report.nextDay ? 'disabled' : ''}>${icon('arrow-right')}${report.nextDay ? `Continue: Day ${report.nextDay.number}` : 'All days complete'}</button></div>
      <div class="tracker-toolbar"><div class="segmented" role="tablist" aria-label="Study tracker view"><button id="tracker-plan-tab" type="button" role="tab" data-tracker-mode="plan" data-tracker-focus="plan" aria-selected="${mode === 'plan'}" aria-controls="tracker-panel" tabindex="${mode === 'plan' ? '0' : '-1'}" class="${mode === 'plan' ? 'active' : ''}">${icon('calendar-days')}Study Plan</button><button id="tracker-report-tab" type="button" role="tab" data-tracker-mode="report" data-tracker-focus="report" aria-selected="${mode === 'report'}" aria-controls="tracker-panel" tabindex="${mode === 'report' ? '0' : '-1'}" class="${mode === 'report' ? 'active' : ''}">${icon('activity')}Study Report</button></div><label class="tracker-filter">Status<select data-tracker-filter data-tracker-focus="filter"><option value="all" ${filter === 'all' ? 'selected' : ''}>All days</option><option value="pending" ${filter === 'pending' ? 'selected' : ''}>Pending</option><option value="completed" ${filter === 'completed' ? 'selected' : ''}>Completed</option></select></label></div><p class="sr-only" data-tracker-notice role="status" aria-live="polite"></p><div id="tracker-panel" role="tabpanel" aria-labelledby="tracker-${mode}-tab">${mode === 'plan' ? renderPlan(report) : renderReport(report)}</div></div>`
    history.replaceState(history.state, '', `#/tracker?view=${mode}&week=${weekNumber}`)
    options.enhanceIcons()
  }
  const goToDay = (number: number) => {
    const day = plan.flatMap(week => week.days).find(day => day.number === number)
    if (!day) return
    weekNumber = day.week
    mode = 'plan'
    filter = 'all'
    openDays.add(day.id)
    render()
    focus(day.id)
    root.querySelector<HTMLElement>(`#tracker-day-${day.number}`)?.scrollIntoView({ block: 'nearest' })
  }
  const saveDate = (date: string | null) => {
    options.save(validateStudyTracker({ ...options.state(), startDate: date }))
    render()
    focus('start')
  }
  root.addEventListener('change', event => {
    const target = event.target as HTMLInputElement
    if (target.dataset.trackerDay) {
      const id = target.dataset.trackerDay
      const day = plan.flatMap(week => week.days).find(day => day.id === id)
      if (!day) return
      const checked = target.checked
      options.save(setStudyDay(options.state(), id, checked))
      render()
      focus(id)
      root.querySelector('[data-tracker-notice]')!.textContent = `Day ${day.number} ${checked ? 'completed' : 'marked pending'}.`
    }
    if (target.id === 'tracker-start-date' && target.checkValidity()) saveDate(target.value || null)
    if (target.matches('[data-tracker-filter]')) { filter = target.value as typeof filter; render(); focus('filter') }
  }, events)
  root.addEventListener('click', event => {
    const target = event.target as Element
    const selectedMode = target.closest<HTMLElement>('[data-tracker-mode]')?.dataset.trackerMode
    if (selectedMode === 'plan' || selectedMode === 'report') { mode = selectedMode; render(); focus(mode); return }
    const selectedWeek = target.closest<HTMLElement>('[data-tracker-week], [data-tracker-report-week]')
    if (selectedWeek) {
      const number = Number(selectedWeek.dataset.trackerWeek ?? selectedWeek.dataset.trackerReportWeek)
      if (Number.isInteger(number) && number >= 1 && number <= 8) { weekNumber = number; mode = 'plan'; render(); focus(`week-${number}`) }
      return
    }
    const day = target.closest<HTMLElement>('[data-tracker-open-day]')?.dataset.trackerOpenDay
    if (day) { goToDay(Number(day)); return }
    const action = target.closest<HTMLElement>('[data-tracker-action]')?.dataset.trackerAction
    if (action === 'start-today') saveDate(localDay())
    if (action === 'clear-date') saveDate(null)
    if (action === 'show-all') { filter = 'all'; render(); focus('filter') }
    if (action === 'next-unfinished') { const next = studyTrackerReport(plan, options.state()).nextDay; if (next) goToDay(next.number) }
    if (action === 'previous-week' || action === 'next-week') { weekNumber = Math.max(1, Math.min(8, weekNumber + (action === 'next-week' ? 1 : -1))); render(); focus(`week-${weekNumber}`); root.querySelector('.tracker-weeks')?.scrollIntoView({ block: 'nearest' }) }
  }, events)
  root.addEventListener('toggle', event => {
    const target = event.target
    if (!(target instanceof HTMLDetailsElement) || !target.dataset.trackerDetail) return
    if (target.open) openDays.add(target.dataset.trackerDetail)
    else openDays.delete(target.dataset.trackerDetail)
  }, { ...events, capture: true })
  root.addEventListener('keydown', event => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-tracker-mode]') || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    mode = event.key === 'Home' ? 'plan' : event.key === 'End' ? 'report' : mode === 'plan' ? 'report' : 'plan'
    render(); focus(mode)
  }, events)
  const refresh = () => { if (signature !== `${localDay()}:${JSON.stringify(options.state())}`) render() }
  const scheduleMidnight = () => {
    const now = new Date()
    midnightTimer = setTimeout(() => { refresh(); scheduleMidnight() }, new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime() + 100)
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh() }, events)
  render()
  scheduleMidnight()
  return { refresh, destroy: () => { listeners.abort(); clearTimeout(midnightTimer) } }
}