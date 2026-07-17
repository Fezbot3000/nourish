import { useEffect, useRef, useState } from 'react'

export default function ScoreRing({ score, word, size = 190 }) {
  const [display, setDisplay] = useState(score)
  const prev = useRef(score)

  useEffect(() => {
    const from = prev.current
    prev.current = score
    if (from === score) return
    const start = performance.now()
    const duration = 900
    let raf
    const tick = (t) => {
      const p = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(from + (score - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [score])

  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.min(score, 100) / 100)

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Day score ${score} of 100`}>
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--green-deep)" />
            <stop offset="55%" stopColor="var(--green)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-progress"
          strokeWidth={stroke}
          stroke="url(#ringGrad)"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">
        <div className="ring-number">{display}</div>
        <div className="ring-max">of 100</div>
        <div className="ring-word">{word}</div>
      </div>
    </div>
  )
}
