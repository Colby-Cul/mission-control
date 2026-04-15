'use client'
import { useEffect, useRef } from 'react'

/**
 * Legal HeroCanvas
 * Animation: seal/shield motif — concentric expanding rings + golden scan lines.
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

    type Ring = { r: number; maxR: number; speed: number; color: string }
    const rings: Ring[] = []

    function spawnRing() {
      rings.push({ r: 0, maxR: 80 + Math.random() * 140, speed: 0.6 + Math.random() * 0.8, color: Math.random() > 0.5 ? '#f59e0b' : '#f97316' })
    }
    for (let i = 0; i < 4; i++) rings.push({ r: i * 60, maxR: 60 + i * 60, speed: 0.5, color: '#f59e0b' })

    let ringTimer = 0

    type ScanLine = { y: number; speed: number; alpha: number; lineWidth: number }
    const scanLines: ScanLine[] = Array.from({ length: 8 }, () => ({
      y: Math.random(), speed: 0.001 + Math.random() * 0.002,
      alpha: 0.04 + Math.random() * 0.06, lineWidth: 0.3 + Math.random() * 0.6,
    }))

    type Dot = { x: number; y: number; alpha: number; phase: number }
    const dots: Dot[] = Array.from({ length: 40 }, () => ({
      x: Math.random(), y: Math.random(), alpha: 0.04 + Math.random() * 0.08, phase: Math.random() * Math.PI * 2,
    }))

    function drawShield(cx: number, cy: number, size: number, alpha: number, color: string) {
      const sw = size, sh = size * 1.2
      ctx!.beginPath()
      ctx!.moveTo(cx, cy - sh * 0.5)
      ctx!.bezierCurveTo(cx + sw * 0.5, cy - sh * 0.5, cx + sw * 0.5, cy + sh * 0.15, cx, cy + sh * 0.5)
      ctx!.bezierCurveTo(cx - sw * 0.5, cy + sh * 0.15, cx - sw * 0.5, cy - sh * 0.5, cx, cy - sh * 0.5)
      ctx!.strokeStyle = color + Math.round(alpha * 255).toString(16).padStart(2,'00')
      ctx!.lineWidth = 1.5; ctx!.stroke()
    }

    function draw() {
      time += 0.014
      ctx!.clearRect(0, 0, w, h)

      ctx!.strokeStyle = 'rgba(255,255,255,0.01)'; ctx!.lineWidth = 0.5
      for (let x = 0; x < w; x += 60) { ctx!.beginPath(); ctx!.moveTo(x,0); ctx!.lineTo(x,h); ctx!.stroke() }
      for (let y = 0; y < h; y += 60) { ctx!.beginPath(); ctx!.moveTo(0,y); ctx!.lineTo(w,y); ctx!.stroke() }

      const cx = w * 0.5, cy = h * 0.5

      scanLines.forEach(sl => {
        sl.y = (sl.y + sl.speed) % 1
        const sy = sl.y * h
        const grad = ctx!.createLinearGradient(0, sy, w, sy)
        grad.addColorStop(0, 'transparent')
        grad.addColorStop(0.3, `rgba(245,158,11,${sl.alpha})`)
        grad.addColorStop(0.7, `rgba(245,158,11,${sl.alpha})`)
        grad.addColorStop(1, 'transparent')
        ctx!.strokeStyle = grad; ctx!.lineWidth = sl.lineWidth
        ctx!.beginPath(); ctx!.moveTo(0, sy); ctx!.lineTo(w, sy); ctx!.stroke()
      })

      for (let i = 1; i <= 4; i++) {
        drawShield(cx, cy, i * 32 + Math.sin(time * 0.5 + i) * 3, 0.08 + i * 0.02, '#f59e0b')
      }

      ringTimer += 0.014
      if (ringTimer > 1.8) { ringTimer = 0; spawnRing() }

      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i]
        ring.r += ring.speed
        if (ring.r > ring.maxR) { rings.splice(i, 1); continue }
        const fade = 1 - ring.r / ring.maxR
        ctx!.beginPath(); ctx!.arc(cx, cy, ring.r, 0, Math.PI * 2)
        ctx!.strokeStyle = ring.color + Math.round(fade * 0.5 * 255).toString(16).padStart(2,'0')
        ctx!.lineWidth = 0.8; ctx!.stroke()
      }

      dots.forEach(d => {
        const pulse = d.alpha * (0.6 + 0.4 * Math.sin(time * 1.2 + d.phase))
        ctx!.fillStyle = `rgba(245,158,11,${pulse})`
        ctx!.beginPath(); ctx!.arc(d.x * w, d.y * h, 1.5, 0, Math.PI * 2); ctx!.fill()
      })

      const cg = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 60)
      cg.addColorStop(0, 'rgba(245,158,11,0.08)'); cg.addColorStop(1, 'transparent')
      ctx!.fillStyle = cg; ctx!.beginPath(); ctx!.arc(cx, cy, 60, 0, Math.PI*2); ctx!.fill()

      ctx!.font = '500 22px "DM Sans"'
      ctx!.fillStyle = `rgba(245,158,11,${0.25 + 0.1 * Math.sin(time)})`
      ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'
      ctx!.fillText('⚖', cx, cy)

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
