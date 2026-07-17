import { useState } from 'react'
import { getDay, todayKey, shiftKey } from '../lib/store.js'
import { dayScore, streakCount } from '../lib/score.js'
import MealList from './MealList.jsx'

function weekdayLetter(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, { weekday: 'narrow' })
}

function prettyDate(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function Journal({ data }) {
  const today = todayKey()
  const [selected, setSelected] = useState(today)
  const keys = Array.from({ length: 7 }, (_, i) => shiftKey(today, i - 6))
  const entries = keys.map((k) => ({ key: k, score: dayScore(data, k), day: getDay(data, k) }))
  const streak = streakCount(data)
  const sel = entries.find((e) => e.key === selected)
  const selHasActivity = sel.day.meals.length > 0 || sel.day.water > 0

  return (
    <div className="journal">
      <section className="card rise">
        <header className="card-head">
          <h2>Your week</h2>
          {streak > 0 && <span className="streak-chip">🔥 {streak}-day streak</span>}
        </header>
        <div className="week-chart" role="group" aria-label="Day scores for the last 7 days">
          {entries.map(({ key, score, day }) => {
            const active = day.meals.length > 0 || day.water > 0
            return (
              <button
                key={key}
                className={`week-col ${key === selected ? 'selected' : ''} ${key === today ? 'is-today' : ''}`}
                onClick={() => setSelected(key)}
                aria-label={`${prettyDate(key)}, score ${active ? score.total : 'none'}`}
              >
                <span className="week-val">{active ? score.total : '·'}</span>
                <span className="week-bar">
                  <span className="week-fill" style={{ height: `${Math.max(active ? score.total : 0, 3)}%` }} />
                </span>
                <span className="week-day">{weekdayLetter(key)}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="card rise day-detail">
        <header className="card-head">
          <h2>{sel.key === today ? 'Today' : prettyDate(sel.key)}</h2>
          {selHasActivity && <span className="card-meta">score {sel.score.total}</span>}
        </header>
        {selHasActivity ? (
          <>
            <div className="detail-pills">
              <span className="chip">🥗 {sel.score.nourish}/50</span>
              <span className="chip">💧 {sel.score.hydrate}/25 · {sel.day.water} glasses</span>
              <span className="chip">⏱️ {sel.score.rhythm}/25{sel.score.rhythmLabel ? ` · ${sel.score.rhythmLabel}` : ''}</span>
            </div>
            <MealList meals={sel.day.meals} readOnly />
          </>
        ) : (
          <p className="empty-note">Nothing logged this day.</p>
        )}
      </section>
    </div>
  )
}
