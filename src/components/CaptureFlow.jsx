import { useEffect, useRef, useState } from 'react'
import { processImage } from '../lib/image.js'
import { calorieTarget } from '../lib/profile.js'
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

export default function CaptureFlow({ open, onClose, onLogged, profile }) {
  const [step, setStep] = useState('meal')
  const [mealImg, setMealImg] = useState(null)
  const [labelImg, setLabelImg] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const [quip, setQuip] = useState(0)
  const inputRef = useRef(null)
  const busy = useRef(false)

  useEffect(() => {
    if (open) {
      setStep('meal')
      setMealImg(null)
      setLabelImg(null)
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
        analyze(img)
      }
    } catch {
      setError('That photo could not be read — try another one.')
      setStep('error')
    } finally {
      busy.current = false
    }
  }

  async function analyze(label) {
    setStep('analyzing')
    setQuip(0)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal: { data: mealImg.base64, media_type: mealImg.mediaType },
          label: label ? { data: label.base64, media_type: label.mediaType } : null,
          context: profile
            ? { goal: profile.goal, calorie_target: calorieTarget(profile) }
            : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setAnalysis(data)
      setStep('result')
    } catch (err) {
      setError(err.message || 'Analysis failed — please try again.')
      setStep('error')
    }
  }

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
              <button className="pill-btn primary" onClick={() => analyze(null)}>
                Analyze →
              </button>
            </div>
            <button
              className="ghost-btn"
              onClick={() => {
                setMealImg(null)
                setStep('meal')
              }}
            >
              Retake meal photo
            </button>
          </div>
        )}

        {step === 'analyzing' && mealImg && (
          <div className="cap-step">
            <div className="scan-wrap">
              <img src={mealImg.dataUrl} className="cap-preview" alt="" />
              <span className="scan-line" aria-hidden="true" />
            </div>
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
                <button className="ghost-btn" onClick={() => setStep('meal')}>
                  Retake
                </button>
                <button
                  className="pill-btn primary grow"
                  onClick={() =>
                    onLogged({
                      id: crypto.randomUUID(),
                      time: new Date().toISOString(),
                      thumb: mealImg.thumb,
                      analysis,
                    })
                  }
                >
                  Log it ✓
                </button>
              </div>
            </div>
          ) : (
            <div className="cap-step">
              <p className="empty-note">Hmm — that doesn't look like food. {analysis.description}</p>
              <button className="pill-btn primary" onClick={() => setStep('meal')}>
                Try another photo
              </button>
            </div>
          ))}

        {step === 'error' && (
          <div className="cap-step">
            <p className="empty-note">{error}</p>
            <div className="cap-actions">
              {mealImg && (
                <button className="pill-btn primary" onClick={() => analyze(labelImg)}>
                  Try again
                </button>
              )}
              <button className="ghost-btn" onClick={() => setStep('meal')}>
                Start over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
