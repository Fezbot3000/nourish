import { useState } from 'react'

export function ScorePill({ n }) {
  const tone = n >= 8 ? 'good' : n >= 5 ? 'mid' : 'low'
  return (
    <span className={`score-pill tone-${tone}`}>
      {n}
      <em>/10</em>
    </span>
  )
}

export function MacroGrid({ a }) {
  const cells = [
    ['Protein', a.protein_g, 'g'],
    ['Carbs', a.carbs_g, 'g'],
    ['Fat', a.fat_g, 'g'],
    ['Fiber', a.fiber_g, 'g'],
    ['Sugar', a.sugar_g, 'g'],
    ['Sodium', a.sodium_mg, 'mg'],
  ]
  return (
    <div className="macro-grid">
      {cells.map(([label, value, unit]) => (
        <div key={label} className="macro-cell">
          <span className="macro-cell-value">
            {Math.round(value)}
            <em>{unit}</em>
          </span>
          <span className="macro-cell-label">{label}</span>
        </div>
      ))}
    </div>
  )
}

const fmtTime = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export default function MealList({ meals, onDelete, readOnly = false }) {
  const [openId, setOpenId] = useState(null)

  if (!meals.length) {
    return (
      <div className="card empty-plate">
        <span className="empty-emoji" aria-hidden="true">
          🍽️
        </span>
        <p>Nothing logged yet — your plate awaits.</p>
        {!readOnly && <p className="empty-sub">Tap the camera below to capture your first bite.</p>}
      </div>
    )
  }

  const sorted = [...meals].sort((a, b) => new Date(b.time) - new Date(a.time))

  return (
    <ul className="meal-list">
      {sorted.map((meal) => {
        const a = meal.analysis
        const open = openId === meal.id
        return (
          <li key={meal.id} className={`card meal ${open ? 'open' : ''}`}>
            <button className="meal-row" onClick={() => setOpenId(open ? null : meal.id)} aria-expanded={open}>
              {meal.thumb ? (
                <img src={meal.thumb} alt="" className="meal-thumb" />
              ) : (
                <span className="meal-thumb meal-thumb-empty" aria-hidden="true">
                  🥣
                </span>
              )}
              <span className="meal-main">
                <span className="meal-name">{a.name}</span>
                <span className="meal-meta">
                  {fmtTime(meal.time)} · {Math.round(a.calories)} kcal
                  {a.demo ? ' · demo' : ''}
                </span>
              </span>
              <ScorePill n={a.health_score} />
            </button>
            {open && (
              <div className="meal-detail">
                <MacroGrid a={a} />
                <p className="meal-summary">{a.health_summary}</p>
                <p className="meal-tip">💡 {a.tip}</p>
                {!readOnly && (
                  <button className="ghost-btn danger" onClick={() => onDelete(meal.id)}>
                    Remove from today
                  </button>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
