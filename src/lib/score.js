import { getDay, todayKey, shiftKey } from './store.js'

const HOUR = 3600 * 1000
const clamp01 = (n) => Math.max(0, Math.min(1, n))
const sortedByTime = (meals) => [...meals].sort((a, b) => new Date(a.time) - new Date(b.time))

export function macroTotals(day) {
  return day.meals.reduce(
    (t, m) => {
      const a = m.analysis
      t.calories += a.calories || 0
      t.protein += a.protein_g || 0
      t.carbs += a.carbs_g || 0
      t.fat += a.fat_g || 0
      return t
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

export function lastMealTime(all) {
  let last = null
  for (const key of Object.keys(all.days)) {
    for (const m of all.days[key].meals) {
      const t = new Date(m.time).getTime()
      if (!last || t > last) last = t
    }
  }
  return last
}

/** Hours since the last logged meal, or null if nothing has ever been logged. */
export function currentFastHours(all) {
  const last = lastMealTime(all)
  if (!last) return null
  return Math.max(0, (Date.now() - last) / HOUR)
}

/**
 * Day Score, 0–100:
 *   Nourish (50) — calorie-weighted average meal health score for the day
 *   Hydrate (25) — water vs. goal
 *   Rhythm  (25) — overnight fast vs. 14h target; falls back to the eating
 *                  window when there is no prior-day data.
 *   Junk penalty — every meal scoring 3 or below costs a flat 5 points on
 *                  top of the average, so repeat offenses always hurt (a
 *                  plain average made the fourth chocolate bar free).
 */
export function dayScore(all, key) {
  const day = getDay(all, key)
  const goal = all.settings?.waterGoal || 8
  const meals = sortedByTime(day.meals)

  // Calorie-weighted: a big bad meal drags the day harder than a small one,
  // and junk can't hide behind one virtuous salad. Plain average is the
  // fallback while every logged meal still has zero-calorie estimates.
  let nourish = 0
  if (meals.length) {
    const calOf = (m) => Math.max(0, m.analysis.calories || 0)
    const totalCal = meals.reduce((s, m) => s + calOf(m), 0)
    nourish = totalCal > 0
      ? (meals.reduce((s, m) => s + (m.analysis.health_score ?? 0) * calOf(m), 0) / totalCal / 10) * 50
      : (meals.reduce((s, m) => s + (m.analysis.health_score ?? 0), 0) / meals.length / 10) * 50
  }

  const penalty = meals.filter((m) => (m.analysis.health_score ?? 0) <= 3).length * 5

  const hydrate = clamp01(day.water / goal) * 25

  let rhythm = 0
  let rhythmLabel = null
  const prevMeals = sortedByTime(getDay(all, shiftKey(key, -1)).meals)
  if (prevMeals.length) {
    const lastPrev = new Date(prevMeals[prevMeals.length - 1].time).getTime()
    let anchor = null
    if (meals.length) anchor = new Date(meals[0].time).getTime()
    else if (key === todayKey()) anchor = Date.now()
    if (anchor) {
      const hours = Math.max(0, (anchor - lastPrev) / HOUR)
      rhythm = clamp01(hours / 14) * 25
      rhythmLabel = `${Math.round(hours)}h overnight fast`
    }
  } else if (meals.length >= 2) {
    const windowHours = (new Date(meals[meals.length - 1].time) - new Date(meals[0].time)) / HOUR
    rhythm = Math.max(0, Math.min(25, 25 - Math.max(0, windowHours - 10) * 2.5))
    rhythmLabel = `${Math.round(windowHours)}h eating window`
  } else if (meals.length === 1) {
    rhythm = 15
  }

  return {
    total: Math.max(0, Math.round(nourish + hydrate + rhythm - penalty)),
    nourish: Math.round(nourish),
    hydrate: Math.round(hydrate),
    rhythm: Math.round(rhythm),
    penalty,
    rhythmLabel,
  }
}

/** Consecutive days scoring 70+, ending today (or yesterday if today is still building). */
export function streakCount(all) {
  let key = todayKey()
  if (dayScore(all, key).total < 70) key = shiftKey(key, -1)
  let streak = 0
  while (dayScore(all, key).total >= 70) {
    streak += 1
    key = shiftKey(key, -1)
  }
  return streak
}

export function scoreWord(total, hasActivity) {
  if (!hasActivity) return 'Fresh start'
  if (total >= 90) return 'Radiant'
  if (total >= 75) return 'Flourishing'
  if (total >= 60) return 'On track'
  if (total >= 40) return 'Finding rhythm'
  return 'Warming up'
}
