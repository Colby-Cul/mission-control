'use client'
import { useEffect } from 'react'

/**
 * Incidents HeroCanvas
 * Animation: alert-pulse rings fading outward from multiple epicenters,
 * with glitch scan lines sweeping across.
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

      interface PulseRing {
        x: number
        y: number
        startTime: number
        maxR: number
        color: string
        period: number
      }

      const rings: PulseRing[] = [
        { x: 0.3,  y: 0.4,  startTime: 0,    maxR: 120, color: '#ef4444', period: 2.5 },
        { x: 0.65, y: 0.55, startTime: 0.8,  maxR: 90,  color: '#f59e0b', period: 3.0 },
        { x: 0.5,  y: 0.3,  startTime: 1.6,  maxR: 100, color: '#ef4444', period: 2.8 },
        { x: 0.75, y: 0.7,  startTime: 2.1,  maxR: 70,  color: '#3b82f6', period: 3.5 },
        { x: 0.2,  y: 0.65, startTime: 0.4,  maxR: 80,  color: '#ef4444', period: 2.2 },
      ]

      // Glitch scan lines state
      let glitchTimer = 0
      let glitchY = 0
      let glitchActive = false

      function draw() {
        time += 0.016
        ctx!.clearRect(0, 0, w, h)

        // Dark red ambient background wash
        const bgGrad = ctx!.createLinearGradient(0, 0, w, h)
        bgGrad.addColorStop(0, 'rgba(239,68,68,0.015)')
        bgGrad.addColorStop(1, 'rgba(59,130,246,0.01)')
        ctx!.fillStyle = bgGrad
        ctx!.fillRect(0, 0, w, h)

        // Grid with red tint
        ctx!.strokeStyle = 'rgba(239,68,68,0.06)'
        ctx!.lineWidth = 0.5
        for (let x = 0; x < w; x += 80) {
          ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke()
        }
        for (let y = 0; y < h; y += 60) {
          ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke()
        }

        // Pulse rings
        rings.forEach(ring => {
          const period = ring.period
          const elapsed = (time - ring.startTime) % period
          const progress = elapsed / period
          const r = progress * ring.maxR * (w / 800)
          const alpha = (1 - progress) * 0.6

          // 3 concentric rings per epicenter
          for (let k = 0; k < 3; k++) {
            const kProgress = ((elapsed - k * 0.3) % period) / period
            if (kProgress < 0) continue
            const kr = kProgress * ring.maxR * (w / 800)
            const ka = (1 - kProgress) * 0.3

            ctx!.beginPath()
            ctx!.arc(ring.x * w, ring.y * h, Math.max(0, kr), 0, Math.PI * 2)
            ctx!.strokeStyle = ring.color + Math.round(ka * 255).toString(16).padStart(2, '0')
            ctx!.lineWidth = 1.5
            ctx!.stroke()
          }

          // Epicenter dot
          const dotPulse = 0.5 + 0.5 * Math.sin(time * 4 + ring.startTime)
          const dotGlow = ctx!.createRadialGradient(ring.x * w, ring.y * h, 0, ring.x * w, ring.y * h, 16 * dotPulse)
          dotGlow.addColorStop(0, ring.color + 'aa')
          dotGlow.addColorStop(1, 'transparent')
          ctx!.fillStyle = dotGlow
          ctx!.beginPath()
          ctx!.arc(ring.x * w, ring.y * h, 16 * dotPulse, 0, Math.PI * 2)
          ctx!.fill()

          ctx!.beginPath()
          ctx!.arc(ring.x * w, ring.y * h, 4, 0, Math.PI * 2)
          ctx!.fillStyle = ring.color
          ctx!.fill()
        })

        // Glitch scan lines
        glitchTimer += 0.016
        if (!glitchActive && glitchTimer > 1.2 + Math.random() * 2) {
          glitchActive = true
          glitchY = Math.random() * h
          glitchTimer = 0
        }
        if (glitchActive) {
          const lineH = 1 + Math.floor(Math.random() * 3)
          ctx!.fillStyle = 'rgba(239,68,68,0.08)'
          ctx!.fillRect(0, glitchY, w, lineH)
          // Horizontal displacement artifact
          ctx!.fillStyle = 'rgba(239,68,68,0.04)'
          ctx!.fillRect(Math.random() * w * 0.3, glitchY + lineH, w * 0.5, 1)
          glitchY += 2
          if (glitchY > h) glitchActive = false
        }

        // Vignette to red edges
        const vignette = ctx!.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.8)
        vignette.addColorStop(0, 'transparent')
        vignette.addColorStop(1, 'rgba(239,68,68,0.06)')
        ctx!.fillStyle = vignette
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
