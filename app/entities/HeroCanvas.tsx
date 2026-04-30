'use client'
import { useEffect } from 'react'

/**
 * Entities HeroCanvas
 * Animation: entity-constellation — dots representing entities with connection web,
 * slowly rotating, with ambient glow.
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

      const NODE_COLORS = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4']

      interface StarNode {
        angle: number
        radius: number
        speed: number
        size: number
        color: string
        label: string
      }

      const nodes: StarNode[] = [
        { angle: 0,    radius: 80,  speed: 0.25, size: 6,  color: '#3b82f6', label: 'LLC' },
        { angle: 1.05, radius: 120, speed: 0.18, size: 7,  color: '#ec4899', label: 'Corp' },
        { angle: 2.1,  radius: 160, speed: 0.12, size: 5,  color: '#8b5cf6', label: 'Trust' },
        { angle: 3.14, radius: 100, speed: 0.2,  size: 8,  color: '#10b981', label: 'LP' },
        { angle: 4.19, radius: 140, speed: 0.15, size: 5,  color: '#f59e0b', label: 'Hold' },
        { angle: 5.24, radius: 90,  speed: 0.22, size: 6,  color: '#06b6d4', label: 'Op Co' },
        { angle: 0.52, radius: 180, speed: 0.08, size: 7,  color: '#a3e635', label: 'Entity' },
        { angle: 2.61, radius: 60,  speed: 0.35, size: 4,  color: '#3b82f6', label: 'Sub' },
      ]

      function draw() {
        time += 0.016
        ctx!.clearRect(0, 0, w, h)

        // Grid
        ctx!.strokeStyle = 'rgba(255,255,255,0.012)'
        ctx!.lineWidth = 0.5
        for (let x = 0; x < w; x += 80) {
          ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke()
        }
        for (let y = 0; y < h; y += 60) {
          ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke()
        }

        const cx = w / 2
        const cy = h / 2

        // Draw connection web
        const positions = nodes.map(n => ({
          x: cx + Math.cos(n.angle + time * n.speed) * n.radius,
          y: cy + Math.sin(n.angle + time * n.speed) * n.radius * 0.55,
          color: n.color,
        }))

        for (let i = 0; i < positions.length; i++) {
          for (let j = i + 1; j < positions.length; j++) {
            const a = positions[i]
            const b = positions[j]
            const dist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
            if (dist < 180) {
              const alpha = (1 - dist / 180) * 0.15
              ctx!.strokeStyle = `rgba(59,130,246,${alpha})`
              ctx!.lineWidth = 0.8
              ctx!.beginPath()
              ctx!.moveTo(a.x, a.y)
              ctx!.lineTo(b.x, b.y)
              ctx!.stroke()
            }
          }
        }

        // Central hub
        const hubPulse = 0.7 + 0.3 * Math.sin(time * 1.5)
        const hubGlow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 30 * hubPulse)
        hubGlow.addColorStop(0, 'rgba(59,130,246,0.4)')
        hubGlow.addColorStop(1, 'transparent')
        ctx!.fillStyle = hubGlow
        ctx!.beginPath()
        ctx!.arc(cx, cy, 30 * hubPulse, 0, Math.PI * 2)
        ctx!.fill()

        ctx!.beginPath()
        ctx!.arc(cx, cy, 6, 0, Math.PI * 2)
        ctx!.fillStyle = '#3b82f6'
        ctx!.fill()

        // Draw each node
        nodes.forEach((n, i) => {
          const px = positions[i].x
          const py = positions[i].y

          // Line to center
          ctx!.strokeStyle = n.color + '20'
          ctx!.lineWidth = 1
          ctx!.setLineDash([3, 6])
          ctx!.beginPath()
          ctx!.moveTo(cx, cy)
          ctx!.lineTo(px, py)
          ctx!.stroke()
          ctx!.setLineDash([])

          // Glow
          const glow = ctx!.createRadialGradient(px, py, 0, px, py, n.size * 3)
          glow.addColorStop(0, n.color + '60')
          glow.addColorStop(1, 'transparent')
          ctx!.fillStyle = glow
          ctx!.beginPath()
          ctx!.arc(px, py, n.size * 3, 0, Math.PI * 2)
          ctx!.fill()

          // Dot
          ctx!.beginPath()
          ctx!.arc(px, py, n.size, 0, Math.PI * 2)
          ctx!.fillStyle = n.color
          ctx!.fill()
        })

        // Ambient glow
        const g1 = ctx!.createRadialGradient(cx, cy, 0, cx, cy, w * 0.4)
        g1.addColorStop(0, 'rgba(59,130,246,0.05)')
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
