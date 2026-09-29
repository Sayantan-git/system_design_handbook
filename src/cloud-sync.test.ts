import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCloudSync, cloudError } from './cloud-sync'
import { createNotebookNote } from './notebook'
import { emptyState, STORAGE_KEY, type StudyState } from './state'
import { bucketPayload, emptyReplica, parseBucket, parseReplica, recordState, replicaStorageKey, stateFromReplica } from './sync-state'
import { interviewQuestion, interviewTopics } from './interview'
import { emptyStudyTracker, studyDayIds } from './study-tracker'

const transport = vi.hoisted(() => ({
  auth: { currentUser: null as null | { uid: string; email: string } },
  authListener: undefined as undefined | ((user: unknown) => void),
  listeners: [] as { path: string; next: (snapshot: unknown) => void; error: (error: unknown) => void; active: boolean; includeMetadataChanges: boolean }[],
  documents: new Map<string, { version: number; payload: string }>(),
  beforeGet: undefined as undefined | (() => Promise<void>),
  failure: undefined as unknown,
}))
vi.mock('firebase/app', () => ({ getApps: () => [], initializeApp: vi.fn(() => ({})) }))
vi.mock('firebase/auth', () => ({
  getAuth: () => transport.auth,
  setPersistence: vi.fn(async () => {}),
  browserSessionPersistence: {},
  GoogleAuthProvider: class { setCustomParameters() {} },
  onAuthStateChanged: (_auth: unknown, listener: (user: unknown) => void) => { transport.authListener = listener; listener(transport.auth.currentUser); return () => { transport.authListener = undefined } },
  signInWithPopup: vi.fn(async () => {}),
  signOut: vi.fn(async () => { transport.auth.currentUser = null; transport.authListener?.(null) }),
}))
vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: (_database: unknown, ...parts: string[]) => parts.join('/'),
  doc: (_database: unknown, ...parts: string[]) => parts.join('/'),
  onSnapshot: (path: string, options: { includeMetadataChanges?: boolean } | ((snapshot: unknown) => void), next: (snapshot: unknown) => void, error?: (error: unknown) => void) => {
    const listener = { path, next: typeof options === 'function' ? options : next, error: typeof options === 'function' ? next : error!, active: true, includeMetadataChanges: typeof options !== 'function' && options.includeMetadataChanges === true }
    transport.listeners.push(listener)
    return () => { listener.active = false }
  },
  runTransaction: vi.fn(async (_database: unknown, callback: (transaction: unknown) => unknown) => {
    if (transport.failure) throw transport.failure
    return callback({
      get: async (path: string) => {
        await transport.beforeGet?.()
        const data = transport.documents.get(path)
        return { exists: () => Boolean(data), data: () => data }
      },
      set: (path: string, value: { version: number; payload: string }) => { transport.documents.set(path, value) },
    })
  }),
}))

const activeControllers: ReturnType<typeof createCloudSync>[] = []
const ids = ['chapter-one', 'chapter-two']
function setup(guest = emptyState(ids[0]), configured = true) {
  const values = new Map([[STORAGE_KEY, JSON.stringify(guest)]])
  let state = guest
  let status = ''
  const controller = createCloudSync({
    ids,
    storage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) } },
    current: () => state,
    replace: next => { state = next },
    status: next => { status = next.message },
    ...(configured ? { config: { apiKey: 'test-public-config', appId: 'test-app', authDomain: 'test.example', projectId: 'test-project' } } : {}),
  })
  activeControllers.push(controller)
  return { controller, values, state: () => state, change: (next: StudyState) => { state = next; controller.save(next) }, status: () => status }
}
function signIn(uid: string) {
  transport.auth.currentUser = { uid, email: `${uid}@example.test` }
  transport.authListener?.(transport.auth.currentUser)
}
function snapshot() {
  const listener = transport.listeners.filter(listener => listener.active).at(-1)!
  listener.next({ metadata: { fromCache: false }, docChanges: () => [...transport.documents].filter(([path]) => path.startsWith(`${listener.path}/`)).map(([path, data]) => ({ type: 'added', doc: { id: path.split('/').at(-1), data: () => data } })) })
}

beforeEach(() => {
  vi.clearAllMocks()
  transport.auth.currentUser = null
  transport.authListener = undefined
  transport.listeners = []
  transport.documents.clear()
  transport.beforeGet = undefined
  transport.failure = undefined
})
afterEach(() => { for (const controller of activeControllers.splice(0)) controller.destroy() })

describe('optional Google account sync', () => {
  it('uses only local storage without configuration', async () => {
    const app = setup(undefined, false)
    await app.controller.start()
    const studyTracker = { startDate: '2026-09-29', completedDays: [studyDayIds[0]] }
    app.change({ ...app.state(), bookmarks: [ids[0]], studyTracker })
    await app.controller.signIn()
    expect(transport.authListener).toBeUndefined()
    expect(JSON.parse(app.values.get(STORAGE_KEY)!).bookmarks).toEqual([ids[0]])
    expect(JSON.parse(app.values.get(STORAGE_KEY)!).studyTracker).toEqual(studyTracker)
    expect(app.status()).toContain('not configured')
  })
  it('saves tracker progress to the active account without mixing guest or other account data', async () => {
    const app = setup()
    await app.controller.start()
    const guestTracker = { startDate: '2026-09-29', completedDays: [studyDayIds[0]] }
    app.change({ ...app.state(), studyTracker: guestTracker })
    expect(JSON.parse(app.values.get(STORAGE_KEY)!).studyTracker).toEqual(guestTracker)
    signIn('account-a')
    snapshot()
    expect(app.state().studyTracker).toEqual(emptyStudyTracker())
    const accountTracker = { startDate: '2026-10-05', completedDays: [studyDayIds[2]] }
    app.change({ ...app.state(), studyTracker: accountTracker })
    const cached = parseReplica(JSON.parse(app.values.get(replicaStorageKey('account-a'))!))
    expect(stateFromReplica(cached, ids).studyTracker).toEqual(accountTracker)
    await app.controller.flush()
    const stored = parseBucket(transport.documents.get('users/account-a/study/study-tracker')!.payload)!
    expect(JSON.parse(stored.startDate.value!)).toBe(accountTracker.startDate)
    expect(JSON.parse(stored[studyDayIds[2]].value!)).toBe(true)
    expect(stored[studyDayIds[0]]).toBeUndefined()
    await app.controller.signOut()
    expect(app.state().studyTracker).toEqual(guestTracker)
    signIn('account-b')
    snapshot()
    expect(app.state().studyTracker).toEqual(emptyStudyTracker())
    signIn('account-a')
    snapshot()
    expect(app.state().studyTracker).toEqual(accountTracker)
    app.controller.importGuest()
    expect(app.state().studyTracker).toEqual({ startDate: guestTracker.startDate, completedDays: [studyDayIds[0], studyDayIds[2]] })
    expect(JSON.parse(app.values.get(STORAGE_KEY)!).studyTracker).toEqual(guestTracker)
  })
  it('keeps guest data separate until explicit import and restores it on sign-out', async () => {
    const guest = { ...emptyState(ids[0]), bookmarks: [ids[1]] }
    const app = setup(guest)
    await app.controller.start()
    signIn('account-a')
    expect(app.state().bookmarks).toEqual([])
    snapshot()
    await app.controller.flush()
    expect(transport.documents.size).toBe(0)
    app.controller.importGuest()
    expect(app.state().bookmarks).toEqual([ids[1]])
    await app.controller.flush()
    expect(transport.documents.has('users/account-a/study/progress')).toBe(true)
    await app.controller.signOut()
    expect(app.state().bookmarks).toEqual([ids[1]])
    signIn('account-b')
    snapshot()
    expect(app.state().bookmarks).toEqual([])
    expect(app.values.has(replicaStorageKey('account-a'))).toBe(true)
  })
  it('starts pending writes after a metadata-only server confirmation', async () => {
    const app = setup()
    await app.controller.start()
    signIn('account-a')
    const listener = transport.listeners.find(listener => listener.active)!
    listener.next({ metadata: { fromCache: true }, docChanges: () => [] })
    app.change({ ...app.state(), bookmarks: [ids[0]] })
    await app.controller.flush()
    expect(transport.documents.size).toBe(0)
    if (listener.includeMetadataChanges) listener.next({ metadata: { fromCache: false }, docChanges: () => [] })
    await app.controller.flush()
    expect(transport.documents.has('users/account-a/study/progress')).toBe(true)
    expect(app.status()).toBe('Study data is synced.')
    expect(app.state().bookmarks).toEqual([ids[0]])
  })
  it('merges concurrent answers inside one topic with a transaction', async () => {
    const app = setup()
    await app.controller.start()
    signIn('account-a')
    snapshot()
    const first = interviewQuestion(interviewTopics[0].id, 1).id
    const second = interviewQuestion(interviewTopics[0].id, 2).id
    app.change({ ...app.state(), interviewAnswers: { [first]: { selected: 1, revealed: false, updatedAt: 100 } } })
    const remote = recordState(emptyReplica(), { ...emptyState(ids[0]), interviewAnswers: { [second]: { selected: 2, revealed: false, updatedAt: 100 } } }, 'other-device', 100)
    const bucket = `interview-${interviewTopics[0].id}`
    const path = `users/account-a/study/${bucket}`
    transport.documents.set(path, { version: 1, payload: bucketPayload(remote.buckets[bucket]) })
    await app.controller.flush()
    expect(Object.keys(app.state().interviewAnswers).sort()).toEqual([first, second].sort())
    expect(Object.keys(parseBucket(transport.documents.get(path)!.payload)!)).toHaveLength(2)
  })
  it('retains a newer local edit made while an older write is in flight', async () => {
    const app = setup()
    await app.controller.start()
    signIn('account-a')
    snapshot()
    const note = createNotebookNote('First version', ids[0], 'Topic', 'passage', 100)
    app.change({ ...app.state(), notebook: [note] })
    let release!: () => void
    transport.beforeGet = () => new Promise<void>(resolve => { release = resolve })
    const writing = app.controller.flush()
    app.change({ ...app.state(), notebook: [{ ...note, text: 'Newer local version', updatedAt: 200 }] })
    transport.beforeGet = undefined
    release()
    await writing
    expect(app.state().notebook[0].text).toBe('Newer local version')
    expect(parseReplica(JSON.parse(app.values.get(replicaStorageKey('account-a'))!)).dirty).toContain('note-passage')
    await app.controller.flush()
    expect(parseBucket(transport.documents.get('users/account-a/study/note-passage')!.payload)!.note.value).toContain('Newer local version')
  })
  it('cancels an in-flight old-account transaction before it can write after account switching', async () => {
    const app = setup()
    await app.controller.start()
    signIn('account-a')
    snapshot()
    app.change({ ...app.state(), notebook: [createNotebookNote('Account A only', ids[0], 'Topic', 'passage', 100)] })
    let release!: () => void
    transport.beforeGet = () => new Promise<void>(resolve => { release = resolve })
    const writing = app.controller.flush()
    signIn('account-b')
    snapshot()
    transport.beforeGet = undefined
    release()
    await writing
    expect(app.state().notebook).toEqual([])
    expect(transport.documents.size).toBe(0)
    const cached = parseReplica(JSON.parse(app.values.get(replicaStorageKey('account-a'))!))
    expect(stateFromReplica(cached, ids).notebook[0].text).toBe('Account A only')
  })
  it('retains pending changes and pauses writes after quota exhaustion', async () => {
    const app = setup()
    await app.controller.start()
    signIn('account-a')
    snapshot()
    app.change({ ...app.state(), bookmarks: [ids[0]] })
    transport.failure = { code: 'resource-exhausted' }
    await app.controller.flush()
    expect(app.status()).toContain('quota')
    const cached = parseReplica(JSON.parse(app.values.get(replicaStorageKey('account-a'))!))
    expect(cached.dirty).toContain('progress')
    expect(stateFromReplica(cached, ids).bookmarks).toEqual([ids[0]])
    expect(cloudError({ code: 'permission-denied', message: 'sensitive provider details' })).not.toContain('sensitive')
  })
})