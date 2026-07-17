/** Portion scaling — how much of the analyzed serving was actually eaten. */

export const PORTIONS = [
  { value: 0.25, label: '¼' },
  { value: 0.5, label: '½' },
  { value: 0.75, label: '¾' },
  { value: 1, label: 'All of it' },
]

const NUM_FIELDS = ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg']

const round1 = (n) => Math.round(n * 10) / 10

function applyPortion(base, analysis, portion) {
  const scaled = { ...analysis, portion, base }
  scaled.calories = Math.round((base.calories || 0) * portion)
  for (const key of NUM_FIELDS.slice(1)) scaled[key] = round1((base[key] || 0) * portion)
  return scaled
}

/** Full-serving numbers for a (possibly already scaled) analysis. Meals
 *  logged before portions existed have neither `base` nor `portion`, so
 *  their stored numbers ARE the full serving. */
export function baseNumbers(analysis) {
  if (analysis.base) return analysis.base
  const base = {}
  const p = analysis.portion || 1
  for (const key of NUM_FIELDS) base[key] = round1((analysis[key] || 0) / p)
  return base
}

/** Scale a fresh (full-serving) analysis to the portion eaten. Quality
 *  (health_score, verdict copy) is unchanged — half a chocolate bar is
 *  still chocolate — but every quantity scales, which also scales its
 *  calorie-weighted drag on the Day Score. The untouched full-serving
 *  numbers are kept in `base` so the portion stays editable after logging. */
export function scaleAnalysis(analysis, portion) {
  if (!analysis || portion === 1) return analysis
  const base = {}
  for (const key of NUM_FIELDS) base[key] = analysis[key] || 0
  return applyPortion(base, analysis, portion)
}

/** Re-scale an already-logged analysis to a new portion (edit-after-log). */
export function rescaleAnalysis(analysis, portion) {
  const base = baseNumbers(analysis)
  if (portion === 1) {
    const { portion: _p, base: _b, ...rest } = analysis
    return { ...rest, ...base, calories: Math.round(base.calories || 0) }
  }
  return applyPortion(base, analysis, portion)
}

export function portionLabel(p) {
  const match = PORTIONS.find((o) => o.value === p)
  if (match && p !== 1) return match.label
  return p < 1 ? `${Math.round(p * 100)}%` : null
}
