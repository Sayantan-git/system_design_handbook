import '@fontsource-variable/manrope'
import '@fontsource-variable/source-serif-4'
import '@fontsource/ibm-plex-mono/400.css'
import 'katex/dist/katex.min.css'
import './studio.css'
import DOMPurify from 'dompurify'
import Fuse from 'fuse.js'
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpFromLine, ArrowUpRight, BookMarked, BookOpen,
  Bookmark, CalendarDays, Check, CheckCheck, ChevronDown, ChevronRight, ChevronsDownUp, CircleCheck, Clock3,
  Copy, Database, DoorOpen, ExternalLink, FileText, Globe, GraduationCap, Hand, HeartPulse, Layers3, Library, ListOrdered, Maximize2,
  Menu, Minus, MonitorSmartphone, Moon, Network, NotebookPen, Pause, Play, Plus, RotateCcw, Route, Search,
  Cloud, Eye, KeyRound, LogIn, LogOut, RefreshCw, Scan, Send, Server, Settings2, ShieldCheck, Shuffle, Sparkles, Split, Square, Sun, Target, Trash2, UserRound, Workflow, X, Zap, createIcons,
} from 'lucide'
import handbook from '../content/handbook.md?raw'
import { escapeHtml, parseBook, readRoute, renderDiagramControls, renderDiagramPlayback, renderEntry, type Entry, type SearchRecord } from './book'
import { courseStages, displayChapterNumber, filterTopicGroups, formatChapterReferences, otherTopicGroups, resolveTopic, scenarios, sectionForChapter, sectionLabels, systemDesignGroups, topicReading, type StudySection, type Topic } from './curriculum'
import { diagramSnapshot, disposeDiagrams, handleDiagramAction, mountDiagram } from './diagrams'
import { emptyState, loadState, mergeState, saveState, toggleChapterCompletion, toggleItem, validateState, type StudyState } from './state'
import { questions, type Question } from './questions'
import { mountRequestFlow, renderRequestFlow } from './request-flow-view'
import { mountGeminiChat } from './gemini-chat'
import { mountNotebook } from './notebook-view'
import { createNotebookNote } from './notebook'
import { mountInterview } from './interview-view'
import { createCloudSync, type CloudStatus } from './cloud-sync'
import { allLearningTopics, conciseLessonHtml, lessonText, numberedTopic, otherTopicsSectionNumber, referenceHeadings, topicForReading, topicRoute, type NumberedTopic } from './lessons'
import { mountCompletionActivity } from './activity-view'
import { mountStudyTracker } from './study-tracker-view'
import { visualLabs } from './visual-labs'
import { mountVisualLabs, renderVisualLab, renderVisualLabs } from './visual-labs-view'

const book = parseBook(handbook)
const ids = [...book.chapters, ...book.entries.filter(entry => entry.number === null)].map(entry => entry.id)
const firstChapter = book.chapters[0]
const studyTopics = allLearningTopics(book)
const loaded = (() => { try { return loadState(localStorage, ids) } catch { return { state: emptyState(firstChapter.id), warning: true } } })()
let state: StudyState = loaded.state
if (!book.entries.some(entry => entry.id === state.lastChapter)) state.lastChapter = firstChapter.id
let storageWarning = loaded.warning
let navigation = readRoute(location.hash, state.lastChapter)
let currentEntry = book.entries.find(entry => entry.id === navigation.entryId) ?? firstChapter
let generation = 0
let diagramSequence = 0
let diagramRun = 0
let activeTab: 'outline' | 'notes' = 'outline'
let readingMode: 'concise' | 'reference' = 'concise'
let conciseReading = false
let readerHeadings: { id: string; title: string; depth: number; number: string }[] = []
let chapterFilter = ''
let chapterScope = 'all'
let sidebarView: 'topics' | 'chapters' = 'topics'
const openTopicGroups = new Set(['core-fundamentals', 'traffic-networking'])
let autoOpenTopicGroups = true
let curriculumTab: 'visuals' | 'flow' | 'topics' | 'scenarios' = 'visuals'
let disposeRequestFlow: (() => void) | undefined
let disposeVisualLabs: (() => void) | undefined
let topicFilter = ''
let topicGroup = ''
let topicStage = ''
let coreTopicsOnly = false
let roadmapSection: StudySection = 'system-design'
let practiceMode: 'questions' | 'cards' = 'questions'
let practiceScope = 'all'
let practiceFilter = 'all'
let questionIndex = 0
let cardRevealed = false
let pendingAnswer: number | undefined
let libraryTab = 'videos'
let libraryFilter = ''
let activeSearch = 0
let searchResults: SearchRecord[] = []
let scrollSave = 0
let toastTimer = 0
let mermaidLoader: Promise<typeof import('mermaid')['default']> | null = null
let suppressPositionSave = false
let notebookWidget: ReturnType<typeof mountNotebook> | undefined
let interviewView: ReturnType<typeof mountInterview> | undefined
let studyTrackerView: ReturnType<typeof mountStudyTracker> | undefined
let cloudSync: ReturnType<typeof createCloudSync> | undefined
let cloudStatus: CloudStatus | undefined
let completionActivity: ReturnType<typeof mountCompletionActivity> | undefined

const icons = { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpFromLine, ArrowUpRight, BookMarked, BookOpen, Bookmark, CalendarDays, Check, CheckCheck, ChevronDown, ChevronRight, ChevronsDownUp, CircleCheck, Clock3, Cloud, Copy, Database, DoorOpen, ExternalLink, Eye, FileText, Globe, GraduationCap, Hand, HeartPulse, KeyRound, Layers3, Library, ListOrdered, LogIn, LogOut, Maximize2, Menu, Minus, MonitorSmartphone, Moon, Network, NotebookPen, Pause, Play, Plus, RefreshCw, RotateCcw, Route, Scan, Search, Send, Server, Settings2, ShieldCheck, Shuffle, Sparkles, Split, Square, Sun, Target, Trash2, UserRound, Workflow, X, Zap }
const icon = (name: string) => `<i data-lucide="${name}" aria-hidden="true"></i>`
const button = (name: string, action: string, label: string, attributes = '') => `<button type="button" class="icon-button" data-action="${action}" title="${label}" aria-label="${label}" ${attributes}>${icon(name)}</button>`
const routeFor = (entryId: string, section?: string) => `#/read/${encodeURIComponent(entryId)}${section ? `?section=${encodeURIComponent(section)}` : ''}`
const enhanceIcons = () => createIcons({ icons, attrs: { 'stroke-width': 1.7, width: 19, height: 19, 'aria-hidden': 'true' } })
const element = <ElementType extends HTMLElement>(selector: string) => document.querySelector<ElementType>(selector)!
const chapterNumber = (entry: Entry) => String(displayChapterNumber(book, entry)).padStart(2, '0')
const chapterLabel = (entry: Entry) => entry.number === null ? 'Reference' : `Chapter ${chapterNumber(entry)}`
const completedCount = () => book.chapters.filter(entry => state.completed.includes(entry.id)).length
const referenceEntry = (title: string) => book.entries.find(entry => entry.title === title)!
const sectionTitle = (section: StudySection) => `${section === 'other-topics' ? `${otherTopicsSectionNumber}. ` : ''}${sectionLabels[section]}`
const mobileLayout = matchMedia('(max-width: 760px)')
const topicSearchRecords: SearchRecord[] = studyTopics.map(topic => {
  const { entry, section } = resolveTopic(book, topic)
  return { id: topic.key, entryId: entry.id, title: topic.title, chapter: sectionTitle(topic.section), text: `${topic.number} ${topic.coverage} ${section ?? ''}`, topicKey: topic.key }
})
const searchIndex = new Fuse([...topicSearchRecords, ...book.search], { keys: [{ name: 'title', weight: 3 }, { name: 'chapter', weight: 2 }, { name: 'text', weight: 1 }], threshold: 0.28, ignoreLocation: true, minMatchCharLength: 2 })
const readingTopic = () => topicForReading(book, currentEntry, navigation.section, navigation.topic)

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="topbar">
    <a class="brand" href="#/system-design" aria-label="System Design Studio home"><span class="brand-symbol">${icon('network')}</span><span>system design<span class="brand-subtitle">STUDIO</span></span></a>
    <nav class="top-nav" aria-label="Main navigation">
      <a href="#/system-design" data-view="system-design">${icon('network')}<span>System Design</span></a>
      <a href="#/practice" data-view="practice">${icon('graduation-cap')}<span>Practice</span></a>
      <a href="#/interview" data-view="interview">${icon('target')}<span>Interview</span></a>
      <a href="#/tracker" data-view="tracker" title="8-week Study Tracker" aria-label="Study Tracker">${icon('calendar-days')}<span>Tracker</span></a>
      <a href="#/roadmap" data-view="roadmap">${icon('route')}<span>Roadmap</span></a>
      <a href="#/library" data-view="library">${icon('library')}<span>Library</span></a>
    </nav>
    <div class="top-actions"><button class="search-trigger" type="button" data-action="search" aria-label="Search the complete guide" title="Search the complete guide">${icon('search')}<span>Search the guide</span><kbd>Ctrl K</kbd></button>${button('user-round', 'account', 'Google account and sync')}${button('moon', 'theme', 'Switch to dark theme')}${button('settings-2', 'settings', 'Reading and progress settings')}</div>
  </header>
  <div class="workspace">
    <aside id="sidebar" class="sidebar" aria-label="Study navigation">
      <div class="sidebar-heading"><span class="eyebrow">THE HANDBOOK</span>${button('x', 'close-sidebar', 'Close study navigation')}</div>
      <div class="sidebar-view-controls"><div class="segmented sidebar-views" aria-label="Navigation view"><button data-sidebar-view="topics" type="button">${icon('layers-3')}Topics</button><button data-sidebar-view="chapters" type="button">${icon('book-open')}Chapters</button></div>${button('chevrons-down-up', 'collapse-topics', 'Collapse all topic groups', 'aria-controls="chapter-list"')}</div>
      <div class="sidebar-search">${icon('search')}<input id="chapter-search" type="search" placeholder="Find a topic" aria-label="Filter topics" /></div>
      <div class="segmented chapter-filters" aria-label="Chapter filter"><button data-scope="all" class="active" type="button">All</button><button data-scope="unfinished" type="button">To read</button><button data-scope="saved" type="button">Saved</button></div>
      <div id="chapter-list" class="chapter-list"></div>
      <div class="sidebar-footer"><div><span>Overall progress</span><strong id="progress-label"></strong></div><progress id="chapter-progress" max="32" value="0" aria-label="Completed chapters across both sections"></progress><section id="completion-activity" class="activity-compact" aria-label="Daily chapter completion activity"></section><span class="local-status"><span></span>Saved in this browser</span></div>
    </aside>
    <button id="sidebar-backdrop" class="sidebar-backdrop" data-action="close-sidebar" aria-label="Close chapter navigation" hidden></button>
    <main id="main-content" class="main-content" tabindex="-1"></main>
  </div>
  <dialog id="search-dialog" class="search-dialog" aria-labelledby="search-title">
    <div class="search-dialog-input">${icon('search')}<label class="sr-only" id="search-title" for="global-search">Search the complete handbook</label><input id="global-search" type="search" autocomplete="off" placeholder="Search a topic, term, or question..." aria-controls="search-results" />${button('x', 'close-dialog', 'Close search')}</div>
    <div id="search-summary" class="search-summary"></div><div id="search-results" class="search-results"></div>
  </dialog>
  <dialog id="settings-dialog" class="settings-dialog" aria-labelledby="settings-title">
    <div class="dialog-heading"><div><span class="eyebrow">YOUR WORKSPACE</span><h2 id="settings-title">Reading & progress</h2></div>${button('x', 'close-dialog', 'Close settings')}</div>
    <div class="setting-row"><span>Appearance</span><div class="segmented"><button data-theme="light" type="button">${icon('sun')}Light</button><button data-theme="dark" type="button">${icon('moon')}Dark</button></div></div>
    <div class="setting-row"><span>Reading size</span><div class="size-control">${button('minus', 'font-down', 'Decrease reading size')}<output id="font-size-label"></output>${button('plus', 'font-up', 'Increase reading size')}</div></div>
    <div class="settings-divider"></div><section class="account-settings" aria-labelledby="account-title"><h3 id="account-title" tabindex="-1">Google Account</h3><div id="account-controls"></div></section>
    <div class="settings-divider"></div><h3>Study data</h3><div id="settings-stats" class="settings-stats"></div>
    <button class="setting-command" data-action="export" type="button">${icon('arrow-down-to-line')}<span>Export progress & notes</span>${icon('arrow-right')}</button>
    <button class="setting-command" data-action="import" type="button">${icon('arrow-up-from-line')}<span>Import progress & notes</span>${icon('arrow-right')}</button>
    <button class="setting-command danger" data-action="reset" type="button">${icon('rotate-ccw')}<span>Reset this browser's study data</span></button>
    <p class="storage-note" id="storage-note">Saved in this browser.</p>
  </dialog>
  <dialog id="confirm-dialog" class="confirm-dialog" aria-labelledby="confirm-title"><div class="dialog-heading"><h2 id="confirm-title">Reset study data?</h2>${button('x', 'close-dialog', 'Cancel reset')}</div><p>This removes your chapter progress, bookmarks, notes, and practice answers from this browser. Export a backup before resetting to keep a copy.</p><div class="dialog-actions"><button class="secondary-button" data-action="close-dialog" type="button">Cancel</button><button class="primary-button danger-button" data-action="confirm-reset" type="button">Reset data</button></div></dialog>
  <dialog id="review-reset-dialog" class="confirm-dialog" aria-labelledby="review-reset-title"><div class="dialog-heading"><h2 id="review-reset-title">Clear review answers?</h2>${button('x', 'close-dialog', 'Cancel clearing answers')}</div><p>Your chapter progress, bookmarks, and notes will stay unchanged.</p><div class="dialog-actions"><button class="secondary-button" data-action="close-dialog" type="button">Cancel</button><button class="primary-button" data-action="confirm-review-reset" type="button">Clear answers</button></div></dialog>
  <dialog id="guest-import-dialog" class="confirm-dialog" aria-labelledby="guest-import-title"><div class="dialog-heading"><h2 id="guest-import-title">Copy guest study data?</h2>${button('x', 'close-dialog', 'Cancel copying guest data')}</div><p>Copy this browser's guest notes, progress, and answers into the signed-in Google account. Matching notes and answers will use the guest copy. Other account data and the guest copy remain.</p><div class="dialog-actions"><button class="secondary-button" data-action="close-dialog" type="button">Cancel</button><button class="primary-button" data-action="confirm-guest-import" type="button">${icon('copy')}Copy to account</button></div></dialog>
  <dialog id="diagram-dialog" class="diagram-dialog" aria-labelledby="diagram-title"><div class="dialog-heading"><h2 id="diagram-title">Architecture diagram</h2>${renderDiagramControls(true)}</div><div id="expanded-diagram" class="diagram-stage expanded-diagram" tabindex="0" role="region" aria-label="Architecture diagram"></div><div class="diagram-selection" role="status" aria-live="polite" hidden></div>${renderDiagramPlayback()}</dialog>
  <input id="import-input" type="file" accept="application/json,.json" hidden />
  <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
  <div id="gemini-widget"></div>
`

function persist() {
  let success = false
  try { success = cloudSync ? cloudSync.save(state) : saveState(localStorage, state) } catch { success = false }
  if (!success && !storageWarning) { storageWarning = true; toast('This browser cannot save your progress. Export your progress and notes before closing this page.') }
  refreshSaveStatus()
}

function refreshSaveStatus() {
  const label = storageWarning ? 'Local saving unavailable' : cloudStatus?.signedIn ? cloudStatus.error ? 'Sync paused; saved locally' : cloudStatus.pending ? 'Saved locally; sync pending' : cloudStatus.ready ? 'Synced to your account' : 'Connecting to your account' : 'Saved in this browser'
  element('.local-status').innerHTML = `<span class="${storageWarning || cloudStatus?.error ? 'warning' : ''}"></span>${label}`
}

function renderAccount(status: CloudStatus) {
  cloudStatus = status
  element('#account-controls').innerHTML = `${status.signedIn ? `<p class="account-identity">${icon('user-round')}<span>${escapeHtml(status.account)}</span></p>` : ''}<p class="account-status ${status.error ? 'account-error' : ''}" role="status">${escapeHtml(status.message)}</p>${status.pending && status.signedIn ? `<p class="account-pending">${status.pending} record${status.pending === 1 ? '' : 's'} pending</p>` : ''}<div class="account-actions">${status.signedIn ? `<button class="secondary-button" data-action="sync-now" type="button" ${status.busy ? 'disabled' : ''}>${icon('refresh-cw')}${status.error ? 'Retry sync' : 'Sync now'}</button><button class="secondary-button" data-action="guest-import" type="button" ${!status.ready ? 'disabled' : ''}>${icon('copy')}Copy guest data</button><button class="secondary-button" data-action="sign-out" type="button">${icon('log-out')}Sign out</button>` : `<button class="primary-button" data-action="sign-in" type="button" ${!status.configured || status.busy ? 'disabled' : ''}>${icon('log-in')}Sign in with Google</button>`}</div>`
  element('#storage-note').textContent = status.signedIn ? 'Only this account\'s study data is active. Gemini keys and chat history are never synced.' : 'Guest notes and progress stay in this browser until you explicitly copy or export them.'
  element('[data-action="reset"] span').textContent = status.signedIn ? 'Reset this account\'s study data' : 'Reset this browser\'s study data'
  element<HTMLButtonElement>('[data-action="reset"]').disabled = status.signedIn && (!status.ready || status.error)
  element('#confirm-dialog > p').textContent = status.signedIn ? 'This resets notes, progress, bookmarks, and answers for this Google account. Deletions will sync to its other devices. Export a backup before resetting.' : 'This removes notes, progress, bookmarks, and answers from this browser\'s guest workspace. Export a backup before resetting.'
  element('#review-reset-dialog > p').textContent = `Your chapter progress, bookmarks, notebook, and interview answers will stay unchanged.${status.signedIn ? ' Clearing practice answers will sync to this account\'s other devices.' : ''}`
  const accountButton = element<HTMLButtonElement>('[data-action="account"]')
  accountButton.classList.toggle('account-connected', status.signedIn)
  accountButton.title = status.signedIn ? `Google account: ${status.account}` : 'Google account and sync'
  accountButton.setAttribute('aria-label', accountButton.title)
  refreshSaveStatus()
  enhanceIcons()
}

function toast(message: string) {
  window.clearTimeout(toastTimer)
  const target = element('#toast')
  target.textContent = message
  target.hidden = false
  toastTimer = window.setTimeout(() => { target.hidden = true }, 4200)
}

function applyPreferences() {
  document.documentElement.dataset.theme = state.theme
  element<HTMLMetaElement>('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  document.documentElement.style.setProperty('--reading-size', `${state.fontSize}px`)
  const themeButton = element<HTMLButtonElement>('[data-action="theme"]')
  const label = state.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
  themeButton.innerHTML = icon(state.theme === 'light' ? 'moon' : 'sun')
  themeButton.title = label
  themeButton.setAttribute('aria-label', label)
  document.querySelectorAll<HTMLButtonElement>('button[data-theme]').forEach(control => { control.classList.toggle('active', control.dataset.theme === state.theme); control.setAttribute('aria-pressed', String(control.dataset.theme === state.theme)) })
  element('#font-size-label').textContent = `${state.fontSize}px`
  document.querySelectorAll<HTMLButtonElement>('[data-action="font-down"]').forEach(control => { control.disabled = state.fontSize <= 16 })
  document.querySelectorAll<HTMLButtonElement>('[data-action="font-up"]').forEach(control => { control.disabled = state.fontSize >= 22 })
  enhanceIcons()
}

function renderSidebar() {
  const list = element('#chapter-list')
  const position = list.scrollTop
  const search = element<HTMLInputElement>('#chapter-search')
  search.placeholder = sidebarView === 'topics' ? 'Find a topic' : 'Find a chapter'
  search.setAttribute('aria-label', sidebarView === 'topics' ? 'Filter topics' : 'Filter chapters')
  element<HTMLButtonElement>('[data-action="collapse-topics"]').hidden = sidebarView !== 'topics'
  document.querySelectorAll<HTMLButtonElement>('[data-sidebar-view]').forEach(control => { control.classList.toggle('active', control.dataset.sidebarView === sidebarView); control.setAttribute('aria-pressed', String(control.dataset.sidebarView === sidebarView)) })
  const visibleEntry = (entry: Entry) => chapterScope === 'all' || (chapterScope === 'unfinished' ? !state.completed.includes(entry.id) : state.bookmarks.includes(entry.id))
  let matches = 0
  if (sidebarView === 'topics') {
    const activeTopic = navigation.view === 'read' ? readingTopic() : undefined
    const section = navigation.view === 'other-topics' || (navigation.view === 'read' && (activeTopic?.section ?? sectionForChapter(currentEntry.number)) === 'other-topics') ? 'other-topics' : 'system-design'
    const groups = section === 'system-design' ? systemDesignGroups : otherTopicGroups
    const searchGroups = section === 'other-topics' ? groups.map(group => ({ ...group, topics: group.topics.map(topic => ({ ...topic, coverage: `${topic.coverage} ${studyTopics.filter(child => child.parentKey === numberedTopic(topic)?.key).map(child => `${child.title} ${child.coverage}`).join(' ')}` })) })) : groups
    list.innerHTML = filterTopicGroups(searchGroups, { query: chapterFilter }).map(group => {
      const topics = group.topics.filter(topic => visibleEntry(resolveTopic(book, topic).entry))
      if (!topics.length) return ''
      matches += topics.length
      let selectedGroup = false
      const links = topics.map(topic => {
        const { entry, section } = resolveTopic(book, topic)
        const numbered = numberedTopic(topic)!
        const selected = navigation.view === 'read' && (activeTopic ? activeTopic.key === numbered.key : entry.id === currentEntry.id && section === navigation.section)
        const family = studyTopics.filter(child => child.parentKey === numbered.key)
        const selectedChild = activeTopic?.parentKey === numbered.key
        selectedGroup ||= selected || selectedChild
        return `<a class="sidebar-topic-link ${selected ? 'selected' : ''}" href="${topicRoute(book, numbered)}" ${selected ? 'aria-current="location"' : ''}><span><span class="topic-label-number">${numbered.number}</span> ${escapeHtml(topic.title)}</span>${icon(state.completed.includes(entry.id) ? 'check' : 'chevron-right')}</a>${family.length ? `<details class="sidebar-subtopics" data-topic-disclosure="${numbered.key}" ${(autoOpenTopicGroups && (chapterFilter || selectedChild)) || openTopicGroups.has(numbered.key) ? 'open' : ''}><summary>Subtopics <small>${family.length}</small>${icon('chevron-down')}</summary>${family.map(child => `<a class="sidebar-topic-link ${activeTopic?.key === child.key ? 'selected' : ''}" href="${topicRoute(book, child)}" ${activeTopic?.key === child.key ? 'aria-current="location"' : ''}><span><span class="topic-label-number">${child.number}</span> ${escapeHtml(child.title)}</span>${icon('chevron-right')}</a>`).join('')}</details>` : ''}`
      }).join('')
      return `<details class="sidebar-topic-group" data-topic-disclosure="${group.id}" ${(autoOpenTopicGroups && (chapterFilter || selectedGroup)) || openTopicGroups.has(group.id) ? 'open' : ''}><summary><span>${section === 'system-design' ? `${groups.findIndex(candidate => candidate.id === group.id) + 1}. ` : ''}${escapeHtml(group.title)}</span><span class="sidebar-topic-count">${topics.length}</span>${icon('chevron-down')}</summary>${links}</details>`
    }).join('')
    list.insertAdjacentHTML('beforeend', `<a class="sidebar-section-link" href="#/${section === 'system-design' ? 'other-topics' : 'system-design'}">${icon('book-open')}${sectionTitle(section === 'system-design' ? 'other-topics' : 'system-design')}${icon('arrow-right')}</a>`)
  } else {
  const groups = [
    { label: 'System Design', section: 'system-design' },
    { label: sectionTitle('other-topics'), section: 'other-topics' },
  ]
  element('#chapter-list').innerHTML = groups.map(group => {
    const entries = book.chapters.filter(entry => sectionForChapter(entry.number) === group.section && (!chapterFilter || `${chapterNumber(entry)} ${entry.title} ${group.label}`.toLowerCase().includes(chapterFilter.toLowerCase())) && (chapterScope === 'all' || (chapterScope === 'unfinished' ? !state.completed.includes(entry.id) : state.bookmarks.includes(entry.id))))
    matches += entries.length
    if (!entries.length) return ''
    return `<section class="chapter-group"><h2><a href="#/${group.section}">${group.label}${icon('arrow-right')}</a></h2>${entries.map(entry => `<a class="chapter-link ${entry.id === currentEntry.id && navigation.view === 'read' ? 'selected' : ''} ${state.completed.includes(entry.id) ? 'completed' : ''}" href="${routeFor(entry.id)}" ${entry.id === currentEntry.id && navigation.view === 'read' ? 'aria-current="page"' : ''}><span class="chapter-number">${state.completed.includes(entry.id) ? icon('check') : chapterNumber(entry)}</span><span>${escapeHtml(entry.title)}</span>${state.bookmarks.includes(entry.id) ? `<span class="chapter-saved">${icon('bookmark')}</span>` : ''}</a>`).join('')}</section>`
  }).join('')
  }
  if (!matches) list.innerHTML = `<div class="sidebar-empty">${icon(chapterScope === 'saved' ? 'bookmark' : 'search')}<p>${chapterScope === 'saved' ? 'No saved chapters match.' : `No matching ${sidebarView}.`}</p></div>`
  list.scrollTop = position
  element('#progress-label').textContent = `${completedCount()} / 32`
  element<HTMLProgressElement>('#chapter-progress').value = completedCount()
  document.querySelectorAll<HTMLButtonElement>('[data-scope]').forEach(control => { control.classList.toggle('active', control.dataset.scope === chapterScope); control.setAttribute('aria-pressed', String(control.dataset.scope === chapterScope)) })
  completionActivity?.refresh()
  enhanceIcons()
}

function closeSidebar() {
  const wasOpen = document.body.classList.contains('sidebar-open')
  document.body.classList.remove('sidebar-open')
  element('#sidebar-backdrop').hidden = true
  element('#sidebar').inert = mobileLayout.matches
  element('#main-content').inert = false
  element('.topbar').inert = false
  document.querySelector('[data-action="open-sidebar"]')?.setAttribute('aria-expanded', 'false')
  if (wasOpen && mobileLayout.matches) document.querySelector<HTMLButtonElement>('[data-action="open-sidebar"]')?.focus()
}

function pageTop(label: string, detail: string) {
  return `<div class="page-toolbar"><div class="breadcrumbs">${button('menu', 'open-sidebar', 'Open study navigation', 'aria-controls="sidebar" aria-expanded="false"')}<span>${label}</span>${icon('chevron-right')}<span>${detail}</span></div><span class="edition-label">A PRACTICAL HANDBOOK</span></div>`
}

function renderTopic(topic: Topic) {
  const { entry, section, minutes, diagrams } = topicReading(book, topic)
  const completed = state.completed.includes(entry.id)
  const numbered = numberedTopic(topic)
  const readingMinutes = numbered ? Math.max(1, Math.ceil(lessonText(numbered).split(/\s+/).length / 200)) : minutes
  return `<a class="topic-link" href="${numbered ? topicRoute(book, numbered) : routeFor(entry.id, section)}" data-core-topic="${Boolean(topic.core)}"><span class="topic-symbol">${icon(completed ? 'circle-check' : diagrams ? 'workflow' : 'book-open')}</span><div class="topic-copy"><h3>${numbered ? `<span class="topic-label-number">${numbered.number}</span> ` : ''}${escapeHtml(topic.title)}</h3><p>${escapeHtml(topic.coverage)}</p><span class="topic-meta">${topic.core ? '<strong>Core</strong>' : ''}<span>${icon('clock-3')}${readingMinutes} min</span>${diagrams ? `<span class="topic-animation">${icon('play')}${diagrams} animated diagram${diagrams === 1 ? '' : 's'}</span>` : ''}<span>${completed ? 'Chapter completed' : `${sectionLabels[numbered?.section ?? sectionForChapter(entry.number)]} ${chapterNumber(entry)}`}</span></span></div>${icon('arrow-up-right')}</a>`
}

function renderSubtopicLinks(topics: NumberedTopic[]) {
  return `<nav class="lesson-subtopic-links" aria-label="Numbered subtopics">${topics.map(topic => `<a href="${topicRoute(book, topic)}"><span class="topic-label-number">${topic.number}</span><span>${escapeHtml(topic.title)}</span>${icon('chevron-right')}</a>`).join('')}</nav>`
}

function renderCourseStages() {
  return `<section class="course-path" aria-label="Course learning path"><div class="course-path-heading"><h2>Learning path</h2><button type="button" class="text-button" data-course-stage="" aria-pressed="${!topicStage}">${icon('layers-3')}All topics</button></div><select class="course-stage-select" id="course-stage-select" aria-label="Learning stage"><option value="">All stages</option>${courseStages.map((stage, index) => `<option value="${stage.id}" ${topicStage === stage.id ? 'selected' : ''}>${String(index + 1).padStart(2, '0')} · ${stage.title}</option>`).join('')}</select><div class="course-stages" role="group" aria-label="Learning stage">${courseStages.map((stage, index) => `<button type="button" data-course-stage="${stage.id}" aria-pressed="${topicStage === stage.id}" class="course-stage ${topicStage === stage.id ? 'is-current' : ''}"><span class="course-stage-number">${String(index + 1).padStart(2, '0')}</span><span><strong>${stage.title}</strong><small>${stage.groups.length} ${stage.groups.length === 1 ? 'category' : 'categories'}</small></span>${icon('chevron-right')}</button>`).join('')}</div></section>`
}

function renderCurriculum(section: StudySection) {
  const systemDesign = section === 'system-design'
  const flowView = systemDesign && curriculumTab === 'flow'
  const visualView = systemDesign && curriculumTab === 'visuals'
  const entries = book.chapters.filter(entry => sectionForChapter(entry.number) === section)
  const completed = entries.filter(entry => state.completed.includes(entry.id)).length
  const resume = book.entries.find(entry => entry.id === state.lastChapter) ?? firstChapter
  const diagramCount = systemDesign ? book.diagrams : entries.reduce((total, entry) => total + entry.diagrams, 0)
  const groups = systemDesign ? systemDesignGroups : otherTopicGroups
  const availableGroups = systemDesign ? filterTopicGroups(groups, { stageId: topicStage }) : groups
  const topicCount = groups.reduce((total, group) => total + group.topics.length, 0)
  const tabs = [{ id: 'visuals', label: 'Visual lab', icon: 'activity' }, { id: 'topics', label: 'Topics', icon: 'layers-3' }, { id: 'flow', label: 'Request flow', icon: 'workflow' }, { id: 'scenarios', label: 'Scenarios', icon: 'route' }]
  element('#main-content').innerHTML = `${pageTop(sectionTitle(section), systemDesign ? 'Complete study guide' : 'Supporting knowledge')}
    <div class="view-content curriculum course-catalog ${flowView ? 'flow-mode' : ''} ${visualView ? 'visual-mode' : ''}"><header class="view-heading"><div><span class="eyebrow">${systemDesign ? 'THE SYSTEM DESIGN COURSE' : 'COMPUTING & ENGINEERING'}</span><h1>${sectionTitle(section)}</h1><div class="curriculum-meta" aria-label="Study guide overview"><span>${icon('book-open')}${topicCount} topics</span><span>${icon('network')}${diagramCount} diagrams</span><span>${icon('graduation-cap')}${systemDesign ? questions.length : questions.filter(question => sectionForChapter(question.chapter) === section).length} practice questions</span></div></div><div class="course-header-actions">${systemDesign ? `<a class="secondary-button" title="Course guide" href="${routeFor(referenceEntry('How to Read This Book').id, 'course-orientation-and-prerequisites')}">${icon('route')}Course guide</a>` : ''}</div></header>
    <div class="course-resume"><div><span>${completed} / ${entries.length} chapters completed</span><progress value="${completed}" max="${entries.length}" aria-label="${sectionLabels[section]} chapter progress"></progress></div><a href="${routeFor(resume.id)}" title="${escapeHtml(resume.title)}"><span>${icon('book-open')}Continue reading</span><strong>${escapeHtml(resume.title)}</strong>${icon('arrow-right')}</a></div>
    ${systemDesign && curriculumTab === 'topics' ? renderCourseStages() : ''}
    <div class="view-controls curriculum-controls">${systemDesign ? `<div class="segmented" role="tablist" aria-label="Study view">${tabs.map(tab => `<button type="button" role="tab" id="study-tab-${tab.id}" data-curriculum-tab="${tab.id}" aria-selected="${curriculumTab === tab.id}" aria-controls="curriculum-body" tabindex="${curriculumTab === tab.id ? 0 : -1}" class="${curriculumTab === tab.id ? 'active' : ''}">${icon(tab.icon)}${tab.label}</button>`).join('')}</div>` : '<span class="eyebrow">SUPPORTING TOPICS</span>'}${flowView || visualView ? '' : `<div class="library-search">${icon('search')}<input id="topic-search" type="search" placeholder="Find a topic or technique" aria-label="Find a study topic" value="${escapeHtml(topicFilter)}" /></div>`}</div>
    ${systemDesign && curriculumTab === 'topics' ? `<div class="topic-filters"><label class="topic-category-filter"><span class="sr-only">Category</span><select id="topic-category"><option value="">All categories${topicStage ? ' in this stage' : ''}</option>${availableGroups.map(group => `<option value="${group.id}" ${topicGroup === group.id ? 'selected' : ''}>${escapeHtml(group.title)}</option>`).join('')}</select></label><label class="core-topic-filter"><input type="checkbox" id="core-topics" ${coreTopicsOnly ? 'checked' : ''} />30 core concepts</label><button class="text-button clear-course-filters" type="button" data-action="clear-topic-search">${icon('rotate-ccw')}Reset filters</button></div>` : ''}
    <p id="curriculum-status" class="curriculum-status" role="status"></p><div id="curriculum-body" ${systemDesign ? `role="tabpanel" aria-labelledby="study-tab-${curriculumTab}"` : ''}></div></div>`
  renderCurriculumBody(section)
}

function renderCurriculumBody(section: StudySection) {
  disposeVisualLabs?.()
  disposeVisualLabs = undefined
  disposeRequestFlow?.()
  disposeRequestFlow = undefined
  const flowView = section === 'system-design' && curriculumTab === 'flow'
  const visualView = section === 'system-design' && curriculumTab === 'visuals'
  element('#curriculum-status').hidden = flowView || visualView
  if (visualView) {
    element('#curriculum-body').innerHTML = renderVisualLabs(book)
    disposeVisualLabs = mountVisualLabs(element('#curriculum-body'), book, enhanceIcons)
    return
  }
  if (flowView) {
    element('#curriculum-body').innerHTML = renderRequestFlow()
    disposeRequestFlow = mountRequestFlow(element('#curriculum-body'), book, enhanceIcons)
    return
  }
  const query = topicFilter.trim().toLowerCase()
  const matches = (topic: Topic, group = '') => !query || `${topic.title} ${topic.coverage} ${group}`.toLowerCase().includes(query)
  const scenarioView = section === 'system-design' && curriculumTab === 'scenarios'
  let count = 0
  if (scenarioView) {
    const selected = scenarios.filter(topic => matches(topic))
    count = selected.length
    element('#curriculum-body').innerHTML = `<div class="topic-grid scenario-list">${selected.map(renderTopic).join('')}</div>`
  } else {
    const groups = section === 'system-design' ? systemDesignGroups : otherTopicGroups
    const filtered = section === 'other-topics' ? groups.map(group => ({ ...group, topics: group.topics.filter(topic => matches(topic, group.title) || studyTopics.some(child => child.parentKey === numberedTopic(topic)?.key && matches(child, group.title))) })).filter(group => group.topics.length) : filterTopicGroups(groups, { query, coreOnly: coreTopicsOnly, groupId: groups.some(group => group.id === topicGroup) ? topicGroup : '', stageId: topicStage })
    const stage = section === 'system-design' ? courseStages.find(stage => stage.id === topicStage) : undefined
    element('#curriculum-body').innerHTML = `${stage ? `<div class="course-stage-summary"><span class="eyebrow">${stage.title.toUpperCase()}</span><p>${escapeHtml(stage.outcome)}</p><a href="#/roadmap">${icon('route')}View roadmap${icon('arrow-up-right')}</a></div>` : ''}` + filtered.map(group => {
      count += group.topics.length
      const categoryStage = courseStages.find(stage => stage.groups.includes(group.id))
      return `<section class="curriculum-group" id="${group.id}"><header><span class="topic-number">${section === 'system-design' ? String(groups.findIndex(item => item.id === group.id) + 1).padStart(2, '0') : icon('layers-3')}</span><div><div class="category-caption"><span>${categoryStage?.title ?? 'Supporting knowledge'}</span><span>${group.topics.length} topics</span></div><h2>${escapeHtml(group.title)}</h2><p>${escapeHtml(group.description)}</p></div></header><div class="topic-grid">${group.topics.map(topic => section === 'other-topics' ? `<div class="topic-family">${renderTopic(topic)}${renderSubtopicLinks(studyTopics.filter(child => child.parentKey === numberedTopic(topic)?.key && (!query || matches(topic, group.title) || matches(child, group.title))))}</div>` : renderTopic(topic)).join('')}</div></section>`
    }).join('')
  }
  element('#curriculum-status').textContent = `${count} ${scenarioView ? 'real-life scenarios' : section === 'system-design' && coreTopicsOnly ? 'core concepts' : 'topics'}${query ? ' found' : ''}`
  if (!count) element('#curriculum-body').innerHTML = `<div class="empty-state">${icon('search')}<h2>No matching ${scenarioView ? 'scenarios' : 'topics'}.</h2><button class="secondary-button" type="button" data-action="clear-topic-search">Clear filters</button></div>`
  enhanceIcons()
}

function render() {
  generation += 1
  interviewView?.destroy()
  interviewView = undefined
  studyTrackerView?.destroy()
  studyTrackerView = undefined
  disposeVisualLabs?.()
  disposeVisualLabs = undefined
  disposeRequestFlow?.()
  disposeRequestFlow = undefined
  disposeDiagrams(element('#main-content'))
  element<HTMLDialogElement>('#diagram-dialog').close()
  window.clearTimeout(scrollSave)
  suppressPositionSave = true
  navigation = readRoute(location.hash, state.lastChapter)
  currentEntry = book.entries.find(entry => entry.id === navigation.entryId) ?? book.entries.find(entry => entry.id === state.lastChapter) ?? firstChapter
  closeSidebar()
  if (navigation.view === 'system-design' || navigation.view === 'other-topics') renderCurriculum(navigation.view)
  if (navigation.view === 'read') { state.lastChapter = currentEntry.id; persist(); renderReader() }
  if (navigation.view === 'practice') renderPractice()
  if (navigation.view === 'interview') {
    element('#main-content').innerHTML = `${pageTop('Interview', 'Practical topic revision')}<div id="interview-root"></div>`
    interviewView = mountInterview(element('#interview-root'), book, {
      selected: () => state.interviewTopics,
      select: topics => { state.interviewTopics = topics; persist() },
      answers: () => state.interviewAnswers,
      answer: (id, answer) => { if (answer.selected === null && !answer.revealed) delete state.interviewAnswers[id]; else state.interviewAnswers[id] = answer; persist() },
      enhanceIcons,
    })
  }
  if (navigation.view === 'tracker') {
    element('#main-content').innerHTML = `${pageTop('Study Tracker', '8-week plan and report')}<div id="study-tracker-root"></div>`
    studyTrackerView = mountStudyTracker(element('#study-tracker-root'), book, {
      state: () => state.studyTracker,
      save: tracker => { state.studyTracker = tracker; persist() },
      enhanceIcons,
    })
  }
  if (navigation.view === 'roadmap') renderRoadmap()
  if (navigation.view === 'library') renderLibrary()
  const activeView = navigation.view === 'read' ? currentEntry.number === null ? 'library' : readingTopic()?.section ?? sectionForChapter(currentEntry.number) : navigation.view
  document.querySelectorAll<HTMLAnchorElement>('[data-view]').forEach(link => { link.classList.toggle('active', link.dataset.view === activeView); if (link.dataset.view === activeView) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current') })
  const viewTitle = navigation.view === 'system-design' || navigation.view === 'other-topics' ? sectionTitle(navigation.view) : `${navigation.view[0].toUpperCase()}${navigation.view.slice(1)}`
  document.title = navigation.view === 'read' ? `${currentEntry.title} | System Design Studio` : `${viewTitle} | System Design Studio`
  renderSidebar()
  applyPreferences()
  window.scrollTo({ top: 0, behavior: 'instant' })
  element('#main-content').scrollTop = 0
  if (navigation.view === 'read') {
    const currentGeneration = generation
    void renderDiagrams(element('#main-content'), currentGeneration).finally(() => {
      if (currentGeneration !== generation) return
      if (navigation.section && (!conciseReading || navigation.section.startsWith('lesson-'))) document.getElementById(navigation.section)?.scrollIntoView({ block: 'start' })
      else if (!conciseReading && (state.positions[currentEntry.id] ?? 0) > 0.03) restorePosition()
      requestAnimationFrame(() => { if (currentGeneration === generation) { suppressPositionSave = false; updateReadingProgress() } })
    })
  } else suppressPositionSave = false
  geminiChat.refreshReading()
  notebookWidget?.refresh()
}

function renderReader() {
  const entry = currentEntry
  const currentTopic = readingTopic()
  conciseReading = readingMode === 'concise' && Boolean(currentTopic)
  const section = currentTopic?.section ?? sectionForChapter(entry.number)
  const sectionChapters = book.chapters.filter(chapter => sectionForChapter(chapter.number) === section)
  const index = sectionChapters.findIndex(chapter => chapter.id === entry.id)
  const previous = index >= 0 ? sectionChapters[index - 1] : undefined
  const next = index >= 0 ? sectionChapters[index + 1] : undefined
  const done = state.completed.includes(entry.id)
  const saved = state.bookmarks.includes(entry.id)
  const brief = currentTopic && conciseReading ? conciseLessonHtml(book, currentTopic) : undefined
  const diagramCount = brief?.diagrams ?? entry.diagrams
  const diagramChip = diagramCount ? `<span>${icon('network')}${diagramCount} diagram${diagramCount > 1 ? 's' : ''}</span>` : ''
  const revisionHeadings = entry.headings.filter(heading => ['Key Points to Remember', 'Interview Catch'].includes(heading.title))
  const chapterTopics = studyTopics.filter(topic => topic.chapter === entry.number && topic.section === section)
  const topicSequence = studyTopics.filter(topic => topic.section === section)
  const currentTopicIndex = topicSequence.findIndex(topic => topic.key === currentTopic?.key)
  const neighborLink = (topic: NumberedTopic | undefined, direction: 'previous' | 'next') => {
    if (!topic) return ''
    const label = `${direction === 'previous' ? 'Previous' : 'Next'} topic: ${topic.title}`
    return `<a class="icon-button" href="${topicRoute(book, topic)}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${icon(direction === 'previous' ? 'arrow-left' : 'arrow-right')}</a>`
  }
  element('#main-content').innerHTML = `${pageTop(entry.number === null ? 'Library' : sectionTitle(section), chapterLabel(entry))}
    ${currentTopic ? `<nav class="reader-topic-nav" aria-label="Topic navigation"><a class="icon-button" href="#/${section}" title="Back to course topics" aria-label="Back to course topics">${icon('layers-3')}</a><div><span>${sectionTitle(section)} · Topic ${currentTopic.number}</span><strong>${escapeHtml(currentTopic.title)}</strong></div><div class="reader-topic-arrows">${neighborLink(topicSequence[currentTopicIndex - 1], 'previous')}${neighborLink(topicSequence[currentTopicIndex + 1], 'next')}</div></nav>` : ''}
    <div class="reader-layout"><div class="reading-column">
      <header class="chapter-header"><div class="chapter-kicker"><a href="${entry.number === null ? '#/library' : `#/${section}`}">${icon('arrow-left')}${entry.number === null ? 'Reference library' : sectionTitle(section)}</a><span class="chapter-part">${entry.number === null ? 'REFERENCE' : chapterLabel(entry).toUpperCase()}</span></div>
      <h1>${conciseReading && currentTopic ? `<span class="title-number">${currentTopic.number}</span> ${escapeHtml(currentTopic.title)}` : escapeHtml(entry.title)}</h1><div class="chapter-meta"><span>${icon('clock-3')}${brief ? Math.max(1, Math.ceil(brief.words / 200)) : entry.minutes} min read</span><span>${icon('file-text')}${(brief?.words ?? entry.words).toLocaleString()} words</span>${diagramChip}</div>
      ${currentTopic ? `<div class="segmented reading-modes" role="group" aria-label="Reading format"><button type="button" data-reading-mode="concise" class="${conciseReading ? 'active' : ''}" aria-pressed="${conciseReading}">${icon('list-ordered')}Lesson</button><button type="button" data-reading-mode="reference" class="${!conciseReading ? 'active' : ''}" aria-pressed="${!conciseReading}">${icon('book-open')}Full reference</button></div>` : ''}
      <div class="chapter-actions"><button class="complete-button ${done ? 'is-complete' : ''}" type="button" data-action="complete" aria-pressed="${done}">${icon(done ? 'circle-check' : 'check')}<span>${done ? 'Completed' : 'Mark chapter complete'}</span></button><div class="reading-tools">${button('bookmark', 'bookmark', saved ? 'Remove bookmark' : 'Bookmark chapter', `aria-pressed="${saved}"`)}${button('notebook-pen', 'notes', 'Open chapter notes')}${button('minus', 'font-down', 'Decrease reading size')}${button('plus', 'font-up', 'Increase reading size')}</div></div>
      ${revisionHeadings.length && !conciseReading ? `<nav class="chapter-revision-links" aria-label="Chapter revision">${revisionHeadings.map(heading => `<a href="${routeFor(entry.id, heading.id)}" class="${heading.title === 'Interview Catch' ? 'interview-link' : ''}">${icon(heading.title === 'Interview Catch' ? 'target' : 'check-check')}<span>${heading.title === 'Interview Catch' ? 'Interview catch' : 'Key points to remember'}</span>${icon('arrow-right')}</a>`).join('')}</nav>` : ''}
      ${chapterTopics.length ? `<details class="chapter-topic-index"><summary><span>Topics in this chapter <small>${chapterTopics.length}</small></span>${icon('chevron-down')}</summary><nav aria-label="Topics in this chapter">${chapterTopics.map(topic => `<a href="${topicRoute(book, topic)}">${icon('chevron-right')}<span>${topic.number} ${escapeHtml(topic.title)}</span></a>`).join('')}</nav></details>` : ''}
      </header>
      <article class="prose ${conciseReading ? 'concise-prose' : ''}" id="chapter-content">${DOMPurify.sanitize(brief?.html ?? renderEntry(entry), { ADD_ATTR: ['target'] })}${conciseReading && currentTopic && !currentTopic.parentKey && currentTopic.section === 'other-topics' ? renderSubtopicLinks(studyTopics.filter(topic => topic.parentKey === currentTopic.key)) : ''}</article>
      <footer class="chapter-footer"><div class="chapter-finish"><span>${icon('circle-check')}End of ${entry.number ? chapterLabel(entry).toLowerCase() : 'section'}</span><button class="primary-button" type="button" data-action="complete">${icon(done ? 'check-check' : 'check')}${done ? 'Completed' : 'Mark complete'}</button></div>${entry.number ? `<a class="chapter-review" href="#/practice" data-review="${entry.number}"><span>${icon('graduation-cap')}Review this chapter</span>${icon('arrow-right')}</a>` : ''}<div class="chapter-pagination">${previous ? `<a href="${routeFor(previous.id)}"><span>${icon('arrow-left')}Previous chapter</span><strong>${escapeHtml(previous.title)}</strong></a>` : '<span></span>'}${next ? `<a class="next-chapter" href="${routeFor(next.id)}"><span>Next chapter${icon('arrow-right')}</span><strong>${escapeHtml(next.title)}</strong></a>` : `<a class="next-chapter" href="#/practice"><span>Keep learning${icon('arrow-right')}</span><strong>Practice & review</strong></a>`}</div></footer>
    </div><aside class="reader-rail" aria-label="Chapter tools"><div class="rail-sticky"><div class="rail-tabs" role="tablist" aria-label="Chapter tools"><button type="button" role="tab" data-rail="outline" aria-selected="${activeTab === 'outline'}" class="${activeTab === 'outline' ? 'active' : ''}">On this page</button><button type="button" role="tab" data-rail="notes" aria-selected="${activeTab === 'notes'}" class="${activeTab === 'notes' ? 'active' : ''}">Notes${state.notes[entry.id] ? '<span class="note-dot"></span>' : ''}</button></div><div id="rail-content"></div></div></aside></div>
    <div class="reading-progress" aria-hidden="true"><span id="reading-progress-fill"></span></div>`
  if (!conciseReading) {
    for (const heading of referenceHeadings(book, entry)) {
      const node = document.getElementById(heading.id)
      node?.insertAdjacentHTML('afterbegin', `<span class="heading-number">${heading.number}</span> `)
    }
  }
  readerHeadings = [...element('#chapter-content').querySelectorAll<HTMLElement>('h3[id], h4[id], h5[id], h6[id]')].map(heading => ({ id: heading.id, title: heading.textContent?.replace(heading.querySelector('.heading-number')?.textContent ?? '', '').trim() ?? '', depth: Number(heading.tagName.slice(1)), number: heading.querySelector('.heading-number')?.textContent ?? '' }))
  renderRail()
  rewriteBookLinks(element('#chapter-content'))
  enhanceLessonContent(element('#chapter-content'))
  for (const lab of visualLabs.filter(lab => lab.topic.chapter === entry.number)) {
    const heading = entry.headings.find(heading => heading.title === lab.topic.heading)
    if (heading && !conciseReading) document.getElementById(heading.id)?.insertAdjacentHTML('afterend', renderVisualLab(lab, book))
    if (heading && conciseReading && currentTopic?.heading === lab.topic.heading) element('.concise-lesson').insertAdjacentHTML('beforeend', renderVisualLab(lab, book))
  }
  disposeVisualLabs = mountVisualLabs(element('#chapter-content'), book, enhanceIcons)
}

function enhanceLessonContent(root: HTMLElement) {
  for (const paragraph of root.querySelectorAll<HTMLParagraphElement>('p')) {
    const lead = paragraph.firstElementChild
    if (lead?.tagName !== 'STRONG') continue
    const label = lead.textContent?.trim() ?? ''
    if (label.startsWith('Worked example:')) paragraph.classList.add('lesson-example')
    if (label === 'Practice check:') paragraph.classList.add('lesson-question')
    if (label === 'Answer:' && paragraph.previousElementSibling?.classList.contains('lesson-question')) {
      const answer = document.createElement('details')
      answer.className = 'lesson-answer'
      const summary = document.createElement('summary')
      summary.innerHTML = `Compare your answer${icon('chevron-down')}`
      paragraph.before(answer)
      lead.remove()
      answer.append(summary, paragraph)
    }
  }
}

function renderRail() {
  const target = document.querySelector('#rail-content')
  if (!target) return
  document.querySelectorAll<HTMLElement>('[data-rail]').forEach(tab => { tab.classList.toggle('active', tab.dataset.rail === activeTab); tab.setAttribute('aria-selected', String(tab.dataset.rail === activeTab)) })
  if (activeTab === 'notes') {
    target.innerHTML = `<label class="note-label" for="chapter-note">${chapterLabel(currentEntry)} notes</label><textarea id="chapter-note" maxlength="20000" placeholder="Your notes, questions, and examples..."></textarea><div class="note-status"><span id="note-saved">${state.notes[currentEntry.id] ? 'Saved here' : 'No notes yet'}</span><span id="note-count">${(state.notes[currentEntry.id] ?? '').length.toLocaleString()} / 20,000</span></div>`
    element<HTMLTextAreaElement>('#chapter-note').value = state.notes[currentEntry.id] ?? ''
  } else {
    const topic = readingTopic()
    target.innerHTML = `<nav class="page-outline" aria-label="On this page">${readerHeadings.map(heading => `<a href="${conciseReading && topic ? topicRoute(book, topic, heading.id) : routeFor(currentEntry.id, heading.id)}" data-section="${heading.id}" class="${heading.depth > 3 ? 'outline-subtopic' : ''}"><span>${heading.number}</span> ${escapeHtml(heading.title)}</a>`).join('')}</nav><div class="rail-progress"><span>${conciseReading ? 'Topic' : 'Chapter'} progress</span><div><strong id="reading-percent">0%</strong><span>read</span></div><progress id="reading-progress" max="100" value="0" aria-label="Reading progress"></progress></div><a class="rail-practice" href="#/practice" ${currentEntry.number ? `data-review="${currentEntry.number}"` : ''}>${icon('target')}<span>Review this chapter</span>${icon('arrow-right')}</a>`
  }
  enhanceIcons()
}

function rewriteBookLinks(root: HTMLElement) {
  root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(link => {
    const anchor = book.anchors.get(link.getAttribute('href')!.slice(1))
    if (anchor) link.href = routeFor(anchor.entryId, anchor.headingId)
  })
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    if (node.parentElement?.closest('pre, code, svg, .katex, a[target="_blank"]')) continue
    node.textContent = formatChapterReferences(book, node.textContent ?? '')
  }
}

function updateReadingProgress() {
  if (navigation.view !== 'read') return
  const article = document.querySelector<HTMLElement>('#chapter-content')
  if (!article) return
  const pane = conciseReading && mobileLayout.matches ? element('#main-content') : undefined
  const scrollPosition = pane?.scrollTop ?? window.scrollY
  const viewportTop = pane?.getBoundingClientRect().top ?? 0
  const top = article.getBoundingClientRect().top - viewportTop + scrollPosition
  const range = Math.max(1, article.offsetHeight - (pane?.clientHeight ?? window.innerHeight) * 0.6)
  const ratio = Math.max(0, Math.min(1, (scrollPosition - top + 150) / range))
  const percent = Math.round(ratio * 100)
  const fill = document.querySelector<HTMLElement>('#reading-progress-fill')
  if (fill) fill.style.width = `${percent}%`
  const label = document.querySelector('#reading-percent')
  if (label) label.textContent = `${percent}%`
  const progress = document.querySelector<HTMLProgressElement>('#reading-progress')
  if (progress) progress.value = percent
  const headings = [...article.querySelectorAll<HTMLElement>('h3, h4')]
  let active = headings[0]?.id
  const activeOffset = pane ? viewportTop + (document.querySelector<HTMLElement>('.reader-topic-nav')?.offsetHeight ?? 0) + 30 : 180
  for (const heading of headings) if (heading.getBoundingClientRect().top <= activeOffset) active = heading.id
  document.querySelectorAll<HTMLElement>('[data-section]').forEach(link => link.classList.toggle('active', link.dataset.section === active))
  if (!suppressPositionSave && !conciseReading) {
    window.clearTimeout(scrollSave)
    const id = currentEntry.id
    scrollSave = window.setTimeout(() => { state.positions[id] = ratio; persist() }, 250)
  }
}

function restorePosition() {
  const article = document.querySelector<HTMLElement>('#chapter-content')
  if (!article) return
  const ratio = state.positions[currentEntry.id] ?? 0
  window.scrollTo({ top: article.getBoundingClientRect().top + window.scrollY - 150 + ratio * Math.max(1, article.offsetHeight - window.innerHeight * 0.6), behavior: 'instant' })
}

async function renderDiagrams(root: HTMLElement, expectedGeneration: number) {
  const figures = [...root.querySelectorAll<HTMLElement>('[data-diagram]')]
  if (!figures.length) return
  const run = ++diagramRun
  try {
    mermaidLoader ??= import('mermaid').then(module => module.default)
    const mermaid = await mermaidLoader
    if (run !== diagramRun || expectedGeneration !== generation) return
    const theme = getComputedStyle(document.documentElement)
    const themeColor = (token: string) => theme.getPropertyValue(token).trim()
    mermaid.initialize({
      startOnLoad: false, securityLevel: 'strict', htmlLabels: false, theme: 'base', fontFamily: 'Manrope Variable, sans-serif',
      themeVariables: {
        primaryColor: themeColor('--diagram-primary'), primaryTextColor: themeColor('--text'), primaryBorderColor: themeColor('--accent'),
        lineColor: themeColor('--muted'), secondaryColor: themeColor('--diagram-secondary'), tertiaryColor: themeColor('--diagram-tertiary'),
        background: themeColor('--surface'), mainBkg: themeColor('--diagram-primary'), nodeBorder: themeColor('--accent'),
        actorBkg: themeColor('--diagram-primary'), actorTextColor: themeColor('--text'), signalColor: themeColor('--muted'),
        labelTextColor: themeColor('--text'), fontSize: '16px',
        clusterBkg: themeColor('--subtle'), clusterBorder: themeColor('--line'),
        edgeLabelBackground: themeColor('--surface'), tertiaryTextColor: themeColor('--text'),
      },
      flowchart: { htmlLabels: false, useMaxWidth: true, curve: 'basis', nodeSpacing: 35, rankSpacing: 45, padding: 18 }, sequence: { useMaxWidth: true },
    })
    for (const figure of figures) {
      if (run !== diagramRun || expectedGeneration !== generation || !figure.isConnected) return
      const stage = figure.querySelector<HTMLElement>('.diagram-stage')!
      const source = figure.querySelector<HTMLElement>('.diagram-source')!.textContent ?? ''
      try {
        const result = await mermaid.render(`architecture-${++diagramSequence}`, source)
        if (run !== diagramRun || expectedGeneration !== generation || !figure.isConnected) return
        disposeDiagrams(figure)
        stage.innerHTML = DOMPurify.sanitize(result.svg, { USE_PROFILES: { svg: true, svgFilters: true }, ADD_TAGS: ['style'] })
        const svg = stage.querySelector('svg')
        if (svg) {
          let heading = figure.previousElementSibling
          while (heading && !heading.matches('h3, h4')) heading = heading.previousElementSibling
          const title = heading?.textContent?.trim() || currentEntry.title
          figure.querySelector<HTMLElement>('[data-diagram-title]')!.textContent = title
          svg.setAttribute('role', 'img')
          svg.setAttribute('aria-label', `${title} diagram`)
          mountDiagram(figure, svg, title)
        }
        figure.dataset.rendered = 'true'
      } catch {
        disposeDiagrams(figure)
        stage.setAttribute('aria-busy', 'false')
        stage.innerHTML = '<p class="diagram-error">The diagram could not be displayed. Its code is shown below.</p>'
        figure.querySelector<HTMLElement>('.diagram-source')!.hidden = false
      }
    }
  } catch {
    for (const figure of figures) {
      if (!figure.isConnected) continue
      disposeDiagrams(figure)
      figure.querySelector<HTMLElement>('.diagram-stage')!.setAttribute('aria-busy', 'false')
      figure.querySelector<HTMLElement>('.diagram-stage')!.innerHTML = '<p class="diagram-error">The diagram could not be loaded. Its code is shown below.</p>'
      figure.querySelector<HTMLElement>('.diagram-source')!.hidden = false
    }
  }
}

function filteredQuestions(): Question[] {
  return questions.filter(question => {
    const entry = book.chapters[question.chapter - 1]
    const group = systemDesignGroups.find(item => item.id === practiceScope)
    const scope = practiceScope === 'all' || sectionForChapter(entry.number) === practiceScope || practiceScope === `chapter-${question.chapter}` || Boolean(group?.topics.some(topic => topic.chapter === question.chapter))
    const answered = state.answers[question.id]
    return scope && (practiceFilter === 'all' || (practiceFilter === 'unanswered' ? answered === undefined : answered !== undefined && answered !== question.correct))
  })
}

function renderPractice() {
  const pool = filteredQuestions()
  questionIndex = Math.min(Math.max(0, questionIndex), Math.max(0, pool.length - 1))
  const question = pool[questionIndex]
  const answered = Object.keys(state.answers).length
  const correct = questions.filter(item => state.answers[item.id] === item.correct).length
  const selectedChapter = book.chapters.find(entry => practiceScope === `chapter-${entry.number}`)
  element('#main-content').innerHTML = `${pageTop('Practice', 'Questions & flashcards')}<div class="view-content"><header class="view-heading"><div><span class="eyebrow">REVIEW & UNDERSTAND</span><h1>Practice your understanding.</h1></div><div class="practice-summary"><strong>${correct}<span> / ${answered}</span></strong><span>correct answers</span></div></header>
    <div class="view-controls"><div class="segmented"><button type="button" data-practice-mode="questions" class="${practiceMode === 'questions' ? 'active' : ''}" aria-pressed="${practiceMode === 'questions'}">${icon('target')}Scenario questions</button><button type="button" data-practice-mode="cards" class="${practiceMode === 'cards' ? 'active' : ''}" aria-pressed="${practiceMode === 'cards'}">${icon('layers-3')}Flashcards</button></div><div class="selects"><label><span class="sr-only">Practice topic</span><select id="practice-scope"><option value="all">All chapters</option><option value="system-design">System Design</option><option value="other-topics">Other Topics</option>${systemDesignGroups.map(group => `<option value="${group.id}">${escapeHtml(group.title)}</option>`).join('')}${selectedChapter ? `<option value="${practiceScope}">${sectionLabels[sectionForChapter(selectedChapter.number)]} / ${chapterLabel(selectedChapter)}</option>` : ''}</select></label>${practiceMode === 'questions' ? '<label><span class="sr-only">Question status</span><select id="practice-filter"><option value="all">All questions</option><option value="unanswered">Unanswered</option><option value="retry">Try again</option></select></label>' : ''}</div></div>
    <div id="practice-body">${question ? practiceMode === 'questions' ? renderQuestion(question, pool.length) : renderCard(question, pool.length) : `<div class="empty-state">${icon('circle-check')}<h2>${practiceFilter === 'retry' ? 'No incorrect answers in this set.' : 'You have answered every question in this set.'}</h2><button class="secondary-button" type="button" data-action="all-questions">Show all questions</button></div>`}</div>
    <div class="practice-footer"><span>${icon('book-open')}${questions.length} questions across ${book.chapters.length} chapters</span><button class="text-button" type="button" data-action="restart-practice">${icon('rotate-ccw')}Clear review answers</button></div></div>`
  element<HTMLSelectElement>('#practice-scope').value = practiceScope
  const filter = document.querySelector<HTMLSelectElement>('#practice-filter')
  if (filter) filter.value = practiceFilter
  enhanceIcons()
}

function renderQuestion(question: Question, total: number) {
  const entry = book.chapters[question.chapter - 1]
  const answer = state.answers[question.id]
  const hasAnswer = answer !== undefined
  return `<section class="question-panel" aria-labelledby="question-title"><div class="question-top"><a href="${routeFor(entry.id)}">${chapterLabel(entry)}<span>${escapeHtml(entry.title)}</span>${icon('arrow-right')}</a><span>${questionIndex + 1} / ${total}</span></div><h2 id="question-title">${escapeHtml(question.prompt)}</h2><fieldset class="answer-options" ${hasAnswer ? 'disabled' : ''}><legend class="sr-only">Choose an answer</legend>${question.options.map((option, index) => `<label class="answer-option ${hasAnswer && index === question.correct ? 'correct' : ''} ${hasAnswer && index === answer && answer !== question.correct ? 'incorrect' : ''}"><input type="radio" name="answer" value="${index}" ${index === (answer ?? pendingAnswer) ? 'checked' : ''} /><span class="answer-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span>${hasAnswer && index === question.correct ? icon('check') : ''}</label>`).join('')}</fieldset>${hasAnswer ? `<div class="answer-feedback ${answer === question.correct ? 'success' : 'revisit'}" role="status"><strong>${icon(answer === question.correct ? 'circle-check' : 'rotate-ccw')}${answer === question.correct ? 'Correct. Here is why.' : 'Not quite. Here is why.'}</strong><p>${escapeHtml(question.explanation)}</p><a href="${routeFor(entry.id)}">Read the chapter${icon('arrow-right')}</a></div>` : ''}<div class="question-actions"><button class="secondary-button" data-action="previous-question" type="button" ${questionIndex === 0 ? 'disabled' : ''}>${icon('arrow-left')}Previous</button>${hasAnswer ? `<div class="question-next"><button class="text-button" data-action="retry-question" type="button">${icon('rotate-ccw')}Try again</button><button class="primary-button" data-action="next-question" type="button">${questionIndex === total - 1 ? 'Back to first question' : 'Next question'}${icon('arrow-right')}</button></div>` : `<button class="primary-button" id="check-answer" data-action="check-answer" type="button" ${pendingAnswer === undefined ? 'disabled' : ''}>Check answer${icon('check')}</button>`}</div></section>`
}

function renderCard(question: Question, total: number) {
  const entry = book.chapters[question.chapter - 1]
  const known = state.knownCards.includes(question.cardId ?? entry.id)
  return `<section class="flashcard-panel"><div class="question-top"><a href="${routeFor(entry.id)}">${chapterLabel(entry)}<span>${escapeHtml(entry.title)}</span></a><span>${questionIndex + 1} / ${total}</span></div><div class="flashcard"><span class="eyebrow">${cardRevealed ? 'THE EXPLANATION' : 'WHAT DOES THIS MEAN?'}</span><h2>${escapeHtml(question.term)}</h2>${cardRevealed ? `<p>${escapeHtml(question.definition)}</p>` : `<div class="card-symbol">${icon('layers-3')}</div><button class="secondary-button" type="button" data-action="reveal-card">Show the explanation${icon('chevron-down')}</button>`}</div><div class="question-actions"><button class="secondary-button" data-action="previous-question" type="button" ${questionIndex === 0 ? 'disabled' : ''}>${icon('arrow-left')}Previous</button>${cardRevealed ? `<button class="${known ? 'secondary-button' : 'primary-button'}" type="button" data-action="know-card">${icon(known ? 'check-check' : 'check')}${known ? 'Understood - next card' : 'Mark as understood'}</button>` : `<button class="text-button" type="button" data-action="next-question">Next${icon('arrow-right')}</button>`}</div><span class="card-known">${state.knownCards.length} / ${questions.length} concepts marked as understood</span></section>`
}

function renderRoadmap() {
  const sectionEntries = book.chapters.filter(entry => sectionForChapter(entry.number) === roadmapSection)
  const completedTotal = sectionEntries.filter(entry => state.completed.includes(entry.id)).length
  const groups = roadmapSection === 'system-design' ? courseStages.map(stage => ({ ...stage, description: stage.outcome, topics: stage.groups.flatMap(id => systemDesignGroups.find(group => group.id === id)?.topics ?? []) })) : otherTopicGroups.map(group => ({ ...group, groups: [group.id], prerequisite: 'Basic programming and curiosity about how applications work.' }))
  element('#main-content').innerHTML = `${pageTop('Roadmap', sectionTitle(roadmapSection))}<div class="view-content course-roadmap"><header class="view-heading"><div><span class="eyebrow">YOUR LEARNING PATH</span><h1>Study roadmap</h1></div><div class="roadmap-total"><strong>${completedTotal}<span>/${sectionEntries.length}</span></strong><span>chapters completed</span></div></header><div class="view-controls"><div class="segmented" aria-label="Roadmap section"><button type="button" data-roadmap-section="system-design" aria-pressed="${roadmapSection === 'system-design'}" class="${roadmapSection === 'system-design' ? 'active' : ''}">System Design</button><button type="button" data-roadmap-section="other-topics" aria-pressed="${roadmapSection === 'other-topics'}" class="${roadmapSection === 'other-topics' ? 'active' : ''}">${sectionTitle('other-topics')}</button></div><a class="text-button" href="${routeFor(book.chapters[31].id, book.chapters[31].headings.find(heading => heading.title === 'A twelve-week learning sequence')?.id)}">${icon('route')}Twelve-week reading plan</a></div><div class="week-list">${groups.map((group, index) => {
    const entries = [...new Set(group.topics.map(topic => topic.chapter))].map(number => book.chapters[number - 1])
    const completed = entries.filter(entry => state.completed.includes(entry.id)).length
    const done = completed === entries.length
    const categories = (roadmapSection === 'system-design' ? systemDesignGroups : otherTopicGroups).filter(category => group.groups.includes(category.id))
    return `<section class="week-row ${done ? 'week-complete' : ''}"><div class="week-marker"><span>${done ? icon('check') : String(index + 1).padStart(2, '0')}</span><i></i></div><div class="week-content"><div class="week-title"><span class="eyebrow">STAGE ${String(index + 1).padStart(2, '0')}</span><span>${completed} / ${entries.length} chapters completed</span></div><h2>${escapeHtml(group.title)}</h2><p>${escapeHtml(group.description)}</p><p class="stage-prerequisite"><strong>Before this stage</strong>${escapeHtml(group.prerequisite)}</p><div class="roadmap-categories">${categories.map(category => `<a href="#/${roadmapSection}" data-course-category="${category.id}"><span>${escapeHtml(category.title)}</span><small>${category.topics.length} topics</small>${icon('arrow-up-right')}</a>`).join('')}</div><details class="stage-reading"><summary>Chapter reading${icon('chevron-down')}</summary><div class="week-chapters">${entries.map(entry => `<a href="${routeFor(entry.id)}" class="${state.completed.includes(entry.id) ? 'done' : ''}">${state.completed.includes(entry.id) ? icon('circle-check') : `<span>${chapterNumber(entry)}</span>`}${escapeHtml(entry.title)}${icon('arrow-right')}</a>`).join('')}</div></details></div></section>`
  }).join('')}</div><a class="roadmap-source" href="https://roadmap.sh/system-design" target="_blank" rel="noopener noreferrer">${icon('route')}System Design Roadmap on roadmap.sh${icon('external-link')}</a></div>`
  enhanceIcons()
}

function renderLibrary() {
  element('#main-content').innerHTML = `${pageTop('Library', 'Sources & saved reading')}<div class="view-content"><header class="view-heading"><div><span class="eyebrow">YOUR READING MATERIAL</span><h1>Your study library.</h1></div><a class="secondary-button" href="${routeFor(referenceEntry('Preface').id)}">${icon('book-open')}About the handbook</a></header><div class="view-controls library-controls"><div class="segmented"><button type="button" data-library-tab="videos" class="${libraryTab === 'videos' ? 'active' : ''}">Videos <span>103</span></button><button type="button" data-library-tab="references" class="${libraryTab === 'references' ? 'active' : ''}">References</button><button type="button" data-library-tab="saved" class="${libraryTab === 'saved' ? 'active' : ''}">Saved <span>${state.bookmarks.length}</span></button><button type="button" data-library-tab="notes" class="${libraryTab === 'notes' ? 'active' : ''}">Notes <span>${Object.values(state.notes).filter(Boolean).length}</span></button></div>${libraryTab === 'videos' ? `<div class="library-search">${icon('search')}<input id="video-search" type="search" placeholder="Search video topics" aria-label="Search video topics" value="${escapeHtml(libraryFilter)}" /></div>` : ''}</div><div id="library-body"></div></div>`
  renderLibraryBody()
  enhanceIcons()
}

function renderLibraryBody() {
  const target = element('#library-body')
  if (libraryTab === 'videos') {
    const videos = book.videos.filter(video => `${video.title} ${video.coverage}`.toLowerCase().includes(libraryFilter.toLowerCase()))
    target.innerHTML = `<div class="library-caption"><span>${videos.length} ${videos.length === 1 ? 'video' : 'videos'}</span><a href="https://www.youtube.com/playlist?list=PLCRMIe5FDPsd0gVs500xeOewfySTsmEjf" target="_blank" rel="noopener noreferrer">System Design Fundamentals${icon('external-link')}</a></div><div class="video-list">${videos.length ? videos.map(video => `<a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer" class="video-row"><span class="video-number">${String(video.number).padStart(2, '0')}</span><div><h2>${escapeHtml(video.title)}</h2><p>${escapeHtml(formatChapterReferences(book, video.coverage))}</p></div>${icon('external-link')}</a>`).join('') : '<div class="empty-state"><h2>No matching videos.</h2></div>'}</div><div class="source-note">Video titles checked on September 8, 2026. The topic map does not mean every video or transcript was reviewed. <a href="${routeFor(referenceEntry('Source and Topic Coverage').id)}">Sources and topic coverage${icon('arrow-right')}</a></div>`
  } else if (libraryTab === 'references') {
    const references = ['System Design: The Complete Topic Map', 'Other Topics: Supporting Computing and Engineering', 'Source and Topic Coverage', 'Reference Shelf', 'Glossary for Revision', 'How to Read This Book', 'Preface']
    target.innerHTML = `<div class="reference-list">${references.map(title => { const entry = referenceEntry(title); return `<a href="${routeFor(entry.id)}">${icon(title.includes('Glossary') ? 'book-marked' : 'file-text')}<div><h2>${escapeHtml(title)}</h2><p>${entry.words.toLocaleString()} words <span>/</span> ${entry.minutes} min read</p></div>${icon('arrow-right')}</a>` }).join('')}</div><a class="external-reference" href="https://roadmap.sh/system-design" target="_blank" rel="noopener noreferrer">${icon('route')}roadmap.sh / System Design${icon('external-link')}</a>`
  } else {
    const entries = book.entries.filter(entry => libraryTab === 'saved' ? state.bookmarks.includes(entry.id) : Boolean(state.notes[entry.id]))
    target.innerHTML = entries.length ? `<div class="saved-list">${entries.map(entry => `<a href="${routeFor(entry.id)}" ${libraryTab === 'notes' ? 'data-open-notes="true"' : ''}><span class="saved-icon">${icon(libraryTab === 'saved' ? 'bookmark' : 'notebook-pen')}</span><div><span class="eyebrow">${chapterLabel(entry)}</span><h2>${escapeHtml(entry.title)}</h2>${libraryTab === 'notes' ? `<p class="note-preview">${escapeHtml(state.notes[entry.id].slice(0, 240))}</p>` : `<p>${entry.minutes} min read</p>`}</div>${icon('arrow-right')}</a>`).join('')}</div>` : `<div class="empty-state">${icon(libraryTab === 'saved' ? 'bookmark' : 'notebook-pen')}<h2>${libraryTab === 'saved' ? 'No saved chapters yet.' : 'Your notebook is empty.'}</h2><a class="secondary-button" href="${routeFor(state.lastChapter)}">Return to reading${icon('arrow-right')}</a></div>`
  }
  enhanceIcons()
}

function openDialog(id: string) {
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(dialog => dialog.close())
  element<HTMLDialogElement>(id).showModal()
}

function searchSnippet(result: SearchRecord, query: string) {
  const text = result.text
  const term = query.toLowerCase().split(/\s+/).find(Boolean) ?? ''
  const position = Math.max(0, text.toLowerCase().indexOf(term) - 65)
  return escapeHtml(`${position ? '... ' : ''}${text.slice(position, position + 190)}${text.length > position + 190 ? ' ...' : ''}`)
}

function renderSearch() {
  const query = element<HTMLInputElement>('#global-search').value.trim()
  searchResults = query ? searchIndex.search(query, { limit: 24 }).map(result => result.item) : book.chapters.slice(0, 6).map(entry => ({ id: entry.id, entryId: entry.id, title: entry.title, chapter: chapterLabel(entry), text: entry.text }))
  if (query) searchResults = [...topicSearchRecords.filter(result => result.title.toLowerCase() === query.toLowerCase()), ...searchResults]
  searchResults = searchResults.filter((result, index, results) => results.findIndex(candidate => candidate.id === result.id) === index)
  activeSearch = 0
  element('#search-summary').textContent = query ? `${searchResults.length}${searchResults.length === 24 ? '+' : ''} matches in the complete handbook` : 'Start with the foundations'
  element('#search-results').innerHTML = searchResults.length ? searchResults.map((result, index) => {
    const topic = studyTopics.find(topic => topic.key === result.topicKey)
    return `<a class="search-result ${index === 0 ? 'active' : ''}" href="${topic ? topicRoute(book, topic) : routeFor(result.entryId, result.id === result.entryId ? undefined : result.id)}" data-search-index="${index}"><span class="search-result-icon">${icon('file-text')}</span><div><span>${escapeHtml(result.chapter)}</span><h3>${topic ? `${topic.number} ` : ''}${escapeHtml(result.title)}</h3><p>${searchSnippet(result, query)}</p></div>${icon('arrow-right')}</a>`
  }).join('') : `<div class="empty-state">${icon('search')}<h2>No matching topics.</h2><p>Try a more general term, such as caching, retries, or consistency.</p></div>`
  enhanceIcons()
}

function showSettings() {
  element('#settings-stats').innerHTML = `<span><strong>${completedCount()}</strong>completed</span><span><strong>${state.bookmarks.length}</strong>saved</span><span><strong>${Object.values(state.notes).filter(Boolean).length + state.notebook.length}</strong>notes</span>`
  applyPreferences()
  openDialog('#settings-dialog')
}

function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

element<HTMLDialogElement>('#diagram-dialog').addEventListener('close', () => {
  disposeDiagrams(element('#diagram-dialog'))
  element('#expanded-diagram').replaceChildren()
})

document.addEventListener('click', event => {
  const target = event.target as Element
  const anchor = target.closest<HTMLAnchorElement>('a')
  if (anchor?.dataset.courseCategory) { topicGroup = anchor.dataset.courseCategory; topicStage = ''; topicFilter = ''; coreTopicsOnly = false; curriculumTab = 'topics' }
  if (anchor?.dataset.review) { practiceScope = `chapter-${anchor.dataset.review}`; practiceFilter = 'all'; practiceMode = 'questions'; questionIndex = 0; pendingAnswer = undefined }
  if (anchor?.dataset.openNotes) activeTab = 'notes'
  if (anchor?.dataset.searchIndex !== undefined) element<HTMLDialogElement>('#search-dialog').close()
  if (anchor?.hash === '#main-content') { event.preventDefault(); element('#main-content').focus(); return }
  if (anchor?.getAttribute('href')?.startsWith('#/')) {
    if (anchor.getAttribute('href') === location.hash) { event.preventDefault(); render() }
    closeSidebar()
  }
  const scope = target.closest<HTMLButtonElement>('[data-scope]')
  if (scope) { chapterScope = scope.dataset.scope!; renderSidebar(); return }
  const sidebarControl = target.closest<HTMLButtonElement>('[data-sidebar-view]')
  if (sidebarControl) { sidebarView = sidebarControl.dataset.sidebarView as typeof sidebarView; renderSidebar(); return }
  const readingControl = target.closest<HTMLButtonElement>('[data-reading-mode]')
  if (readingControl) { readingMode = readingControl.dataset.readingMode as typeof readingMode; render(); element<HTMLButtonElement>(`[data-reading-mode="${readingMode}"]`)?.focus({ preventScroll: true }); return }
  const curriculumControl = target.closest<HTMLButtonElement>('[data-curriculum-tab]')
  if (curriculumControl) { curriculumTab = curriculumControl.dataset.curriculumTab as typeof curriculumTab; renderCurriculum('system-design'); element<HTMLButtonElement>(`[data-curriculum-tab="${curriculumTab}"]`).focus(); return }
  const stageControl = target.closest<HTMLButtonElement>('[data-course-stage]')
  if (stageControl) { topicStage = stageControl.dataset.courseStage ?? ''; topicGroup = ''; renderCurriculum('system-design'); element<HTMLButtonElement>(`[data-course-stage="${topicStage}"]`).focus({ preventScroll: true }); return }
  const roadmapControl = target.closest<HTMLButtonElement>('[data-roadmap-section]')
  if (roadmapControl) { roadmapSection = roadmapControl.dataset.roadmapSection as StudySection; renderRoadmap(); return }
  const rail = target.closest<HTMLButtonElement>('[data-rail]')
  if (rail) { activeTab = rail.dataset.rail as typeof activeTab; renderRail(); updateReadingProgress(); return }
  const theme = target.closest<HTMLButtonElement>('button[data-theme]')
  if (theme) { state.theme = theme.dataset.theme as typeof state.theme; persist(); applyPreferences(); void renderDiagrams(element('#main-content'), generation); return }
  const mode = target.closest<HTMLButtonElement>('[data-practice-mode]')
  if (mode) { practiceMode = mode.dataset.practiceMode as typeof practiceMode; practiceFilter = 'all'; questionIndex = 0; cardRevealed = false; pendingAnswer = undefined; renderPractice(); return }
  const tab = target.closest<HTMLButtonElement>('[data-library-tab]')
  if (tab) { libraryTab = tab.dataset.libraryTab!; renderLibrary(); return }
  const actionButton = target.closest<HTMLButtonElement>('[data-action]')
  if (!actionButton) return
  const action = actionButton.dataset.action
  if (action === 'clear-topic-search' && (navigation.view === 'system-design' || navigation.view === 'other-topics')) { topicFilter = ''; topicGroup = ''; topicStage = ''; coreTopicsOnly = false; renderCurriculum(navigation.view); element<HTMLInputElement>('#topic-search').focus() }
  if (action === 'open-sidebar') { document.body.classList.add('sidebar-open'); element('#sidebar').inert = false; element('#main-content').inert = true; element('.topbar').inert = true; element('#sidebar-backdrop').hidden = false; actionButton.setAttribute('aria-expanded', 'true'); element<HTMLInputElement>('#chapter-search').focus() }
  if (action === 'close-sidebar') closeSidebar()
  if (action === 'collapse-topics') {
    autoOpenTopicGroups = false
    openTopicGroups.clear()
    document.querySelectorAll<HTMLDetailsElement>('#chapter-list [data-topic-disclosure]').forEach(group => { group.open = false })
    toast('All topic groups collapsed.')
  }
  if (action === 'search') { openDialog('#search-dialog'); element<HTMLInputElement>('#global-search').value = ''; renderSearch(); element<HTMLInputElement>('#global-search').focus() }
  if (action === 'settings') showSettings()
  if (action === 'account') { showSettings(); element('#account-title').focus() }
  if (action === 'sign-in') void cloudSync?.signIn()
  if (action === 'sign-out') { if (cloudStatus?.pending) toast('Pending changes remain in this browser for this account. Sign in here again to finish syncing.'); void cloudSync?.signOut() }
  if (action === 'sync-now') { if (cloudStatus?.error || !cloudStatus?.ready) cloudSync?.retry(); else void cloudSync?.flush() }
  if (action === 'guest-import') openDialog('#guest-import-dialog')
  if (action === 'confirm-guest-import') { cloudSync?.importGuest(); element<HTMLDialogElement>('#guest-import-dialog').close(); toast('Guest study data copied into this account. The guest copy is unchanged.') }
  if (action === 'close-dialog') actionButton.closest('dialog')?.close()
  if (action === 'theme') { state.theme = state.theme === 'light' ? 'dark' : 'light'; persist(); applyPreferences(); void renderDiagrams(element('#main-content'), generation) }
  if (action === 'font-down' || action === 'font-up') { state.fontSize = Math.max(16, Math.min(22, state.fontSize + (action === 'font-up' ? 2 : -2))); persist(); applyPreferences() }
  if (action === 'complete') {
    if (currentEntry.number !== null) state = toggleChapterCompletion(state, currentEntry.id)
    else state.completed = toggleItem(state.completed, currentEntry.id)
    persist()
    const done = state.completed.includes(currentEntry.id)
    document.querySelectorAll<HTMLButtonElement>('[data-action="complete"]').forEach(control => { control.innerHTML = `${icon(done ? 'circle-check' : 'check')}<span>${done ? 'Completed' : 'Mark complete'}</span>`; control.classList.toggle('is-complete', done); control.setAttribute('aria-pressed', String(done)) })
    renderSidebar(); toast(done ? 'Chapter marked complete.' : 'Chapter marked as incomplete.')
  }
  if (action === 'bookmark') { state.bookmarks = toggleItem(state.bookmarks, currentEntry.id); persist(); const saved = state.bookmarks.includes(currentEntry.id); actionButton.setAttribute('aria-pressed', String(saved)); actionButton.title = saved ? 'Remove bookmark' : 'Bookmark chapter'; actionButton.setAttribute('aria-label', actionButton.title); renderSidebar(); toast(saved ? 'Chapter saved to your library.' : 'Bookmark removed.') }
  if (action === 'notes') { activeTab = 'notes'; renderRail(); element('#rail-content').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); element<HTMLTextAreaElement>('#chapter-note').focus() }
  if (action === 'copy-code') { const code = actionButton.closest('.code-block')?.querySelector('code')?.textContent ?? ''; if (navigator.clipboard) void navigator.clipboard.writeText(code).then(() => toast('Code copied.'), () => toast('Clipboard unavailable. Select the code to copy it.')); else toast('Clipboard unavailable. Select the code to copy it.') }
  if (action === 'expand-diagram') {
    const snapshot = diagramSnapshot(actionButton.closest<HTMLElement>('[data-diagram]'))
    if (!snapshot) { toast('The diagram is still loading.'); return }
    element('#diagram-title').textContent = snapshot.title
    openDialog('#diagram-dialog')
    mountDiagram(element('#diagram-dialog'), snapshot.svg, snapshot.title, true)
    element('#expanded-diagram').focus()
  }
  if (action === 'pan-diagram' || action === 'zoom-in' || action === 'zoom-out' || action === 'zoom-reset') handleDiagramAction(actionButton)
  if (action === 'download-diagram') { const snapshot = diagramSnapshot(actionButton.closest<HTMLElement>('[data-diagram], .diagram-dialog')); if (snapshot) { snapshot.svg.style.background = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim(); snapshot.svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); download(snapshot.svg.outerHTML, `${currentEntry.id}-diagram.svg`, 'image/svg+xml') } }
  if (action === 'export') { download(JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2), `system-design-progress-${new Date().toISOString().slice(0, 10)}.json`, 'application/json'); toast('Progress and notes exported.') }
  if (action === 'import') element<HTMLInputElement>('#import-input').click()
  if (action === 'reset') openDialog('#confirm-dialog')
  if (action === 'confirm-reset') { state = emptyState(firstChapter.id); persist(); element<HTMLDialogElement>('#confirm-dialog').close(); location.hash = routeFor(firstChapter.id); render(); toast(cloudSync?.signedIn() ? 'Account data reset. Deletions are pending sync.' : 'This browser\'s guest study data has been reset.') }
  if (action === 'check-answer') { const question = filteredQuestions()[questionIndex]; if (question && pendingAnswer !== undefined) { state.answers[question.id] = pendingAnswer; persist(); pendingAnswer = undefined; if (practiceFilter !== 'all') practiceFilter = 'all'; const pool = filteredQuestions(); questionIndex = pool.findIndex(item => item.id === question.id); renderPractice() } }
  if (action === 'retry-question') { const question = filteredQuestions()[questionIndex]; if (question) { delete state.answers[question.id]; persist(); pendingAnswer = undefined; practiceFilter = 'all'; questionIndex = filteredQuestions().findIndex(item => item.id === question.id); renderPractice() } }
  if (action === 'next-question' || action === 'previous-question') { const pool = filteredQuestions(); questionIndex = action === 'next-question' ? (questionIndex + 1) % Math.max(1, pool.length) : Math.max(0, questionIndex - 1); pendingAnswer = undefined; cardRevealed = false; renderPractice() }
  if (action === 'reveal-card') { cardRevealed = true; renderPractice() }
  if (action === 'know-card') { const question = filteredQuestions()[questionIndex]; if (question) { const id = question.cardId ?? book.chapters[question.chapter - 1].id; state.knownCards = [...new Set([...state.knownCards, id])]; persist(); questionIndex = (questionIndex + 1) % Math.max(1, filteredQuestions().length); cardRevealed = false; renderPractice() } }
  if (action === 'all-questions') { practiceFilter = 'all'; questionIndex = 0; renderPractice() }
  if (action === 'restart-practice') openDialog('#review-reset-dialog')
  if (action === 'confirm-review-reset') { state.answers = {}; persist(); pendingAnswer = undefined; questionIndex = 0; element<HTMLDialogElement>('#review-reset-dialog').close(); renderPractice(); toast('Review answers cleared. Chapter progress and notes are unchanged.') }
})

document.addEventListener('toggle', event => {
  const target = event.target
  if (!(target instanceof HTMLDetailsElement) || !target.dataset.topicDisclosure || (chapterFilter && autoOpenTopicGroups)) return
  if (target.open) openTopicGroups.add(target.dataset.topicDisclosure)
  else openTopicGroups.delete(target.dataset.topicDisclosure)
}, true)

document.addEventListener('input', event => {
  const target = event.target as HTMLInputElement
  if (target.id === 'topic-search' && (navigation.view === 'system-design' || navigation.view === 'other-topics')) { topicFilter = target.value; renderCurriculumBody(navigation.view) }
  if (target.id === 'chapter-search') { chapterFilter = target.value; autoOpenTopicGroups = true; renderSidebar() }
  if (target.id === 'global-search') renderSearch()
  if (target.id === 'video-search') { libraryFilter = target.value; renderLibraryBody() }
  if (target.id === 'chapter-note') { state.notes[currentEntry.id] = target.value.slice(0, 20000); if (!state.notes[currentEntry.id]) delete state.notes[currentEntry.id]; persist(); element('#note-saved').textContent = storageWarning ? 'Export to keep your notes' : 'Saved here'; element('#note-count').textContent = `${target.value.length.toLocaleString()} / 20,000` }
})

document.addEventListener('change', event => {
  const target = event.target as HTMLInputElement
  if (target.id === 'course-stage-select') { topicStage = target.value; topicGroup = ''; renderCurriculum('system-design'); element<HTMLSelectElement>('#course-stage-select').focus({ preventScroll: true }) }
  if (target.id === 'topic-category') { topicGroup = target.value; renderCurriculumBody('system-design') }
  if (target.id === 'core-topics') { coreTopicsOnly = target.checked; renderCurriculumBody('system-design') }
  if (target.name === 'answer') { pendingAnswer = Number(target.value); element<HTMLButtonElement>('#check-answer').disabled = false }
  if (target.id === 'practice-scope') { practiceScope = target.value; questionIndex = 0; pendingAnswer = undefined; cardRevealed = false; renderPractice() }
  if (target.id === 'practice-filter') { practiceFilter = target.value; questionIndex = 0; pendingAnswer = undefined; renderPractice() }
  if (target.id === 'import-input') {
    const file = target.files?.[0]
    target.value = ''
    if (!file) return
    if (file.size > 2_000_000) { toast('Choose a progress JSON file smaller than 2 MB.'); return }
    void file.text().then(content => {
      const incoming = validateState(JSON.parse(content), ids)
      state = mergeState(state, incoming); persist(); render(); showSettings(); toast('Study data imported. Matching notes and answers were replaced; other saved data was kept.')
    }).catch(() => toast('This file is not a valid System Design Studio progress export. Your existing data has not changed.'))
  }
})

document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); closeSidebar(); openDialog('#search-dialog'); renderSearch(); element<HTMLInputElement>('#global-search').focus() }
  if (event.key === 'Escape') closeSidebar()
  if (event.key === 'Tab' && document.body.classList.contains('sidebar-open')) {
    const focusable = [...element('#sidebar').querySelectorAll<HTMLElement>('button:not([disabled]), input, summary, a[href]')].filter(control => control.checkVisibility())
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
  if (event.target instanceof HTMLElement && event.target.matches('[data-curriculum-tab]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault()
    const tabs: typeof curriculumTab[] = ['visuals', 'topics', 'flow', 'scenarios']
    const current = tabs.indexOf(curriculumTab)
    curriculumTab = event.key === 'Home' ? 'visuals' : event.key === 'End' ? 'scenarios' : tabs[(current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]
    renderCurriculum('system-design')
    element<HTMLButtonElement>(`[data-curriculum-tab="${curriculumTab}"]`).focus()
  }
  if (event.target instanceof HTMLElement && event.target.matches('[data-rail]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault()
    activeTab = event.key === 'Home' ? 'outline' : event.key === 'End' ? 'notes' : activeTab === 'outline' ? 'notes' : 'outline'
    renderRail()
    element<HTMLButtonElement>(`[data-rail="${activeTab}"]`).focus()
  }
  if (element<HTMLDialogElement>('#search-dialog').open && event.target instanceof HTMLElement && (event.target.id === 'global-search' || event.target.closest('.search-result')) && ['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
    if (!searchResults.length) return
    event.preventDefault()
    if (event.key === 'Enter') { element<HTMLAnchorElement>(`[data-search-index="${activeSearch}"]`).click(); return }
    activeSearch = (activeSearch + (event.key === 'ArrowDown' ? 1 : -1) + searchResults.length) % searchResults.length
    document.querySelectorAll<HTMLElement>('[data-search-index]').forEach(result => result.classList.toggle('active', Number(result.dataset.searchIndex) === activeSearch))
    element(`[data-search-index="${activeSearch}"]`).scrollIntoView({ block: 'nearest' })
  }
})

document.querySelectorAll<HTMLDialogElement>('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target !== dialog) return
  const bounds = dialog.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close()
}))

window.addEventListener('hashchange', render)
mobileLayout.addEventListener('change', closeSidebar)
window.addEventListener('scroll', updateReadingProgress, { passive: true })
element('#main-content').addEventListener('scroll', updateReadingProgress, { passive: true })
window.addEventListener('beforeunload', () => { window.clearTimeout(scrollSave); persist() })
window.addEventListener('online', () => { if (cloudStatus?.signedIn) cloudSync?.retry() })
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void cloudSync?.flush() })
const geminiChat = mountGeminiChat(element('#gemini-widget'), () => {
  if (navigation.view === 'read') {
    const topic = readingTopic()
    if (conciseReading && topic) return { title: `${topic.number} ${topic.title}`, text: lessonText(topic) }
    const section = document.querySelector<HTMLElement>('.page-outline a.active')?.dataset.section ?? navigation.section
    const reading = book.search.find(record => record.entryId === currentEntry.id && record.id === section)
    return { title: reading ? `${currentEntry.title} / ${reading.title}` : currentEntry.title, text: reading?.text ?? currentEntry.text.slice(0, 10000) }
  }
  if (navigation.view === 'practice') {
    const question = filteredQuestions()[questionIndex]
    if (question) return { title: 'Practice / ' + question.term, text: `${question.prompt}\n${question.options.map((option, index) => `${index + 1}. ${option}`).join('\n')}` }
  }
  if (navigation.view === 'interview') { const context = interviewView?.context(); if (context) return { title: context.heading, text: context.text } }
  return undefined
}, enhanceIcons, () => { closeSidebar(); notebookWidget?.close() })
const notebookHost = document.createElement('div')
notebookHost.id = 'notebook-widget'
element('#gemini-widget').append(notebookHost)
notebookWidget = mountNotebook(notebookHost, {
  notes: () => state.notebook,
  save: notes => { state.notebook = notes; persist() },
  source: node => {
    if (navigation.view === 'interview') {
      const container = (node instanceof Element ? node : node.parentElement)?.closest<HTMLElement>('[data-topic-heading]')
      const context = interviewView?.context()
      return { entryId: context ? book.chapters[context.chapter - 1].id : null, heading: container?.dataset.topicHeading ?? context?.heading ?? 'Interview revision' }
    }
    if (navigation.view === 'read') {
      const topic = readingTopic()
      if (conciseReading && topic) return { entryId: currentEntry.id, heading: `${topic.number} ${topic.title}` }
      const headings = [...element('#chapter-content').querySelectorAll<HTMLElement>('h3[id], h4[id]')]
      const heading = headings.filter(heading => Boolean(heading.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) || heading.contains(node)).at(-1)
      return { entryId: currentEntry.id, heading: `${currentEntry.title}${heading ? ' / ' + heading.textContent : ''}` }
    }
    if (navigation.view === 'practice') {
      const question = filteredQuestions()[questionIndex]
      if (question) return { entryId: book.chapters[question.chapter - 1].id, heading: question.term }
    }
    return { entryId: null, heading: document.querySelector('#main-content h1')?.textContent ?? 'General notes' }
  },
  exportNotes: () => [...state.notebook.filter(note => note.text.trim()), ...Object.entries(state.notes).filter(([, text]) => text.trim()).map(([id, text]) => createNotebookNote(text, id, book.entries.find(entry => entry.id === id)?.title ?? 'Chapter notes', `chapter-${id}`))],
  beforeOpen: () => { closeSidebar(); geminiChat.close() },
  enhanceIcons,
})
completionActivity = mountCompletionActivity(element('#completion-activity'), {
  chapters: book.chapters,
  history: () => state.completionHistory,
  beforeOpen: () => { closeSidebar(); geminiChat.close(); notebookWidget?.close() },
  enhanceIcons,
})
cloudSync = createCloudSync({
  ids,
  storage: { getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) },
  current: () => state,
  replace: (next, accountChanged) => {
    const previousTheme = state.theme
    state = next
    if (accountChanged) {
      pendingAnswer = undefined
      questionIndex = 0
      storageWarning = false
      notebookWidget?.close()
      geminiChat.close()
      document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(dialog => dialog.close())
      render()
      return
    }
    renderSidebar()
    notebookWidget?.refresh()
    interviewView?.refresh()
    studyTrackerView?.refresh()
    const editor = document.querySelector<HTMLTextAreaElement>('#chapter-note')
    if (editor && document.activeElement !== editor) { editor.value = state.notes[currentEntry.id] ?? ''; element('#note-count').textContent = `${editor.value.length.toLocaleString()} / 20,000` }
    if (navigation.view === 'practice') renderPractice()
    if (navigation.view === 'read') {
      const done = state.completed.includes(currentEntry.id)
      document.querySelectorAll<HTMLButtonElement>('[data-action="complete"]').forEach(control => { control.innerHTML = `${icon(done ? 'circle-check' : 'check')}<span>${done ? 'Completed' : 'Mark complete'}</span>`; control.classList.toggle('is-complete', done); control.setAttribute('aria-pressed', String(done)) })
      const bookmark = document.querySelector<HTMLButtonElement>('[data-action="bookmark"]')
      if (bookmark) { const saved = state.bookmarks.includes(currentEntry.id); bookmark.setAttribute('aria-pressed', String(saved)); bookmark.title = saved ? 'Remove bookmark' : 'Bookmark chapter'; bookmark.setAttribute('aria-label', bookmark.title) }
    }
    applyPreferences()
    if (previousTheme !== state.theme) void renderDiagrams(element('#main-content'), generation)
  },
  status: renderAccount,
})
render()
void cloudSync.start()
if (storageWarning) toast('Your saved progress could not be loaded. Export any new progress and notes to keep a backup.')