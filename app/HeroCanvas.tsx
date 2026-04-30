'use client'
import { useEffect } from 'react'

/**
 * Dashboard / North Star HeroCanvas
 * Animation: orbital — central "North Star" node pulsing, satellite nodes (entities)
 * orbiting at different radii/speeds, comet-like trails.
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

      // Satellite nodes — entities orbiting the central star
      const satellites = [
        { radius: 80,  speed: 0.35, phase: 0,    size: 5,  color: '#3b82f6', label: 'Cabo Tropic' },
        { radius: 120, speed: 0.22, phase: 1.2,  size: 7,  color: '#ec4899', label: 'BLC CA' },
        { radius: 160, speed: 0.15, phase: 2.4,  size: 6,  color: '#8b5cf6', label: 'CA Stays' },
        { radius: 200, speed: 0.10, phase: 0.8,  size: 5,  color: '#10b981', label: 'Xome Home' },
        { radius: 240, speed: 0.07, phase: 3.6,  size: 8,  color: '#f59e0b', label: 'Lincoln Hodl' },
        { radius: 290, speed: 0.05, phase: 1.8,  size: 4,  color: '#06b6d4', label: 'C&C' },
        { radius: 340, speed: 0.04, phase: 4.2,  size: 5,  color: '#84cc16', label: 'BLC AL' },
      ]

      // Trail history per satellite
      const trails: { x: number; y: number }[][] = satellites.map(() => [])

      function draw() {
        time += 0.016
        ctx!.clearRect(0, 0, w, h)

        // Faint grid
        ctx!.strokeStyle = 'rgba(59,130,246,0.02)'
        ctx!.lineWidth = 0.5
        for (let x = 0; x < w; x += 60) {
          ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke()
        }
        for (let y = 0; y < h; y += 60) {
          ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke()
        }

        // Central position — left third of the canvas
        const cx = w * 0.38
        const cy = h * 0.5

        // Draw orbital rings (faint)
        satellites.forEach(sat => {
          ctx!.beginPath()
          ctx!.arc(cx, cy, sat.radius, 0, Math.PI * 2)
          ctx!.strokeStyle = 'rgba(255,255,255,0.03)'
          ctx!.lineWidth = 1
          ctx!.stroke()
        })

        // Draw connection lines from center to each satellite
        satellites.forEach((sat, i) => {
          const angle = sat.phase + time * sat.speed
          const sx = cx + Math.cos(angle) * sat.radius
          const sy = cy + Math.sin(angle) * sat.radius

          // Connection line
          const grad = ctx!.createLinearGradient(cx, cy, sx, sy)
          grad.addColorStop(0, sat.color.replace(')', ',0.3)').replace('rgb', 'rgba'))
          grad.addColorStop(1, 'transparent')
          ctx!.beginPath()
          ctx!.moveTo(cx, cy)
          ctx!.lineTo(sx, sy)
          ctx!.strokeStyle = sat.color + '44'
          ctx!.lineWidth = 1
          ctx!.stroke()

          // Trail
          trails[i].push({ x: sx, y: sy })
          if (trails[i].length > 28) trails[i].shift()
          for (let j = 1; j < trails[i].length; j++) {
            const alpha = (j / trails[i].length) * 0.5
            ctx!.beginPath()
            ctx!.moveTo(trails[i][j - 1].x, trails[i][j - 1].y)
            ctx!.lineTo(trails[i][j].x, trails[i][j].y)
            ctx!.strokeStyle = sat.color + Math.round(alpha * 255).toString(16).padStart(2, '0')
            ctx!.lineWidth = sat.size * 0.35
            ctx!.stroke()
          }

          // Satellite glow
          const glow = ctx!.createRadialGradient(sx, sy, 0, sx, sy, sat.size * 3)
          glow.addColorStop(0, sat.color + 'cc')
          glow.addColorStop(1, 'transparent')
          ctx!.fillStyle = glow
          ctx!.beginPath()
          ctx!.arc(sx, sy, sat.size * 3, 0, Math.PI * 2)
          ctx!.fill()

          // Satellite dot
          ctx!.beginPath()
          ctx!.arc(sx, sy, sat.size, 0, Math.PI * 2)
          ctx!.fillStyle = sat.color
          ctx!.fill()
        })

        // North Star — central pulsing node
        const pulse = 0.7 + 0.3 * Math.sin(time * 2.5)
        const starR = 14 * pulse

        // Outer glow rings
        for (let r = starR * 4; r >= starR; r -= starR * 0.8) {
          const alpha = 0.06 * (1 - r / (starR * 4))
          ctx!.beginPath()
          ctx!.arc(cx, cy, r, 0, Math.PI * 2)
          ctx!.fillStyle = `rgba(245,158,11,${alpha})`
          ctx!.fill()
        }

        // Star core gradient
        const starGrad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, starR)
        starGrad.addColorStop(0, '#ffffff')
        starGrad.addColorStop(0.3, '#f59e0b')
        starGrad.addColorStop(1, '#3b82f6')
        ctx!.beginPath()
        ctx!.arc(cx, cy, starR, 0, Math.PI * 2)
        ctx!.fillStyle = starGrad
        ctx!.fill()

        // 4-point star spikes
        ctx!.save()
        ctx!.translate(cx, cy)
        ctx!.rotate(time * 0.2)
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2
          const len = starR * 2.8
          ctx!.beginPath()
          ctx!.moveTo(0, 0)
          ctx!.lineTo(Math.cos(angle) * len, Math.sin(angle) * len)
          ctx!.strokeStyle = `rgba(245,158,11,${0.4 * pulse})`
          ctx!.lineWidth = 2
          ctx!.stroke()
        }
        ctx!.restore()

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
