'use client'
import { useEffect } from 'react'

interface Props {
  entityCount: number
  operationalCount: number
}

/**
 * Entity-mosaic hero animation for Companies Index.
 * Renders a grid of tiles — one per entity — pulsing at different rates.
 * Legal-only tiles render dimmed; operational tiles are bright.
 */
export default function CompaniesHeroCanvas({ entityCount, operationalCount }: Props) {
  useEffect(() => {
    const canvas = document.getElementById('mosaicCanvas') as HTMLCanvasElement | null
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    let rafId: number

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      canvas!.width  = rect.width  * dpr
      canvas!.height = rect.height * dpr
      ctx!.scale(dpr, dpr)
    }
    resize()

    const total = Math.max(entityCount, 6)
    const legalCount = total - operationalCount

    // Build tile definitions
    const COLORS = ['#f97316','#10b981','#8b5cf6','#f59e0b','#ec4899','#84cc16']
    const tiles = Array.from({ length: total }, (_, i) => ({
      legal:  i >= operationalCount,
      color:  COLORS[i % COLORS.length],
      phase:  Math.random() * Math.PI * 2,
      speed:  0.3 + Math.random() * 0.7,
    }))

    // Floating connection particles
    const particles = Array.from({ length: 30 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0004,
      vy: (Math.random() - 0.5) * 0.0004,
      r: Math.random() * 1.2,
    }))

    function draw(time: number) {
      const w = canvas!.width / dpr
      const h = canvas!.height / dpr
      ctx!.clearRect(0, 0, w, h)

      // Draw faint grid
      ctx!.strokeStyle = 'rgba(249,115,22,0.025)'
      ctx!.lineWidth = 0.5
      for (let x = 0; x < w; x += 60) { ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke() }
      for (let y = 0; y < h; y += 60) { ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke() }

      // Draw tiles in a grid (right half of canvas)
      const cols = Math.ceil(Math.sqrt(total * (w / h)))
      const rows = Math.ceil(total / cols)
      const tileW = (w * 0.55) / cols
      const tileH = (h * 0.7) / rows
      const tileSize = Math.min(tileW, tileH) * 0.75
      const offsetX = w * 0.4
      const offsetY = h * 0.15

      tiles.forEach((tile, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const cx = offsetX + col * (tileW) + tileW / 2
        const cy = offsetY + row * (tileH) + tileH / 2
        const t = time * 0.001
        const pulse = 0.5 + 0.5 * Math.sin(t * tile.speed + tile.phase)
        const alpha = tile.legal ? 0.08 + pulse * 0.06 : 0.12 + pulse * 0.18
        const glow  = tile.legal ? 0 : pulse * 0.15

        // Glow behind operational tiles
        if (!tile.legal && glow > 0.02) {
          const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, tileSize)
          grad.addColorStop(0, tile.color + Math.round(glow * 255).toString(16).padStart(2, '0'))
          grad.addColorStop(1, 'transparent')
          ctx!.fillStyle = grad
          ctx!.beginPath(); ctx!.arc(cx, cy, tileSize * 1.5, 0, Math.PI * 2); ctx!.fill()
        }

        // Tile rect
        const half = tileSize / 2
        ctx!.fillStyle = tile.color + Math.round(alpha * 255).toString(16).padStart(2, '0')
        ctx!.strokeStyle = tile.color + Math.round((alpha * 2) * 255).toString(16).padStart(2, '0')
        ctx!.lineWidth = 0.8
        ctx!.beginPath()
        ctx!.roundRect(cx - half, cy - half, tileSize, tileSize, 4)
        ctx!.fill()
        ctx!.stroke()

        // Pulse dot center for operational
        if (!tile.legal) {
          ctx!.fillStyle = tile.color + 'cc'
          ctx!.beginPath(); ctx!.arc(cx, cy, 2.5 * pulse + 1, 0, Math.PI * 2); ctx!.fill()
        }
      })

      // Draw floating particles (left side)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > 1) p.vx *= -1
        if (p.y < 0 || p.y > 1) p.vy *= -1
        ctx!.fillStyle = 'rgba(249,115,22,0.25)'
        ctx!.beginPath(); ctx!.arc(p.x * w * 0.38, p.y * h, p.r, 0, Math.PI * 2); ctx!.fill()
      })

      // Draw connection lines between nearby operational tiles
      const t = time * 0.001
      const operationalTiles = tiles
        .map((tile, i) => ({ ...tile, i }))
        .filter(t => !t.legal)

      for (let a = 0; a < operationalTiles.length; a++) {
        for (let b = a + 1; b < operationalTiles.length; b++) {
          const ti = operationalTiles[a]
          const tj = operationalTiles[b]
          const ci = ti.i, cj = tj.i
          const cols2 = cols
          const x1 = offsetX + (ci % cols2) * tileW + tileW / 2
          const y1 = offsetY + Math.floor(ci / cols2) * tileH + tileH / 2
          const x2 = offsetX + (cj % cols2) * tileW + tileW / 2
          const y2 = offsetY + Math.floor(cj / cols2) * tileH + tileH / 2
          const dist = Math.hypot(x2 - x1, y2 - y1)
          if (dist < tileW * 2.5) {
            const alpha = (1 - dist / (tileW * 2.5)) * 0.08
            ctx!.strokeStyle = `rgba(249,115,22,${alpha})`
            ctx!.lineWidth = 0.5
            ctx!.beginPath(); ctx!.moveTo(x1, y1); ctx!.lineTo(x2, y2); ctx!.stroke()
          }
        }
      }

      rafId = requestAnimationFrame(draw)
    }

    draw(0)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [entityCount, operationalCount])

  return null
}
