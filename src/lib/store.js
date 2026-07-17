import { useState } from 'react'

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
  const update = (mutate) => {
    setData((prev) => {
      const next = structuredClone(prev)
      mutate(next)
      save(next)
      return next
    })
  }
  return { data, update }
}
