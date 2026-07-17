// Cross-device sync: Firebase Auth (Google) + Firestore.
//
// Model: localStorage stays the source of truth for instant UX; when signed
// in, changes are mirrored to Firestore and remote changes stream back in.
// Conflict resolution is last-write-wins per day, using `updatedAt` stamps
// that lib/store.js adds on every change.
//
//   users/{uid}            → { profile, settings, onboarded, updatedAt }
//   users/{uid}/days/{key} → one day of the journal (meals, water, updatedAt)
import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth'
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  onSnapshot,
} from 'firebase/firestore'
import { firebaseConfig } from './firebase-config.js'

export const syncAvailable = !!firebaseConfig

let auth = null
let db = null
if (syncAvailable) {
  const app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
}

const stamp = (day) => day?.updatedAt ?? 0

export async function signIn() {
  const provider = new GoogleAuthProvider()
  try {
    await signInWithPopup(auth, provider)
  } catch (err) {
    // Popups are unreliable in installed PWAs — fall back to a redirect.
    if (err?.code !== 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, provider)
    }
  }
}

export function signOutUser() {
  return signOut(auth)
}

// ---- outbound queue (debounced write-through) ----

let currentUid = null
let getLocal = () => null
let pendingDays = new Set()
let pendingUser = false
let flushTimer = null

function scheduleFlush() {
  clearTimeout(flushTimer)
  flushTimer = setTimeout(flush, 800)
}

async function flush() {
  if (!currentUid) return
  const data = getLocal()
  if (!data) return
  const uid = currentUid
  const days = [...pendingDays]
  const writeUser = pendingUser
  pendingDays = new Set()
  pendingUser = false
  try {
    if (writeUser) {
      await setDoc(doc(db, 'users', uid), {
        profile: data.profile ?? null,
        settings: data.settings,
        onboarded: !!data.onboarded,
        updatedAt: data.userUpdatedAt ?? Date.now(),
      })
    }
    for (const key of days) {
      const day = data.days[key]
      if (day) await setDoc(doc(db, 'users', uid, 'days', key), day)
    }
  } catch (err) {
    console.warn('Sync push failed (will retry on next change):', err?.message)
    days.forEach((k) => pendingDays.add(k))
    if (writeUser) pendingUser = true
  }
}

/** Queue local changes for upload. No-op when signed out. */
export function queuePush({ dayKeys = [], user = false }) {
  if (!syncAvailable || !currentUid) return
  dayKeys.forEach((k) => pendingDays.add(k))
  if (user) pendingUser = true
  scheduleFlush()
}

// ---- lifecycle ----

/**
 * Start the auth listener. On sign-in: one two-way merge (newer side wins per
 * day), then live snapshots keep this device current.
 */
export function initSync({ onUser, mergeRemote, getLocalData }) {
  if (!syncAvailable) return () => {}
  getLocal = getLocalData
  let unsubUser = null
  let unsubDays = null

  getRedirectResult(auth).catch(() => {})

  const unsubAuth = onAuthStateChanged(auth, async (user) => {
    currentUid = user?.uid ?? null
    onUser(user ? { uid: user.uid, name: user.displayName, email: user.email } : null)
    unsubUser?.()
    unsubDays?.()
    unsubUser = unsubDays = null
    if (!user) return
    const uid = user.uid

    try {
      const [userSnap, daysSnap] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getDocs(collection(db, 'users', uid, 'days')),
      ])
      const remoteDays = {}
      daysSnap.forEach((d) => (remoteDays[d.id] = d.data()))
      const remoteUser = userSnap.exists() ? userSnap.data() : null

      // Pull whatever's newer remotely…
      mergeRemote({ user: remoteUser, days: remoteDays })

      // …then push whatever's newer locally.
      const local = getLocal()
      const localNewer = Object.keys(local.days).filter(
        (k) => stamp(local.days[k]) > stamp(remoteDays[k]),
      )
      const pushUser =
        (local.userUpdatedAt ?? 0) > (remoteUser?.updatedAt ?? 0) ||
        (!remoteUser && (local.onboarded || local.profile))
      queuePush({ dayKeys: localNewer, user: pushUser })
    } catch (err) {
      console.warn('Initial sync failed:', err?.message)
    }

    unsubUser = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.metadata.hasPendingWrites || !snap.exists()) return
      mergeRemote({ user: snap.data(), days: {} })
    })
    unsubDays = onSnapshot(collection(db, 'users', uid, 'days'), (snap) => {
      if (snap.metadata.hasPendingWrites) return
      const days = {}
      snap.docChanges().forEach((change) => {
        if (change.type !== 'removed') days[change.doc.id] = change.doc.data()
      })
      if (Object.keys(days).length) mergeRemote({ user: null, days })
    })
  })

  return () => {
    unsubAuth()
    unsubUser?.()
    unsubDays?.()
  }
}
