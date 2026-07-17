export default function WaterCard({ count, goal, onChange }) {
  return (
    <section className="card water-card rise">
      <header className="card-head">
        <h2>Hydration</h2>
        <span className="card-meta">
          {count} / {goal} glasses
        </span>
      </header>
      <div className="glasses" role="group" aria-label="Water glasses">
        {Array.from({ length: goal }).map((_, i) => (
          <button
            key={i}
            className={`glass ${i < count ? 'full' : ''}`}
            aria-label={`Set water to ${i + 1 === count ? i : i + 1} glasses`}
            aria-pressed={i < count}
            onClick={() => onChange(i + 1 === count ? i : i + 1)}
          >
            <span className="glass-fill" />
          </button>
        ))}
      </div>
      <div className="water-actions">
        <button className="pill-btn" onClick={() => onChange(Math.max(0, count - 1))} aria-label="Remove a glass">
          −
        </button>
        <button className="pill-btn primary" onClick={() => onChange(count + 1)}>
          + Add a glass
        </button>
      </div>
    </section>
  )
}
