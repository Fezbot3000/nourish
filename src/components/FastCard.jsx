import { useEffect, useState } from 'react'
import { currentFastHours } from '../lib/score.js'

const MILESTONES = [
  { h: 12, label: '12h reset' },
  { h: 14, label: '14h sweet spot' },
  { h: 16, label: '16h deep' },
]

export default function FastCard({ all }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const hours = currentFastHours(all)
  const h = hours != null ? Math.floor(hours) : 0
  const m = hours != null ? Math.floor((hours - h) * 60) : 0

  return (
    <section className="card fast-card rise">
      <header className="card-head">
        <h2>Fasting clock</h2>
        {hours != null && <span className="fast-dot" aria-hidden="true" />}
      </header>
      {hours == null ? (
        <p className="empty-note">Log your first meal and the clock starts ticking.</p>
      ) : (
        <>
          <div className="fast-time">{h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`}</div>
          <p className="fast-caption">since your last meal</p>
          <div className="milestones">
            {MILESTONES.map((ms) => (
              <span key={ms.h} className={`chip ${hours >= ms.h ? 'chip-on' : ''}`}>
                {ms.label}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
