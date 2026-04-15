'use client'
import { useEffect } from 'react'

/**
 * Hero animation for The Culbertson and Gray Group. A subtle residential-
 * themed particle drift — agent dots radiating out along a pipeline axis.
 * Renders into <canvas id="heroCanvas"> provided by the shared Hero.
 */
export default function HeroCanvas() {
  useEffect(() => {
    const canvas = document.getElementById('heroCanvas') as HTMLCanvasElement | null
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    type Dot = { x: number; y: number; vx: number; vy: number; r: number; hue: number; life: number }
    const dots: Dot[] = []
    const COLORS = [210, 160, 180, 140, 190]  // greens/teals — brokerage vibe

    const spawn = () => {
      const rect = canvas.getBoundingClientRect()
      for (let i = 0; i < 80; i++) {
        dots.push({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: 0.8 + Math.random() * 1.5,
          hue: COLORS[Math.floor(Math.random() * COLORS.length)],
          life: Math.random() * 1,
        })
      }
    }
    spawn()

    let raf = 0
    const tick = () => {
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)
      // Soft horizontal glow
      const g = ctx.createLinearGradient(0, rect.height * 0.3, 0, rect.height)
      g.addColorStop(0, 'rgba(16,185,129,0.02)')
      g.addColorStop(1, 'rgba(16,185,129,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, rect.width, rect.height)

      for (const d of dots) {
        d.x += d.vx
        d.y += d.vy
        if (d.x < 0 || d.x > rect.width) d.vx *= -1
        if (d.y < 0 || d.y > rect.height) d.vy *= -1
        d.life += 0.003
        const alpha = 0.25 + Math.sin(d.life * Math.PI) * 0.2
        ctx.fillStyle = `hsla(${d.hue}, 65%, 60%, ${alpha})`
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fill()
      }
      // Draw faint links between near dots
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i], b = dots[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 90) {
            ctx.strokeStyle = `hsla(${(a.hue + b.hue) / 2}, 70%, 55%, ${(1 - dist / 90) * 0.08})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return null
}
