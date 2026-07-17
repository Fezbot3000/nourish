// Client-side demo analyses — used when no analysis API is reachable
// (e.g. static hosting before the Cloud Function is deployed), so the
// capture flow always works end-to-end.
const SAMPLES = [
  {
    is_food: true, name: 'Berry oatmeal bowl',
    description: 'Rolled oats topped with blueberries, banana and chia seeds',
    calories: 380, protein_g: 11, carbs_g: 62, fat_g: 9, fiber_g: 10, sugar_g: 18, sodium_mg: 105,
    health_score: 9, health_summary: 'Whole grains, fruit and seeds — this is what a decision you never have to apologize for looks like.',
    tip: 'Add Greek yogurt tomorrow and make it a 10.',
    confidence: 'high', used_label: false,
  },
  {
    is_food: true, name: 'Grilled chicken salad',
    description: 'Grilled chicken over mixed greens, tomato, cucumber and avocado',
    calories: 460, protein_g: 38, carbs_g: 18, fat_g: 26, fiber_g: 8, sugar_g: 6, sodium_mg: 520,
    health_score: 9, health_summary: 'Lean protein and half a rainbow — you actually showed up for yourself here.',
    tip: 'Keep the dressing on the side and this stays your best habit.',
    confidence: 'high', used_label: false,
  },
  {
    is_food: true, name: 'Chicken burrito bowl',
    description: 'Rice bowl with chicken, black beans, corn salsa and guacamole',
    calories: 650, protein_g: 42, carbs_g: 68, fat_g: 22, fiber_g: 14, sugar_g: 5, sodium_mg: 980,
    health_score: 7, health_summary: 'Solid protein and fiber — and then you drowned it in 980mg of sodium.',
    tip: 'Half the rice next time. You will not miss it.',
    confidence: 'medium', used_label: false,
  },
]

let cursor = 0

export async function localDemoAnalysis({ usedLabel = false } = {}) {
  await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 700))
  const sample = { ...SAMPLES[cursor % SAMPLES.length], demo: true }
  cursor += 1
  if (usedLabel) sample.used_label = true
  return sample
}
