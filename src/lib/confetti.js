const COLORS = ['#2E7D4F', '#C9A227', '#3E7CB1', '#C96F4A', '#8FBF6F', '#E8D9A8']

/** A short, joyful confetti burst. Cleans up after itself. */
export function burst({ count = 90 } = {}) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  const canvas = document.createElement('canvas')
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: '999',
  })
  const dpr = window.devicePixelRatio || 1
  const W = window.innerWidth
  const H = window.innerHeight
  canvas.width = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const parts = Array.from({ length: count }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 90,
    y: H * 0.38,
    vx: (Math.random() - 0.5) * 9,
    vy: -(4 + Math.random() * 8),
    size: 4 + Math.random() * 5,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    color: COLORS[(Math.random() * COLORS.length) | 0],
  }))

  document.body.appendChild(canvas)
  const t0 = performance.now()

  function frame(t) {
    const life = (t - t0) / 1500
    ctx.clearRect(0, 0, W, H)
    for (const p of parts) {
      p.vy += 0.18
      p.x += p.vx
      p.y += p.vy
      p.rot += p.vr
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = Math.max(0, 1 - life)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      ctx.restore()
    }
    if (life < 1) requestAnimationFrame(frame)
    else canvas.remove()
  }
  requestAnimationFrame(frame)
}
