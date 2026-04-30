'use client'
import { useEffect, useRef } from 'react'

/**
 * Settings HeroCanvas
 * Animation: Subtle drifting particles + rotating gear motif.
 * Large gear slowly rotates at center-right; small gears counter-rotate.
 * Particles float upward gently, fading out.
 */
export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0, h = 0, dpr = 1, rafId = 0, time = 0

    function resize() {
      const parent = canvas!.parentElement
      if (!parent) return
      dpr = window.devicePixelRatio || 1
      w = parent.offsetWidth; h = parent.offsetHeight
      canvas!.width = w * dpr; canvas!.height = h * dpr
      canvas!.style.width = w + 'px'; canvas!.style.height = h + 'px'
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    // Particles
    type Particle = { x: number; y: number; vx: number; vy: number; alpha: number; radius: number }
    const particles: Particle[] = []
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * 1200, y: Math.random() * 600,
        vx: (Math.random() - 0.5) * 0.3, vy: -0.15 - Math.random() * 0.25,
        alpha: 0.1 + Math.random() * 0.3, radius: 1 + Math.random() * 2.5,
      })
    }

    function drawGear(gx: number, gy: number, outerR: number, innerR: number, teeth: number, angle: number, color: string, alpha: number) {
      ctx!.save()
      ctx!.globalAlpha = alpha
      ctx!.translate(gx, gy)
      ctx!.rotate(angle)
      ctx!.beginPath()
      for (let i = 0; i < teeth * 2; i++) {
        const a = (i / (teeth * 2)) * Math.PI * 2
        const r = i % 2 === 0 ? outerR : innerR
        if (i === 0) ctx!.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        else ctx!.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      ctx!.closePath()
      ctx!.strokeStyle = color
      ctx!.lineWidth = 1.5
      ctx!.stroke()
      // Hub circle
      ctx!.beginPath(); ctx!.arc(0, 0, innerR * 0.35, 0, Math.PI * 2)
      ctx!.stroke()
      ctx!.restore()
    }

    function draw() {
      time += 0.016
      ctx!.clearRect(0, 0, w, h)

      // Grid
      ctx!.strokeStyle = 'rgba(255,255,255,0.012)'
      ctx!.lineWidth = 0.5
      for (let x = 0; x < w; x += 60) { ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke() }
      for (let y = 0; y < h; y += 60) { ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke() }

      // Particles
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.y < -10) { p.y = (h || 600) + 10; p.x = Math.random() * (w || 1200) }
        if (p.x < 0 || p.x > (w || 1200)) { p.x = Math.random() * (w || 1200) }
        const pg = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2)
        pg.addColorStop(0, `rgba(59,130,246,${p.alpha})`)
        pg.addColorStop(1, 'transparent')
        ctx!.fillStyle = pg
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2); ctx!.fill()
      })

      // Gears (positioned on the right half)
      const gx1 = w * 0.62, gy1 = h * 0.5
      const gx2 = gx1 - 70, gy2 = gy1 + 15
      const gx3 = gx1 + 68, gy3 = gy1 - 12

      drawGear(gx1, gy1, 55, 44, 12, time * 0.12, '#3b82f633', 1)
      drawGear(gx2, gy2, 28, 22, 8, -time * 0.24 + 0.2, '#8b5cf633', 1)
      drawGear(gx3, gy3, 22, 17, 6, -time * 0.3 + 0.8, '#10b98133', 1)

      // Ambient glow behind gears
      const ag = ctx!.createRadialGradient(gx1, gy1, 0, gx1, gy1, 90)
      ag.addColorStop(0, 'rgba(59,130,246,0.05)'); ag.addColorStop(1, 'transparent')
      ctx!.fillStyle = ag; ctx!.fillRect(0, 0, w, h)

      rafId = requestAnimationFrame(draw)
    }
    rafId = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(rafId); ro.disconnect() }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      id="heroCanvas"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
      aria-hidden="true"
    />
  )
}
