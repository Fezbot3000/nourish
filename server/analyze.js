import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-opus-4-8'

// The client resolves credentials from ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN /
// an `ant auth login` profile — but only at request time. Probe once at startup
// with a token-count call (free) so the reported mode is accurate; without
// working credentials the app runs in demo mode end-to-end.
let client = null
try {
  client = new Anthropic()
} catch {
  client = null
}

let mode = 'demo'
export const ready = (async () => {
  if (!client) return
  try {
    await client.messages.countTokens({ model: MODEL, messages: [{ role: 'user', content: 'ping' }] })
    mode = 'live'
  } catch (err) {
    console.warn(`Anthropic credentials unavailable (${err?.message ?? err}) — running in demo mode.`)
    client = null
  }
})()

export function apiMode() {
  return mode
}

const NUMERIC_FIELDS = ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg']

const SCHEMA = {
  type: 'object',
  properties: {
    is_food: { type: 'boolean', description: 'False if no food or drink is visible in the meal photo' },
    name: { type: 'string', description: 'Short name for the meal, five words max' },
    description: { type: 'string', description: 'One line describing what is visible, twelve words max' },
    calories: { type: 'integer', description: 'Estimated calories for the visible portion' },
    protein_g: { type: 'number' },
    carbs_g: { type: 'number' },
    fat_g: { type: 'number' },
    fiber_g: { type: 'number' },
    sugar_g: { type: 'number' },
    sodium_mg: { type: 'number' },
    health_score: {
      type: 'integer',
      description: '0 to 10. 10 = nutrient-dense whole food, 0 = ultra-processed with little nutritional value',
    },
    health_summary: { type: 'string', description: 'One-sentence verdict in the accountability-coach voice: proud at 8+, unimpressed at 4-7, guilt-laying at 3 and below' },
    tip: { type: 'string', description: 'One short, blunt command for next time. Specific to this meal.' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    used_label: { type: 'boolean', description: 'True if a nutrition label photo informed the numbers' },
  },
  required: [
    'is_food', 'name', 'description', 'calories', 'protein_g', 'carbs_g', 'fat_g',
    'fiber_g', 'sugar_g', 'sodium_mg', 'health_score', 'health_summary', 'tip',
    'confidence', 'used_label',
  ],
  additionalProperties: false,
}

const SYSTEM = `You are the nutrition engine inside "Nourish", a photo-first food journal built for a single user who has explicitly asked for zero-sugarcoating accountability. They snap a photo of what they are about to eat — sometimes with a second photo of the package's nutrition label — and you estimate what it is, what's in it, and deliver the verdict they signed up for.

Rules:
- The first image is always the meal. If a second image is provided, it is a nutrition label: read it carefully and scale its per-serving values to the portion actually visible in the meal photo, then set used_label to true.
- Estimate for the whole visible serving the user is about to eat, not a reference serving size.
- health_score: 10 means nutrient-dense whole food; 0 means ultra-processed with little nutritional value. Weigh processing level, vegetables and fiber, protein quality, added sugar, sodium, and portion size.

Voice — accountability coach, calibrated by score:
- 8–10: celebrate hard and make the pride land. This is what discipline looks like — say so plainly, name what they got right.
- 4–7: unimpressed honesty. Name exactly what drags the score down. No cushioning, no "but hey".
- 0–3: disappointment and guilt, laid on thick. Call the decision what it is, cite its ugliest numbers, and if their goal is provided, hold the meal up against it ("you said you were losing weight — explain this"). The sting must come from being precisely right about THIS meal, not from generic insults.
- Aim everything at the food and the decision, never at their body or their worth. The shame is "you chose this", never "you are this".
- tip is a short command for next time, not a gentle suggestion.
- A short user-context note (their goal, daily calorie target) may accompany the request — use it openly as ammunition in the verdict and the tip.
- If no food or drink is visible, set is_food to false, use a playful description of what you do see, and set all numeric fields to 0.`

const GOAL_PHRASES = {
  lose: 'gently lose weight',
  maintain: 'maintain their weight',
  gain: 'build up',
}

function clampAnalysis(a) {
  a.health_score = Math.max(0, Math.min(10, Math.round(Number(a.health_score) || 0)))
  for (const key of NUMERIC_FIELDS) {
    a[key] = Math.max(0, Math.round((Number(a[key]) || 0) * 10) / 10)
  }
  return a
}

async function analyzeWithClaude({ meal, label, query, context }) {
  const content = []
  if (meal?.data) {
    content.push({ type: 'image', source: { type: 'base64', media_type: meal.media_type, data: meal.data } })
  }
  if (label?.data) {
    content.push({ type: 'image', source: { type: 'base64', media_type: label.media_type, data: label.data } })
  }
  let prompt
  if (meal?.data) {
    prompt = label?.data
      ? 'Analyze this meal. The second photo is its nutrition label — use it, scaled to the visible portion.'
      : 'Analyze this meal photo.'
  } else {
    prompt = `The user is wondering about a food they have not photographed. Their description: "${String(query).slice(0, 200)}". Estimate nutrition for a typical serving of what they describe.`
  }
  if (GOAL_PHRASES[context?.goal]) {
    prompt += ` User context: they're aiming to ${GOAL_PHRASES[context.goal]}${
      context.calorie_target ? ` on roughly ${context.calorie_target} kcal a day` : ''
    }.`
  }
  content.push({ type: 'text', text: prompt })

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content }],
  })

  if (response.stop_reason === 'refusal') {
    throw new Error('The analysis was declined. Try a different photo.')
  }
  const text = response.content.find((block) => block.type === 'text')?.text
  if (!text) throw new Error('No analysis returned')
  return clampAnalysis(JSON.parse(text))
}

// ---------------------------------------------------------------------------
// Demo mode — realistic sample analyses so the app works before a key is added
// ---------------------------------------------------------------------------

const DEMO_MEALS = [
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
    is_food: true, name: 'Pepperoni pizza slice',
    description: 'Large slice of pepperoni pizza with a thick crust',
    calories: 340, protein_g: 14, carbs_g: 36, fat_g: 15, fiber_g: 2, sugar_g: 4, sodium_mg: 760,
    health_score: 4, health_summary: 'Tasty, but refined flour and cured meat keep the score modest.',
    tip: 'Pair it with something green and this slice becomes part of a decent meal.',
    confidence: 'medium', used_label: false,
  },
  {
    is_food: true, name: 'Salmon with roast veg',
    description: 'Baked salmon fillet with roasted broccoli and sweet potato',
    calories: 520, protein_g: 36, carbs_g: 34, fat_g: 24, fiber_g: 7, sugar_g: 9, sodium_mg: 310,
    health_score: 10, health_summary: 'Omega-3s, fiber and colorful veg — this is the gold standard.',
    tip: 'Nothing to fix here. Maybe teach this plate to your other meals.',
    confidence: 'high', used_label: false,
  },
  {
    is_food: true, name: 'Chocolate croissant',
    description: 'Flaky chocolate croissant, bakery sized',
    calories: 410, protein_g: 7, carbs_g: 44, fat_g: 23, fiber_g: 2, sugar_g: 19, sodium_mg: 230,
    health_score: 3, health_summary: 'A joyful treat, though butter and sugar are doing most of the work.',
    tip: 'Enjoy it slowly — and let the next meal bring the fiber.',
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

let demoCursor = 0
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function demoAnalysis({ label }) {
  await sleep(1600 + Math.random() * 900)
  const sample = { ...DEMO_MEALS[demoCursor % DEMO_MEALS.length] }
  demoCursor += 1
  if (label?.data) sample.used_label = true
  return sample
}

// ---------------------------------------------------------------------------

export async function analyzeMeal({ meal, label, query, context }) {
  await ready
  if (!client) {
    return { ...(await demoAnalysis({ label })), demo: true }
  }
  try {
    return { ...(await analyzeWithClaude({ meal, label, query, context })), demo: false }
  } catch (err) {
    // Credentials rejected mid-flight — fall back to demo instead of a dead app.
    if (err instanceof Anthropic.AuthenticationError || /authentication|api.?key/i.test(err?.message ?? '')) {
      console.warn('Anthropic auth failed — falling back to demo mode:', err.message)
      client = null
      mode = 'demo'
      return { ...(await demoAnalysis({ label })), demo: true }
    }
    throw err
  }
}
