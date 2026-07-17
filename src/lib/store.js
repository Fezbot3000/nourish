import { useEffect, useRef, useState } from 'react'
import { initSync, queuePush } from './sync.js'

const KEY = 'nourish.v1'
const DEFAULTS = { days: {}, settings: { waterGoal: 8 }, onboarded: false, profile: null }

export function todayKey(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function shiftKey(key, delta) {
  const [y, m, d] = key.split('-').map(Number)
  return todayKey(new Date(y, m - 1, d + delta, 12))
}

export function getDay(all, key) {
  return all.days[key] ?? { meals: [], water: 0 }
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (!raw || typeof raw !== 'object') return structuredClone(DEFAULTS)
    const data = {
      days: raw.days && typeof raw.days === 'object' ? raw.days : {},
      settings: { ...DEFAULTS.settings, ...(raw.settings || {}) },
      onboarded: !!raw.onboarded,
      profile: raw.profile ?? null,
      userUpdatedAt: raw.userUpdatedAt ?? 0,
    }
    // Keep 60 days of history so localStorage stays lean.
    const cutoff = shiftKey(todayKey(), -60)
    for (const k of Object.keys(data.days)) {
      if (k < cutoff) delete data.days[k]
    }
    return data
  } catch {
    return structuredClone(DEFAULTS)
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (err) {
    console.warn('Could not persist data:', err)
  }
}

export function eraseAll() {
  localStorage.removeItem(KEY)
  window.location.reload()
}

export function useStore() {
  const [data, setData] = useState(load)
  const [user, setUser] = useState(null)
  const dataRef = useRef(data)
  dataRef.current = data

  // Cross-device sync (no-op when Firebase isn't configured).
  useEffect(() => {
    return initSync({
      onUser: setUser,
      getLocalData: () => dataRef.current,
      mergeRemote: ({ user: remoteUser, days }) => {
        setData((prev) => {
          const next = structuredClone(prev)
          let changed = false
          if (remoteUser && (remoteUser.updatedAt ?? 0) > (prev.userUpdatedAt ?? 0)) {
            next.profile = remoteUser.profile ?? null
            next.settings = { ...next.settings, ...(remoteUser.settings || {}) }
            next.onboarded = !!remoteUser.onboarded
            next.userUpdatedAt = remoteUser.updatedAt
            changed = true
          }
          for (const [key, day] of Object.entries(days || {})) {
            if ((day.updatedAt ?? 0) > (next.days[key]?.updatedAt ?? 0)) {
              next.days[key] = day
              changed = true
            }
          }
          if (!changed) return prev
          save(next)
          return next
        })
      },
    })
  }, [])

  const update = (mutate) => {
    setData((prev) => {
      const next = structuredClone(prev)
      mutate(next)
      // Stamp what changed so sync can mirror it (last-write-wins).
      const now = Date.now()
      const changedDays = []
      const allKeys = new Set([...Object.keys(prev.days), ...Object.keys(next.days)])
      for (const key of allKeys) {
        if (JSON.stringify(prev.days[key]) !== JSON.stringify(next.days[key])) {
          if (next.days[key]) next.days[key].updatedAt = now
          changedDays.push(key)
        }
      }
      const userChanged =
        JSON.stringify([prev.profile, prev.settings, prev.onboarded]) !==
        JSON.stringify([next.profile, next.settings, next.onboarded])
      if (userChanged) next.userUpdatedAt = now
      save(next)
      queuePush({ dayKeys: changedDays.filter((k) => next.days[k]), user: userChanged })
      return next
    })
  }

  return { data, update, user }
}
