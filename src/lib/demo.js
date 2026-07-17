// Client-side demo analyses — used when no analysis API is reachable
// (e.g. static hosting before the Cloud Function is deployed), so the
// capture flow always works end-to-end.
const SAMPLES = [
  {
    is_food: true, name: 'Berry oatmeal bowl',
    description: 'Rolled oats topped with blueberries, banana and chia seeds',
    calories: 380, protein_g: 11, carbs_g: 62, fat_g: 9, fiber_g: 10, sugar_g: 18, sodium_mg: 105,
    health_score: 9, health_summary: 'Whole grains, fruit and seeds make this a genuinely nourishing start.',
    tip: 'A spoon of Greek yogurt would push the protein toward lunch-proof territory.',
    confidence: 'high', used_label: false,
  },
  {
    is_food: true, name: 'Grilled chicken salad',
    description: 'Grilled chicken over mixed greens, tomato, cucumber and avocado',
    calories: 460, protein_g: 38, carbs_g: 18, fat_g: 26, fiber_g: 8, sugar_g: 6, sodium_mg: 520,
    health_score: 9, health_summary: 'Lean protein plus half a rainbow of vegetables — hard to beat.',
    tip: 'Dressing on the side keeps you in charge of the sodium.',
    confidence: 'high', used_label: false,
  },
  {
    is_food: true, name: 'Chicken burrito bowl',
    description: 'Rice bowl with chicken, black beans, corn salsa and guacamole',
    calories: 650, protein_g: 42, carbs_g: 68, fat_g: 22, fiber_g: 14, sugar_g: 5, sodium_mg: 980,
    health_score: 7, health_summary: 'Great protein and fiber; the sodium is the only heavy hand.',
    tip: 'Skipping half the rice keeps all the flavor and trims the load.',
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
