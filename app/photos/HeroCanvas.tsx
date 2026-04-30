'use client'
import { useEffect } from 'react'

/**
 * Photos HeroCanvas
 * Animation: photo-grid mosaic — a grid of cells that randomly light up and fade,
 * simulating a contact-sheet lighting effect.
 */
export default function HeroCanvas() {
  useEffect(() => {
    ;(function () {
      const canvas = document.getElementById('heroCanvas') as HTMLCanvasElement | null
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      let w: number, h: number, dpr: number
      let rafId: number

      function resize() {
        const rect = canvas!.parentElement!.getBoundingClientRect()
        dpr = window.devicePixelRatio || 1
        w = rect.width
        h = rect.height
        canvas!.width = w * dpr
        canvas!.height = h * dpr
        canvas!.style.width = w + 'px'
        canvas!.style.height = h + 'px'
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      resize()
      window.addEventListener('resize', resize)

      const CELL_W = 60
      const CELL_H = 45
      const GAP = 3

      interface Cell {
        col: number
        row: number
        alpha: number
        targetAlpha: number
        hue: number
        timer: number
        nextChange: number
      }

      let cells: Cell[] = []

      function buildGrid() {
        cells = []
        const cols = Math.ceil(w / (CELL_W + GAP)) + 1
        const rows = Math.ceil(h / (CELL_H + GAP)) + 1
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            cells.push({
              col: c, row: r,
              alpha: Math.random() * 0.08,
              targetAlpha: Math.random() * 0.12,
              hue: 20 + Math.random() * 40, // warm amber/orange range
              timer: 0,
              nextChange: 0.5 + Math.random() * 3,
            })
          }
        }
      }
      buildGrid()

      function draw() {
        ctx!.clearRect(0, 0, w, h)

        const dt = 0.016

        cells.forEach(cell => {
          cell.timer += dt
          // Slowly lerp to target
          cell.alpha += (cell.targetAlpha - cell.alpha) * 0.04

          if (cell.timer >= cell.nextChange) {
            cell.timer = 0
            cell.nextChange = 0.5 + Math.random() * 4
            // 15% chance to "light up" brightly
            if (Math.random() < 0.15) {
              cell.targetAlpha = 0.15 + Math.random() * 0.25
              cell.hue = 10 + Math.random() * 50
            } else {
              cell.targetAlpha = Math.random() * 0.06
            }
          }

          const x = cell.col * (CELL_W + GAP)
          const y = cell.row * (CELL_H + GAP)

          // Cell background
          ctx!.fillStyle = `hsla(${cell.hue}, 70%, 60%, ${cell.alpha})`
          const r = 4
          ctx!.beginPath()
          ctx!.roundRect(x, y, CELL_W, CELL_H, r)
          ctx!.fill()

          // Inner "photo" lines for texture
          if (cell.alpha > 0.08) {
            ctx!.strokeStyle = `hsla(${cell.hue}, 50%, 70%, ${cell.alpha * 0.4})`
            ctx!.lineWidth = 0.5
            ctx!.beginPath()
            ctx!.moveTo(x + 4, y + CELL_H * 0.6)
            ctx!.lineTo(x + CELL_W - 4, y + CELL_H * 0.6)
            ctx!.stroke()
            ctx!.beginPath()
            ctx!.arc(x + CELL_W * 0.5, y + CELL_H * 0.35, CELL_H * 0.2, 0, Math.PI * 2)
            ctx!.stroke()
          }
        })

        // Vignette
        const vg = ctx!.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, w * 0.75)
        vg.addColorStop(0, 'transparent')
        vg.addColorStop(1, 'rgba(6,6,16,0.5)')
        ctx!.fillStyle = vg
        ctx!.fillRect(0, 0, w, h)

        // Amber ambient glow center
        const g1 = ctx!.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.35)
        g1.addColorStop(0, 'rgba(245,158,11,0.04)')
        g1.addColorStop(1, 'transparent')
        ctx!.fillStyle = g1
        ctx!.fillRect(0, 0, w, h)

        rafId = requestAnimationFrame(draw)
      }
      rafId = requestAnimationFrame(draw)

      return () => {
        cancelAnimationFrame(rafId)
        window.removeEventListener('resize', resize)
      }
    })()
  }, [])

  return null
}
