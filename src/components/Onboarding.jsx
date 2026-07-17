import { useState } from 'react'
import {
  calorieTarget,
  suggestedWaterGoal,
  cmFromFtIn,
  ftInFromCm,
  kgFromLb,
  lbFromKg,
} from '../lib/profile.js'

const SEXES = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'unspecified', label: 'Prefer not to say' },
]

const GOALS = [
  { id: 'lose', title: 'Ease down', sub: 'A gentle calorie deficit' },
  { id: 'maintain', title: 'Hold steady', sub: 'Keep things right where they are' },
  { id: 'gain', title: 'Build up', sub: 'A modest surplus for growth' },
]

const ACTIVITIES = [
  { id: 'sedentary', title: 'Mostly seated', sub: 'Desk days, light walking' },
  { id: 'light', title: 'Lightly active', sub: 'On your feet a fair bit' },
  { id: 'moderate', title: 'Active', sub: 'Exercise most days' },
  { id: 'active', title: 'Very active', sub: 'Hard training or physical work' },
]

const num = (v) => (v === '' || v == null ? null : Number(v))
const digits = (setter, max = 5) => (e) => setter(e.target.value.replace(/[^\d.]/g, '').slice(0, max))

export default function Onboarding({ initial, isEdit, onComplete, onDismiss }) {
  const startStep = isEdit ? 1 : 0
  const [step, setStep] = useState(startStep)

  const guessImperial = /^en-(US|LR|MM)/i.test(navigator.language || '')
  const [units, setUnitsState] = useState(initial?.units ?? (guessImperial ? 'imperial' : 'metric'))
  const [name, setName] = useState(initial?.name ?? '')
  const [sex, setSex] = useState(initial?.sex ?? null)
  const [age, setAge] = useState(initial?.age ?? '')
  const initFtIn = initial?.heightCm ? ftInFromCm(initial.heightCm) : { ft: '', inch: '' }
  const [hCm, setHCm] = useState(initial?.heightCm ?? '')
  const [hFt, setHFt] = useState(initFtIn.ft)
  const [hIn, setHIn] = useState(initFtIn.inch)
  const [wKg, setWKg] = useState(initial?.weightKg ?? '')
  const [wLb, setWLb] = useState(initial?.weightKg ? lbFromKg(initial.weightKg) : '')
  const [goal, setGoal] = useState(initial?.goal ?? 'maintain')
  const [activity, setActivity] = useState(initial?.activity ?? 'light')

  function setUnits(u) {
    if (u === units) return
    if (u === 'imperial') {
      if (num(hCm)) {
        const fi = ftInFromCm(num(hCm))
        setHFt(fi.ft)
        setHIn(fi.inch)
      }
      if (num(wKg)) setWLb(lbFromKg(num(wKg)))
    } else {
      if (num(hFt) != null || num(hIn) != null) setHCm(cmFromFtIn(num(hFt) || 0, num(hIn) || 0) || '')
      if (num(wLb)) setWKg(kgFromLb(num(wLb)))
    }
    setUnitsState(u)
  }

  const heightCm =
    units === 'metric'
      ? num(hCm)
      : num(hFt) != null || num(hIn) != null
        ? cmFromFtIn(num(hFt) || 0, num(hIn) || 0)
        : null
  const weightKg = units === 'metric' ? num(wKg) : num(wLb) ? kgFromLb(num(wLb)) : null

  const profile = {
    name: name.trim(),
    sex: sex ?? 'unspecified',
    age: num(age),
    heightCm,
    weightKg,
    activity,
    goal,
    units,
  }
  const target = calorieTarget(profile)
  const water = suggestedWaterGoal(profile)
  const firstName = profile.name.split(' ')[0]

  const valid = {
    1: profile.name.length > 0,
    2: sex != null && profile.age >= 10 && profile.age <= 105,
    3: heightCm >= 90 && heightCm <= 250 && weightKg >= 30 && weightKg <= 350,
    4: !!goal,
    5: !!activity,
  }

  const next = () => setStep((s) => s + 1)
  const back = () => setStep((s) => Math.max(startStep, s - 1))

  function submit(e) {
    e.preventDefault()
    if (step >= 1 && step <= 5 && !valid[step]) return
    if (step === 6) onComplete(profile)
    else next()
  }

  const KICKERS = {
    1: 'First things first',
    2: 'A little about you',
    3: 'Your frame',
    4: 'The direction',
    5: 'Your days',
  }

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-label="Set up Nourish">
      <div className="ob-top">
        {step > startStep && step <= 5 ? (
          <button className="icon-btn" onClick={back} aria-label="Back">
            ‹
          </button>
        ) : (
          <span className="ob-top-spacer" />
        )}
        {step >= 1 && step <= 5 && (
          <div className="ob-dots" aria-label={`Step ${step} of 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={`ob-dot ${i <= step ? 'on' : ''}`} />
            ))}
          </div>
        )}
        {isEdit ? (
          <button className="icon-btn" onClick={onDismiss} aria-label="Close">
            ✕
          </button>
        ) : (
          <span className="ob-top-spacer" />
        )}
      </div>

      <form className="ob-body" onSubmit={submit} key={step}>
        {step === 0 && (
          <>
            <span className="ob-emoji" aria-hidden="true">
              🥗
            </span>
            <h1 className="ob-title">Welcome to Nourish</h1>
            <p className="ob-sub">
              Eating well, minus the accounting. Snap your food, and the rest takes care of itself. Two minutes of
              setup makes it yours.
            </p>
            <div className="ob-actions">
              <button type="submit" className="ob-continue">
                Set me up
              </button>
              <button type="button" className="ghost-btn" onClick={onDismiss}>
                Skip for now
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="ob-kicker">{KICKERS[1]}</p>
            <h1 className="ob-title">What should we call you?</h1>
            <div className="ob-fields">
              <input
                className="ob-input"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 30))}
                placeholder="Your name"
                aria-label="Your name"
                autoFocus
              />
            </div>
            <div className="ob-actions">
              <button type="submit" className="ob-continue" disabled={!valid[1]}>
                Continue
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="ob-kicker">{KICKERS[2]}</p>
            <h1 className="ob-title">A little about you</h1>
            <p className="ob-sub">This shapes your daily calorie canvas — nothing leaves your device.</p>
            <div className="ob-fields">
              <div className="ob-row">
                {SEXES.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className={`choice slim ${sex === s.id ? 'on' : ''}`}
                    onClick={() => setSex(s.id)}
                    aria-pressed={sex === s.id}
                  >
                    <span className="choice-title">{s.label}</span>
                  </button>
                ))}
              </div>
              <div className="ob-unit-row">
                <input
                  className="ob-input"
                  inputMode="numeric"
                  value={age}
                  onChange={digits(setAge, 3)}
                  placeholder="Age"
                  aria-label="Age in years"
                />
                <span className="ob-unit">years</span>
              </div>
            </div>
            <div className="ob-actions">
              <button type="submit" className="ob-continue" disabled={!valid[2]}>
                Continue
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="ob-kicker">{KICKERS[3]}</p>
            <h1 className="ob-title">Height &amp; weight</h1>
            <div className="ob-fields">
              <div className="seg" role="group" aria-label="Units">
                <button type="button" className={units === 'metric' ? 'on' : ''} onClick={() => setUnits('metric')}>
                  Metric
                </button>
                <button
                  type="button"
                  className={units === 'imperial' ? 'on' : ''}
                  onClick={() => setUnits('imperial')}
                >
                  Imperial
                </button>
              </div>
              {units === 'metric' ? (
                <div className="ob-unit-row">
                  <input
                    className="ob-input"
                    inputMode="numeric"
                    value={hCm}
                    onChange={digits(setHCm)}
                    placeholder="Height"
                    aria-label="Height in centimetres"
                  />
                  <span className="ob-unit">cm</span>
                </div>
              ) : (
                <div className="ob-row">
                  <div className="ob-unit-row">
                    <input
                      className="ob-input"
                      inputMode="numeric"
                      value={hFt}
                      onChange={digits(setHFt, 1)}
                      placeholder="Height"
                      aria-label="Height, feet"
                    />
                    <span className="ob-unit">ft</span>
                  </div>
                  <div className="ob-unit-row">
                    <input
                      className="ob-input"
                      inputMode="numeric"
                      value={hIn}
                      onChange={digits(setHIn, 2)}
                      placeholder="0"
                      aria-label="Height, inches"
                    />
                    <span className="ob-unit">in</span>
                  </div>
                </div>
              )}
              {units === 'metric' ? (
                <div className="ob-unit-row">
                  <input
                    className="ob-input"
                    inputMode="decimal"
                    value={wKg}
                    onChange={digits(setWKg)}
                    placeholder="Weight"
                    aria-label="Weight in kilograms"
                  />
                  <span className="ob-unit">kg</span>
                </div>
              ) : (
                <div className="ob-unit-row">
                  <input
                    className="ob-input"
                    inputMode="decimal"
                    value={wLb}
                    onChange={digits(setWLb)}
                    placeholder="Weight"
                    aria-label="Weight in pounds"
                  />
                  <span className="ob-unit">lb</span>
                </div>
              )}
            </div>
            <div className="ob-actions">
              <button type="submit" className="ob-continue" disabled={!valid[3]}>
                Continue
              </button>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <p className="ob-kicker">{KICKERS[4]}</p>
            <h1 className="ob-title">What are we aiming for?</h1>
            <div className="ob-fields">
              {GOALS.map((g) => (
                <button
                  type="button"
                  key={g.id}
                  className={`choice ${goal === g.id ? 'on' : ''}`}
                  onClick={() => setGoal(g.id)}
                  aria-pressed={goal === g.id}
                >
                  <span className="choice-title">{g.title}</span>
                  <span className="choice-sub">{g.sub}</span>
                </button>
              ))}
            </div>
            <div className="ob-actions">
              <button type="submit" className="ob-continue" disabled={!valid[4]}>
                Continue
              </button>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <p className="ob-kicker">{KICKERS[5]}</p>
            <h1 className="ob-title">How do your days move?</h1>
            <div className="ob-fields">
              {ACTIVITIES.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  className={`choice ${activity === a.id ? 'on' : ''}`}
                  onClick={() => setActivity(a.id)}
                  aria-pressed={activity === a.id}
                >
                  <span className="choice-title">{a.title}</span>
                  <span className="choice-sub">{a.sub}</span>
                </button>
              ))}
            </div>
            <div className="ob-actions">
              <button type="submit" className="ob-continue" disabled={!valid[5]}>
                Continue
              </button>
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <span className="ob-emoji" aria-hidden="true">
              ✨
            </span>
            <h1 className="ob-title">You're all set, {firstName}.</h1>
            <p className="ob-sub">Here's the daily canvas we'll paint on:</p>
            <div className="ob-summary">
              {target && (
                <div className="ob-sum-card">
                  <span aria-hidden="true">🔥</span>
                  <span>
                    <strong>~{target.toLocaleString()} kcal</strong> a day —{' '}
                    {goal === 'lose' ? 'a gentle glide down' : goal === 'gain' ? 'room to grow' : 'holding steady'}
                  </span>
                </div>
              )}
              <div className="ob-sum-card">
                <span aria-hidden="true">💧</span>
                <span>
                  <strong>{water} glasses</strong> of water suits your frame
                </span>
              </div>
              <div className="ob-sum-card">
                <span aria-hidden="true">⏱️</span>
                <span>
                  <strong>14h overnight rhythm</strong> is the sweet spot to aim for
                </span>
              </div>
            </div>
            <div className="ob-actions">
              <button type="submit" className="ob-continue">
                Let's eat well →
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
