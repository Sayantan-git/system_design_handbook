import { questions } from './questions'
import { validateNotebook, type NotebookNote } from './notebook'
import { interviewTopics, validateInterviewAnswers, type InterviewAnswer } from './interview'
import { localDay, mergeCompletionHistory, recordCompletion, validateCompletionHistory, type CompletionHistory } from './activity'
import { emptyStudyTracker, mergeStudyTracker, validateStudyTracker, type StudyTrackerState } from './study-tracker'

export const STORAGE_KEY = 'system-design-studio:v1'
export interface StudyState {
  version: 1
  completed: string[]
  completionHistory: CompletionHistory
  studyTracker: StudyTrackerState
  bookmarks: string[]
  notes: Record<string, string>
  notebook: NotebookNote[]
  interviewTopics: string[]
  interviewAnswers: Record<string, InterviewAnswer>
  answers: Record<string, number>
  knownCards: string[]
  positions: Record<string, number>
  lastChapter: string
  theme: 'light' | 'dark'
  fontSize: number
}

export function emptyState(firstId: string): StudyState {
  return { version: 1, completed: [], completionHistory: {}, studyTracker: emptyStudyTracker(), bookmarks: [], notes: {}, notebook: [], interviewTopics: [], interviewAnswers: {}, answers: {}, knownCards: [], positions: {}, lastChapter: firstId, theme: 'dark', fontSize: 18 }
}

export function validateState(input: unknown, ids: string[]): StudyState {
  if (!input || typeof input !== 'object' || Array.isArray(input) || (input as { version?: unknown }).version !== 1) throw new Error('This is not a supported Study Studio progress file.')
  const source = input as Record<string, unknown>
  const state = emptyState(ids[0])
  const allowed = new Set(ids)
  const allowedQuestions = new Set(questions.map(question => question.id))
  const allowedCards = new Set([...ids, ...questions.flatMap(question => question.cardId ? [question.cardId] : [])])
  const list = (value: unknown, accepted = allowed) => Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && accepted.has(item)))] : []
  const records = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : []
  state.completed = list(source.completed)
  state.completionHistory = validateCompletionHistory(source.completionHistory, ids)
  state.studyTracker = validateStudyTracker(source.studyTracker)
  state.bookmarks = list(source.bookmarks)
  state.knownCards = list(source.knownCards, allowedCards)
  state.notebook = validateNotebook(source.notebook, ids)
  state.interviewTopics = list(source.interviewTopics, new Set(interviewTopics.map(topic => topic.id)))
  state.interviewAnswers = validateInterviewAnswers(source.interviewAnswers)
  for (const [id, note] of records(source.notes)) if (allowed.has(id) && typeof note === 'string') state.notes[id] = note.slice(0, 20000)
  for (const [id, answer] of records(source.answers)) if (allowedQuestions.has(id) && Number.isInteger(answer) && Number(answer) >= 0 && Number(answer) < 4) state.answers[id] = Number(answer)
  for (const [id, position] of records(source.positions)) if (allowed.has(id) && typeof position === 'number' && Number.isFinite(position)) state.positions[id] = Math.min(1, Math.max(0, position))
  if (typeof source.lastChapter === 'string' && allowed.has(source.lastChapter)) state.lastChapter = source.lastChapter
  state.theme = source.theme === 'light' ? 'light' : 'dark'
  state.fontSize = [16, 18, 20, 22].includes(Number(source.fontSize)) ? Number(source.fontSize) : 18
  return state
}

export function mergeState(current: StudyState, incoming: StudyState): StudyState {
  return {
    ...current,
    completed: [...new Set([...current.completed, ...incoming.completed])],
    completionHistory: mergeCompletionHistory(current.completionHistory, incoming.completionHistory),
    studyTracker: mergeStudyTracker(current.studyTracker, incoming.studyTracker),
    bookmarks: [...new Set([...current.bookmarks, ...incoming.bookmarks])],
    knownCards: [...new Set([...current.knownCards, ...incoming.knownCards])],
    notes: { ...current.notes, ...incoming.notes },
    notebook: [...new Map([...current.notebook, ...incoming.notebook].map(note => [note.id, note])).values()],
    interviewTopics: [...new Set([...current.interviewTopics, ...incoming.interviewTopics])],
    interviewAnswers: { ...current.interviewAnswers, ...incoming.interviewAnswers },
    answers: { ...current.answers, ...incoming.answers },
    positions: { ...current.positions, ...incoming.positions },
  }
}

export function loadState(storage: Pick<Storage, 'getItem'>, ids: string[], key = STORAGE_KEY): { state: StudyState; warning: boolean } {
  try {
    const raw = storage.getItem(key)
    return { state: raw ? validateState(JSON.parse(raw), ids) : emptyState(ids[0]), warning: false }
  } catch {
    return { state: emptyState(ids[0]), warning: true }
  }
}

export function saveState(storage: Pick<Storage, 'setItem'>, state: StudyState, key = STORAGE_KEY): boolean {
  try { storage.setItem(key, JSON.stringify(state)); return true } catch { return false }
}

export function toggleItem(values: string[], id: string): string[] {
  return values.includes(id) ? values.filter(value => value !== id) : [...values, id]
}

export function toggleChapterCompletion(state: StudyState, id: string, date = new Date()): StudyState {
  const completed = toggleItem(state.completed, id)
  return { ...state, completed, completionHistory: recordCompletion(state.completionHistory, localDay(date), id, completed.includes(id)) }
}