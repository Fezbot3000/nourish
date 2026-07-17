import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeMeal, apiMode, ready } from './analyze.js'

const app = express()
app.use(express.json({ limit: '25mb' }))

app.get('/api/health', (req, res) => {
  res.json({ mode: apiMode() })
})

app.post('/api/analyze', async (req, res) => {
  try {
    const { meal, label, query, context } = req.body ?? {}
    const hasPhoto = meal?.data && meal?.media_type
    const hasQuery = typeof query === 'string' && query.trim().length > 0
    if (!hasPhoto && !hasQuery) {
      return res.status(400).json({ error: 'A meal photo or a description is required.' })
    }
    const result = await analyzeMeal({ meal: hasPhoto ? meal : null, label, query: hasQuery ? query.trim() : null, context })
    res.json(result)
  } catch (err) {
    console.error('analyze failed:', err)
    res.status(500).json({ error: 'The analysis kitchen hit a snag — please try again.' })
  }
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.use((req, res) => res.sendFile(path.join(dist, 'index.html')))
}

// In dev, PORT may be set by tooling for the frontend — only honor it in production.
const port = process.env.API_PORT || (process.env.NODE_ENV === 'production' && process.env.PORT) || 3001
await ready
app.listen(port, () => {
  console.log(`Nourish API listening on :${port} (${apiMode()} mode)`)
})
