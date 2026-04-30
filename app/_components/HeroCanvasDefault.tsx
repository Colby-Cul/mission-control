'use client'
/**
 * HeroCanvasDefault — the standard financial-network canvas animation.
 * Described in DASHBOARD-TEMPLATE-SPEC §1:
 *   7 nodes (entities), 80 particles along connections,
 *   40 floating currency symbols, 60px grid overlay.
 *
 * Pages can pass a custom animationSlot to <Hero> to override this.
 */
import { useEffect, useRef } from 'react'

export default function HeroCanvasDefault() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId: number
    let W = 0, H = 0

    function resize() {
      const parent = canvas!.parentElement
      if (!parent) return
      W = parent.offsetWidth
      H = parent.offsetHeight
      canvas!.width = W
      canvas!.height = H
    }
    resize()

    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    // Nodes
    const NODES = Array.from({ length: 7 }, (_, i) => ({
      x: 0.15 + (i / 6) * 0.7,
      y: 0.25 + Math.sin((i / 6) * Math.PI) * 0.5,
      r: 5 + (i % 3) * 2,
      label: ['$', '₿', '€', '¥', '£', '%', '◆'][i],
      color: ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#84cc16'][i],
    }))

    // Connections (pairs)
    const EDGES: [number, number][] = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[0,3],[1,4],[2,5],[3,6]]

    // Particles
    type Particle = { edge: number; t: number; speed: number; alpha: number }
    const particles: Particle[] = Array.from({ length: 80 }, () => ({
      edge: Math.floor(Math.random() * EDGES.length),
      t: Math.random(),
      speed: 0.002 + Math.random() * 0.003,
      alpha: 0.4 + Math.random() * 0.5,
    }))

    // Floating symbols
    const SYMBOLS = ['$', '₿', '€', '¥', '£', '%', '↗', '◆']
    type FloatSym = { x: number; y: number; sym: string; vy: number; alpha: number; size: number }
    const floats: FloatSym[] = Array.from({ length: 40 }, () => ({
      x: Math.random(),
      y: Math.random(),
      sym: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      vy: 0.0002 + Math.random() * 0.0003,
      alpha: 0.06 + Math.random() * 0.1,
      size: 10 + Math.random() * 10,
    }))

    function draw(ts: number) {
      if (!ctx || W === 0) return
      ctx.clearRect(0, 0, W, H)

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.025)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let y = 0; y < H; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      // Edges
      for (const [a, b] of EDGES) {
        const na = NODES[a], nb = NODES[b]
        const x1 = na.x * W, y1 = na.y * H, x2 = nb.x * W, y2 = nb.y * H
        const grad = ctx.createLinearGradient(x1, y1, x2, y2)
        grad.addColorStop(0, na.color + '40')
        grad.addColorStop(1, nb.color + '40')
        ctx.strokeStyle = grad
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
      }

      // Particles
      for (const p of particles) {
        p.t += p.speed
        if (p.t > 1) p.t = 0
        const [a, b] = EDGES[p.edge]
        const na = NODES[a], nb = NODES[b]
        const px = (na.x + (nb.x - na.x) * p.t) * W
        const py = (na.y + (nb.y - na.y) * p.t) * H
        const col1 = na.color, col2 = nb.color
        // interpolate color (simple — use midpoint)
        ctx.fillStyle = p.t < 0.5 ? col1 + 'cc' : col2 + 'cc'
        ctx.globalAlpha = p.alpha
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1
      }

      // Nodes
      for (const n of NODES) {
        const nx = n.x * W, ny = n.y * H
        // Glow
        const grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r * 4)
        grd.addColorStop(0, n.color + '60')
        grd.addColorStop(1, n.color + '00')
        ctx.fillStyle = grd
        ctx.beginPath(); ctx.arc(nx, ny, n.r * 4, 0, Math.PI * 2); ctx.fill()
        // Core
        ctx.fillStyle = n.color
        ctx.beginPath(); ctx.arc(nx, ny, n.r, 0, Math.PI * 2); ctx.fill()
      }

      // Floating symbols
      ctx.font = '13px IBM Plex Mono, monospace'
      for (const f of floats) {
        f.y -= f.vy
        if (f.y < -0.05) f.y = 1.05
        ctx.globalAlpha = f.alpha
        ctx.fillStyle = '#3b82f6'
        ctx.font = `${f.size}px IBM Plex Mono, monospace`
        ctx.fillText(f.sym, f.x * W, f.y * H)
      }
      ctx.globalAlpha = 1

      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      id="heroCanvas"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      aria-hidden="true"
    />
  )
}
