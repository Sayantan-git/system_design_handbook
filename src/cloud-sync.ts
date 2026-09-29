import type { FirebaseOptions } from 'firebase/app'
import type { User } from 'firebase/auth'
import { loadState, mergeState, saveState, type StudyState } from './state'
import { accountStorageKey, bucketPayload, emptyReplica, mergeBucket, mergeReplica, parseBucket, parseReplica, recordState, replicaStorageKey, stateFromReplica, type SyncReplica } from './sync-state'

type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>
export interface CloudStatus { configured: boolean; signedIn: boolean; ready: boolean; busy: boolean; account: string; message: string; pending: number; error: boolean }
interface CloudOptions {
  ids: string[]
  storage: StorageAccess
  current: () => StudyState
  replace: (state: StudyState, accountChanged: boolean) => void
  status: (status: CloudStatus) => void
  config?: FirebaseOptions
}

export function firebaseConfig(): FirebaseOptions | undefined {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }
  return Object.values(config).every(value => typeof value === 'string' && value.trim()) ? config : undefined
}

export function cloudError(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
  if (code.includes('resource-exhausted')) return 'The project quota has been reached. Changes stay local; retry after the quota resets.'
  if (code.includes('permission-denied')) return 'Sync permission denied. Check the deployed account-only Firestore rules.'
  if (code.includes('unauthorized-domain')) return 'This website domain is not authorized in Firebase Authentication.'
  if (code.includes('operation-not-allowed')) return 'Enable Google sign-in in the Firebase project.'
  if (code.includes('popup-closed') || code.includes('cancelled-popup')) return 'Sign-in was cancelled. Your local study data is unchanged.'
  if (code.includes('popup-blocked')) return 'The sign-in popup was blocked. Allow popups for this website and try again.'
  if (code.includes('network') || code.includes('unavailable')) return 'Cloud sync is unavailable. Changes stay local until you reconnect and retry.'
  if (code.includes('invalid-api-key') || code.includes('invalid-app')) return 'The Firebase web configuration is invalid.'
  return 'Cloud sync could not finish. Changes remain in this session; export a backup if local saving is unavailable.'
}

async function connectFirebase(config: FirebaseOptions) {
  const [appApi, authApi, storeApi] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')])
  const app = appApi.getApps().find(app => app.name === 'study-studio') ?? appApi.initializeApp(config, 'study-studio')
  const auth = authApi.getAuth(app)
  await authApi.setPersistence(auth, authApi.browserSessionPersistence)
  return { authApi, storeApi, auth, db: storeApi.getFirestore(app) }
}

export function createCloudSync(options: CloudOptions) {
  const config = options.config ?? firebaseConfig()
  const client = crypto.randomUUID()
  let sdk: Awaited<ReturnType<typeof connectFirebase>> | undefined
  let user: User | null = null
  let replica: SyncReplica = emptyReplica()
  let epoch = 0
  let ready = false
  let busy = false
  let stopped = false
  let blocked = false
  let syncingEpoch: number | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let unsubscribe: (() => void) | undefined
  let unsubscribeAuth: (() => void) | undefined
  let lastWrite = 0
  let startPromise: Promise<void> | undefined
  let message = config ? 'Connecting to Google sign-in...' : 'Google sign-in is not configured. Study data is saved in this browser.'
  let error = false

  function report(nextMessage = message, failed = false) {
    message = nextMessage
    error = failed
    options.status({ configured: Boolean(config), signedIn: Boolean(user), ready, busy, account: user?.email ?? user?.displayName ?? '', message, pending: replica.dirty.length, error })
  }
  function storeReplica(): boolean {
    if (!user) return false
    try {
      options.storage.setItem(replicaStorageKey(user.uid), JSON.stringify(replica))
      return true
    } catch { report('Local storage is full or unavailable. Keep this page open and export a backup.', true); return false }
  }
  function schedule() {
    clearTimeout(timer)
    if (!user || !ready || blocked || !replica.dirty.length || stopped) return
    timer = setTimeout(() => { void flush() }, Math.max(8000, lastWrite + 15000 - Date.now()))
  }
  function save(state: StudyState): boolean {
    if (!user) return saveState(options.storage, state)
    try { replica = recordState(replica, state, client) }
    catch { report('A sync record cannot be saved. Export your study data before closing this page.', true); return false }
    const saved = storeReplica()
    if (saved && !blocked && replica.dirty.length) report('Saved locally. Changes are pending sync.')
    schedule()
    return saved
  }
  function applyRemote() {
    storeReplica()
    options.replace(stateFromReplica(replica, options.ids), false)
  }
  function watch(token: number) {
    if (!sdk || !user || stopped) return
    unsubscribe?.()
    ready = false
    const { storeApi, db } = sdk
    const owner = user.uid
    unsubscribe = storeApi.onSnapshot(storeApi.collection(db, 'users', owner, 'study'), { includeMetadataChanges: true }, snapshot => {
      if (token !== epoch || user?.uid !== owner || stopped) return
      for (const change of snapshot.docChanges()) {
        if (change.type === 'removed') continue
        const data = change.doc.data()
        const incoming = data.version === 1 ? parseBucket(data.payload) : undefined
        if (!incoming) { blocked = true; report('An unsupported cloud record was found. Sync is paused; export a local backup.', true); return }
        replica = mergeReplica(replica, change.doc.id, incoming)
      }
      applyRemote()
      if (!snapshot.metadata.fromCache) ready = true
      if (!blocked) report(replica.dirty.length ? 'Saved locally. Changes are pending sync.' : ready ? 'Study data is synced.' : 'Waiting for cloud connection. Local changes are retained.')
      schedule()
    }, failure => {
      if (token !== epoch || stopped) return
      ready = false
      blocked = true
      report(cloudError(failure), true)
    })
  }
  async function activate(nextUser: User | null) {
    if (stopped) return
    save(options.current())
    const token = ++epoch
    clearTimeout(timer)
    unsubscribe?.()
    unsubscribe = undefined
    ready = false
    blocked = false
    busy = false
    user = nextUser
    replica = emptyReplica()
    if (user) {
      try {
        const raw = options.storage.getItem(replicaStorageKey(user.uid))
        if (raw) replica = parseReplica(JSON.parse(raw))
        else {
          const scoped = options.storage.getItem(accountStorageKey(user.uid))
          const local = loadState(options.storage, options.ids, accountStorageKey(user.uid)).state
          replica = recordState(emptyReplica(), local, client, scoped ? Date.now() : 0)
          if (!scoped) replica.dirty = []
        }
      } catch { report('The account cache could not be read. Export any recoverable local data.', true) }
      options.replace(stateFromReplica(replica, options.ids), true)
      report('Signed in. Loading this account\'s study data...')
      watch(token)
    } else {
      options.replace(loadState(options.storage, options.ids).state, true)
      report('Signed out. This browser\'s guest study data is active.')
    }
  }
  async function flush() {
    clearTimeout(timer)
    if (!sdk || !user || !ready || blocked || stopped || syncingEpoch === epoch || !replica.dirty.length) return
    const token = epoch
    const owner = user.uid
    const service = sdk
    syncingEpoch = token
    busy = true
    report('Syncing study data...')
    try {
      for (const bucketId of replica.dirty.slice(0, 50)) {
        if (token !== epoch || stopped || service.auth.currentUser?.uid !== owner) return
        const outgoing = replica.buckets[bucketId]
        const reference = service.storeApi.doc(service.db, 'users', owner, 'study', bucketId)
        const committed = await service.storeApi.runTransaction(service.db, async transaction => {
          const snapshot = await transaction.get(reference)
          if (token !== epoch || stopped || service.auth.currentUser?.uid !== owner) throw new Error('Account changed during sync.')
          const data = snapshot.data()
          const remote = snapshot.exists() ? data?.version === 1 ? parseBucket(data.payload) : undefined : {}
          if (!remote) throw new Error('Unsupported sync data.')
          const merged = mergeBucket(remote, outgoing)
          const payload = bucketPayload(merged)
          if (data?.payload !== payload) transaction.set(reference, { version: 1, payload })
          return merged
        })
        if (token !== epoch || user?.uid !== owner || stopped) return
        replica = mergeReplica(replica, bucketId, committed)
        if (bucketPayload(replica.buckets[bucketId]) === bucketPayload(committed)) replica.dirty = replica.dirty.filter(id => id !== bucketId)
        applyRemote()
      }
      if (token === epoch) report(replica.dirty.length ? 'Some changes are still pending sync.' : 'Study data is synced.')
    } catch (failure) {
      if (token === epoch && !stopped) { blocked = true; report(cloudError(failure), true) }
    } finally {
      if (syncingEpoch === token) syncingEpoch = undefined
      if (token === epoch && !stopped) { busy = false; lastWrite = Date.now(); report(message, error); schedule() }
    }
  }
  async function start() {
    if (!config || stopped) { report(); return }
    if (startPromise) return startPromise
    startPromise = (async () => {
      try {
        sdk = await connectFirebase(config)
        if (!stopped) unsubscribeAuth = sdk.authApi.onAuthStateChanged(sdk.auth, nextUser => { void activate(nextUser) }, failure => report(cloudError(failure), true))
      } catch (failure) { report(cloudError(failure), true); startPromise = undefined }
    })()
    return startPromise
  }
  report()
  return {
    start,
    save,
    flush,
    signedIn: () => Boolean(user),
    signIn: async () => {
      if (!config || busy) return
      busy = true; report('Opening Google sign-in...')
      try {
        await start()
        if (!sdk || stopped) return
        const provider = new sdk.authApi.GoogleAuthProvider()
        provider.setCustomParameters({ prompt: 'select_account' })
        await sdk.authApi.signInWithPopup(sdk.auth, provider)
      } catch (failure) { report(cloudError(failure), true) }
      finally { busy = false; report(message, error) }
    },
    signOut: async () => {
      if (!sdk) return
      save(options.current())
      clearTimeout(timer)
      ++epoch
      unsubscribe?.()
      try { await sdk.authApi.signOut(sdk.auth) }
      catch (failure) { report(cloudError(failure), true); watch(epoch) }
    },
    retry: () => {
      if (user) { blocked = false; report('Reconnecting cloud sync...'); watch(epoch) }
      else { void start() }
    },
    importGuest: () => {
      if (!user) return
      const guest = loadState(options.storage, options.ids)
      if (guest.warning) { report('Guest study data could not be loaded. It was not imported.', true); return }
      const combined = mergeState(options.current(), guest.state)
      save(combined)
      options.replace(combined, false)
    },
    destroy: () => { stopped = true; ++epoch; clearTimeout(timer); unsubscribe?.(); unsubscribeAuth?.() },
  }
}