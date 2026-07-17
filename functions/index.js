import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { analyzeMeal, apiMode } from './analyze.js'

const anthropicKey = defineSecret('ANTHROPIC_API_KEY')

// Served behind Firebase Hosting rewrites: /api/** → this function.
export const api = onRequest(
  {
    region: 'us-central1',
    secrets: [anthropicKey],
    memory: '512MiB',
    timeoutSeconds: 180,
    maxInstances: 5,
  },
  async (req, res) => {
    const path = req.path || ''
    if (req.method === 'GET' && path.endsWith('/health')) {
      return res.json({ mode: apiMode() })
    }
    if (req.method === 'POST' && path.endsWith('/analyze')) {
      try {
        const { meal, label, context } = req.body ?? {}
        if (!meal?.data || !meal?.media_type) {
          return res.status(400).json({ error: 'A meal photo is required.' })
        }
        const result = await analyzeMeal({ meal, label, context })
        return res.json(result)
      } catch (err) {
        console.error('analyze failed:', err)
        return res.status(500).json({ error: 'The analysis kitchen hit a snag — please try again.' })
      }
    }
    res.status(404).json({ error: 'Not found' })
  },
)
