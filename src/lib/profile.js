// Profile math — unit conversions and daily calorie target (Mifflin-St Jeor).

export const cmFromFtIn = (ft, inch) => Math.round((ft * 12 + inch) * 2.54)
export const ftInFromCm = (cm) => {
  const totalInches = Math.round(cm / 2.54)
  return { ft: Math.floor(totalInches / 12), inch: totalInches % 12 }
}
export const kgFromLb = (lb) => Math.round(lb * 0.45359 * 10) / 10
export const lbFromKg = (kg) => Math.round(kg / 0.45359)

const ACTIVITY_FACTOR = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
}

export function bmr(p) {
  if (!p?.weightKg || !p?.heightCm || !p?.age) return null
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age
  if (p.sex === 'male') return base + 5
  if (p.sex === 'female') return base - 161
  return base - 78 // midpoint when unspecified
}

/** Daily calorie target: BMR × activity, nudged by goal. Rounded to 10. */
export function calorieTarget(p) {
  const base = bmr(p)
  if (!base) return null
  const tdee = base * (ACTIVITY_FACTOR[p?.activity] ?? 1.375)
  const adjust = p?.goal === 'lose' ? -400 : p?.goal === 'gain' ? 300 : 0
  return Math.round((tdee + adjust) / 10) * 10
}

/** ~35ml per kg of body weight, in 250ml glasses, clamped to a sane range. */
export function suggestedWaterGoal(p) {
  if (!p?.weightKg) return 8
  return Math.max(6, Math.min(12, Math.round((p.weightKg * 35) / 250)))
}
