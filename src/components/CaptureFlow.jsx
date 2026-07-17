import { useEffect, useRef, useState } from 'react'
import { processImage } from '../lib/image.js'
import { calorieTarget } from '../lib/profile.js'
import { localDemoAnalysis } from '../lib/demo.js'
import { dayScore, macroTotals, currentFastHours } from '../lib/score.js'
import { todayKey, getDay } from '../lib/store.js'
import { ScorePill, MacroGrid } from './MealList.jsx'

const QUIPS = [
  'Sizing up your plate…',
  'Counting the colors…',
  'Weighing the macros…',
  'Consulting a friendly nutritionist…',
  'Reading between the bites…',
]

const TITLES = {
  meal: "What's on the menu?",
  label: 'Add the label?',
  analyzing: 'Reading your plate',
  result: "Here's the story",
  error: 'Hit a snag',
}

function verdictFor(score) {
  if (score >= 8) return { label: 'Green light', emoji: '🌿', tone: 'good', line: 'Your body will high-five you.' }
  if (score >= 5) return { label: 'Fair game', emoji: '⚖️', tone: 'mid', line: 'Solid middle ground — enjoy it.' }
  if (score >= 3) return { label: 'Think twice', emoji: '🌶️', tone: 'mid', line: 'Fine now and then — balance the rest of today.' }
  return { label: 'Treat territory', emoji: '🍩', tone: 'low', line: 'Enjoy it rarely, enjoy it fully.' }
}

/** What logging this meal right now would do to today. */
function computeImpact(all, analysis, profile) {
  const key = todayKey()
  const before = dayScore(all, key).total
  const hypo = structuredClone(all)
  const day = (hypo.days[key] ??= { meals: [], water: 0 })
  day.meals.push({ id: 'hypothetical', time: new Date().toISOString(), analysis })
  const after = dayScore(hypo, key).total

  const target = calorieTarget(profile)
  const eaten = macroTotals(getDay(all, key)).calories
  const remaining = target ? Math.round(target - eaten) : null
  const fast = currentFastHours(all)

  return { before, after, delta: after - before, target, remaining, fast }
}

function ImpactCard({ impact, analysis }) {
  const v = verdictFor(analysis.health_score)
  const cal = Math.round(analysis.calories)
  return (
    <div className="impact">
      <div className={`verdict tone-${v.tone}`}>
        <span className="verdict-emoji" aria-hidden="true">{v.emoji}</span>
        <span>
          <strong>{v.label}</strong>
          <em>{v.line}</em>
        </span>
      </div>
      <p className="impact-title">If you eat this…</p>
      <ul className="impact-rows">
        <li>
          <span>Day score</span>
          <span className="impact-val">
            {impact.before} → {impact.after}
            <em className={`delta ${impact.delta >= 0 ? 'up' : 'down'}`}>
              {impact.delta >= 0 ? '+' : ''}{impact.delta}
            </em>
          </span>
        </li>
        <li>
          <span>Calories</span>
          <span className="impact-val">
            {impact.remaining == null
              ? `adds ${cal} kcal to today`
              : cal <= impact.remaining
                ? `uses ${cal} of the ${impact.remaining.toLocaleString()} kcal left`
                : `~${(cal - impact.remaining).toLocaleString()} kcal past today's canvas`}
          </span>
        </li>
        {impact.fast != null && impact.fast >= 3 && (
          <li>
            <span>Fasting</span>
            <span className="impact-val">ends a {Math.floor(impact.fast)}h fast</span>
          </li>
        )}
      </ul>
    </div>
  )
}

export default function CaptureFlow({ open, onClose, onLogged, onPass, profile, data }) {
  const [step, setStep] = useState('meal')
  const [mealImg, setMealImg] = useState(null)
  const [labelImg, setLabelImg] = useState(null)
  const [queryDraft, setQueryDraft] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const [quip, setQuip] = useState(0)
  const inputRef = useRef(null)
  const busy = useRef(false)
  const lastRequest = useRef(null)

  useEffect(() => {
    if (open) {
      setStep('meal')
      setMealImg(null)
      setLabelImg(null)
      setQueryDraft('')
      setAnalysis(null)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (step !== 'analyzing') return
    const id = setInterval(() => setQuip((q) => q + 1), 1900)
    return () => clearInterval(id)
  }, [step])

  if (!open) return null

  function restart() {
    setMealImg(null)
    setLabelImg(null)
    setQueryDraft('')
    setAnalysis(null)
    setStep('meal')
  }

  async function onPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || busy.current) return
    busy.current = true
    try {
      const img = await processImage(file)
      if (step === 'meal') {
        setMealImg(img)
        setStep('label')
      } else {
        setLabelImg(img)
        analyze({ meal: img === null ? null : undefined, label: img })
      }
    } catch {
      setError('That photo could not be read — try another one.')
      setStep('error')
    } finally {
      busy.current = false
    }
  }

  async function analyze({ label = null, query = null, meal = mealImg } = {}) {
    setStep('analyzing')
    setQuip(0)
    lastRequest.current = { label, query, meal }
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal: meal ? { data: meal.base64, media_type: meal.mediaType } : null,
          label: label ? { data: label.base64, media_type: label.mediaType } : null,
          query: query || null,
          context: profile ? { goal: profile.goal, calorie_target: calorieTarget(profile) } : null,
        }),
      })
      // No analysis backend deployed (static hosting) → graceful demo fallback.
      if (res.status === 404) {
        setAnalysis(await localDemoAnalysis({ usedLabel: !!label }))
        setStep('result')
        return
      }
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Analysis failed')
      setAnalysis(body)
      setStep('result')
    } catch (err) {
      if (err instanceof TypeError) {
        // Network unreachable — still let the flow complete in demo mode.
        setAnalysis(await localDemoAnalysis({ usedLabel: !!label }))
        setStep('result')
        return
      }
      setError(err.message || 'Analysis failed — please try again.')
      setStep('error')
    }
  }

  const impact = step === 'result' && analysis?.is_food && data ? computeImpact(data, analysis, profile) : null

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={TITLES[step]}>
        <header className="sheet-head">
          <h2>{TITLES[step]}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />

        {step === 'meal' && (
          <div className="cap-step">
            <button className="capture-zone" onClick={() => inputRef.current.click()}>
              <span className="capture-icon" aria-hidden="true">
                📷
              </span>
              <span className="capture-title">Snap what you're eating</span>
              <span className="capture-sub">take a photo or choose from your library</span>
            </button>
            <div className="or-divider">
              <span>or just wondering?</span>
            </div>
            <form
              className="query-row"
              onSubmit={(e) => {
                e.preventDefault()
                const q = queryDraft.trim()
                if (q) analyze({ query: q, meal: null })
              }}
            >
              <input
                className="ob-input query-input"
                value={queryDraft}
                onChange={(e) => setQueryDraft(e.target.value.slice(0, 160))}
                placeholder='Describe it — "two slices of pepperoni pizza"'
                aria-label="Describe a food to check"
              />
              <button className="pill-btn primary" type="submit" disabled={!queryDraft.trim()}>
                Check it
              </button>
            </form>
            <p className="cap-hint subtle">Checking doesn't log anything — see what it would do to your day first.</p>
          </div>
        )}

        {step === 'label' && mealImg && (
          <div className="cap-step">
            <img src={mealImg.dataUrl} className="cap-preview" alt="Your meal" />
            <p className="cap-hint">Packaged food? A photo of the nutrition label makes the numbers sharper.</p>
            <div className="cap-actions">
              <button className="pill-btn" onClick={() => inputRef.current.click()}>
                🏷️ Snap the label
              </button>
              <button className="pill-btn primary" onClick={() => analyze({})}>
                Analyze →
              </button>
            </div>
            <button className="ghost-btn" onClick={restart}>
              Retake meal photo
            </button>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="cap-step">
            {mealImg ? (
              <div className="scan-wrap">
                <img src={mealImg.dataUrl} className="cap-preview" alt="" />
                <span className="scan-line" aria-hidden="true" />
              </div>
            ) : (
              <div className="scan-wrap scan-text">
                <span className="crystal" aria-hidden="true">
                  🔮
                </span>
                <span className="scan-line" aria-hidden="true" />
              </div>
            )}
            <p className="quip" key={quip}>
              {QUIPS[quip % QUIPS.length]}
            </p>
          </div>
        )}

        {step === 'result' &&
          analysis &&
          (analysis.is_food ? (
            <div className="cap-step">
              <div className="result-card">
                <div className="result-head">
                  <div>
                    <h3 className="result-name">{analysis.name}</h3>
                    <p className="result-desc">{analysis.description}</p>
                  </div>
                  <ScorePill n={analysis.health_score} />
                </div>
                <div className="result-kcal">
                  <strong>{Math.round(analysis.calories)}</strong> kcal
                </div>
                {impact && <ImpactCard impact={impact} analysis={analysis} />}
                <MacroGrid a={analysis} />
                <p className="meal-summary">{analysis.health_summary}</p>
                <p className="meal-tip">💡 {analysis.tip}</p>
                <div className="result-badges">
                  <span className="chip">confidence · {analysis.confidence}</span>
                  {analysis.used_label && <span className="chip chip-on">label read 🏷️</span>}
                  {analysis.demo && <span className="chip chip-demo">demo estimate</span>}
                </div>
              </div>
              <div className="cap-actions">
                <button className="ghost-btn" onClick={onPass}>
                  I'll pass
                </button>
                <button
                  className="pill-btn primary grow"
                  onClick={() =>
                    onLogged({
                      id: crypto.randomUUID(),
                      time: new Date().toISOString(),
                      thumb: mealImg?.thumb ?? null,
                      analysis,
                    })
                  }
                >
                  I'm eating it — log ✓
                </button>
              </div>
            </div>
          ) : (
            <div className="cap-step">
              <p className="empty-note">Hmm — that doesn't look like food. {analysis.description}</p>
              <button className="pill-btn primary" onClick={restart}>
                Try again
              </button>
            </div>
          ))}

        {step === 'error' && (
          <div className="cap-step">
            <p className="empty-note">{error}</p>
            <div className="cap-actions">
              {lastRequest.current && (
                <button className="pill-btn primary" onClick={() => analyze(lastRequest.current)}>
                  Try again
                </button>
              )}
              <button className="ghost-btn" onClick={restart}>
                Start over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
