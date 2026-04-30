'use client'
import { useEffect } from 'react'

/**
 * Cash Flow HeroCanvas
 * Animation: flowing money streams — horizontal lanes with currency symbols
 * drifting left-to-right (income, green) and right-to-left (expenses, red),
 * speed proportional to magnitude.
 */
export default function HeroCanvas() {
  useEffect(() => {
    ;(function () {
      const canvas = document.getElementById('heroCanvas') as HTMLCanvasElement | null
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      let w: number, h: number, dpr: number
      let time = 0
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

      type Particle = {
        x: number
        y: number
        speed: number
        size: number
        alpha: number
        symbol: string
        dir: 1 | -1   // 1 = income (left→right), -1 = expense (right→left)
        color: string
        lane: number
      }

      const incomeSymbols = ['$', '↗', '+', '$', '₿', '$']
      const expenseSymbols = ['$', '↘', '-', '$', '€', '$']

      // 8 income lanes (top half) + 6 expense lanes (bottom half)
      const particles: Particle[] = []

      function spawnParticle(dir: 1 | -1, lane: number) {
        const isIncome = dir === 1
        const laneCount = isIncome ? 8 : 6
        const totalLanes = 14
        const laneH = h / totalLanes
        const laneY = isIncome
          ? (lane / 8) * (h * 0.55) + h * 0.06
          : (lane / 6) * (h * 0.4) + h * 0.5
        const speed = (0.8 + Math.random() * 2.4) * (isIncome ? 1.2 : 0.9)
        particles.push({
          x: dir === 1 ? -20 : w + 20,
          y: laneY + (Math.random() - 0.5) * laneH * 0.6,
          speed,
          size: 10 + Math.random() * 6,
          alpha: 0.3 + Math.random() * 0.55,
          symbol: isIncome
            ? incomeSymbols[Math.floor(Math.random() * incomeSymbols.length)]
            : expenseSymbols[Math.floor(Math.random() * expenseSymbols.length)],
          dir,
          color: isIncome ? '#10b981' : '#ef4444',
          lane,
        })
      }

      // Seed initial particles
      for (let i = 0; i < 8; i++) spawnParticle(1, i)
      for (let i = 0; i < 6; i++) spawnParticle(-1, i)

      let spawnTimer = 0

      function draw() {
        time += 0.016
        spawnTimer += 0.016
        ctx!.clearRect(0, 0, w, h)

        // Faint grid
        ctx!.strokeStyle = 'rgba(255,255,255,0.015)'
        ctx!.lineWidth = 0.5
        for (let x = 0; x < w; x += 80) {
          ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke()
        }
        for (let y = 0; y < h; y += 60) {
          ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke()
        }

        // Divider line between income/expense zones
        const divY = h * 0.5
        const divGrad = ctx!.createLinearGradient(0, divY, w, divY)
        divGrad.addColorStop(0, 'transparent')
        divGrad.addColorStop(0.2, 'rgba(255,255,255,0.06)')
        divGrad.addColorStop(0.8, 'rgba(255,255,255,0.06)')
        divGrad.addColorStop(1, 'transparent')
        ctx!.strokeStyle = divGrad
        ctx!.lineWidth = 1
        ctx!.setLineDash([4, 8])
        ctx!.beginPath(); ctx!.moveTo(0, divY); ctx!.lineTo(w, divY); ctx!.stroke()
        ctx!.setLineDash([])

        // Zone labels
        ctx!.font = '600 10px "IBM Plex Mono"'
        ctx!.letterSpacing = '0.15em'
        ctx!.fillStyle = 'rgba(16,185,129,0.4)'
        ctx!.fillText('INFLOW', 16, h * 0.12)
        ctx!.fillStyle = 'rgba(239,68,68,0.4)'
        ctx!.fillText('OUTFLOW', 16, divY + h * 0.08)

        // Spawn new particles
        if (spawnTimer > 0.18) {
          spawnTimer = 0
          spawnParticle(1, Math.floor(Math.random() * 8))
          spawnParticle(-1, Math.floor(Math.random() * 6))
        }

        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i]
          p.x += p.speed * p.dir

          // Remove off-screen
          if ((p.dir === 1 && p.x > w + 30) || (p.dir === -1 && p.x < -30)) {
            particles.splice(i, 1)
            continue
          }

          // Fade in/out at edges
          let edgeFade = 1
          const edgeZone = 60
          if (p.dir === 1) {
            if (p.x < edgeZone) edgeFade = p.x / edgeZone
            else if (p.x > w - edgeZone) edgeFade = (w - p.x) / edgeZone
          } else {
            if (p.x > w - edgeZone) edgeFade = (w - p.x) / edgeZone
            else if (p.x < edgeZone) edgeFade = p.x / edgeZone
          }
          const alpha = p.alpha * Math.max(0, edgeFade)

          // Glow
          const glow = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2)
          glow.addColorStop(0, p.color + Math.round(alpha * 80).toString(16).padStart(2, '0'))
          glow.addColorStop(1, 'transparent')
          ctx!.fillStyle = glow
          ctx!.beginPath()
          ctx!.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
          ctx!.fill()

          // Symbol
          ctx!.font = `600 ${p.size}px "IBM Plex Mono"`
          ctx!.fillStyle = p.color + Math.round(alpha * 255).toString(16).padStart(2, '0')
          ctx!.textAlign = 'center'
          ctx!.textBaseline = 'middle'
          ctx!.fillText(p.symbol, p.x, p.y)
        }

        // Ambient glow zones
        const g1 = ctx!.createRadialGradient(w * 0.5, h * 0.25, 0, w * 0.5, h * 0.25, w * 0.25)
        g1.addColorStop(0, 'rgba(16,185,129,0.04)')
        g1.addColorStop(1, 'transparent')
        ctx!.fillStyle = g1
        ctx!.fillRect(0, 0, w, h)

        const g2 = ctx!.createRadialGradient(w * 0.5, h * 0.75, 0, w * 0.5, h * 0.75, w * 0.25)
        g2.addColorStop(0, 'rgba(239,68,68,0.04)')
        g2.addColorStop(1, 'transparent')
        ctx!.fillStyle = g2
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
