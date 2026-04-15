'use client'
import { useEffect, useRef } from 'react'

/**
 * Properties HeroCanvas
 * Animation: abstract terrain/landscape — property value bars rising from ground;
 * ambient parallax particles drift upward.
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

    type Marker = { xFrac: number; baseYFrac: number; targetHFrac: number; currentH: number; color: string; label: string; value: number; phase: number }
    const markers: Marker[] = [
      { xFrac: 0.25, baseYFrac: 0.78, targetHFrac: 0.38, currentH: 0, color: '#f97316', label: 'Truckee',  value: 1250000, phase: 0   },
      { xFrac: 0.50, baseYFrac: 0.78, targetHFrac: 0.52, currentH: 0, color: '#10b981', label: 'Cabo',     value: 875000,  phase: 0.8 },
      { xFrac: 0.75, baseYFrac: 0.78, targetHFrac: 0.44, currentH: 0, color: '#8b5cf6', label: 'Primary',  value: 980000,  phase: 1.6 },
    ]

    type Particle = { x: number; y: number; vy: number; alpha: number; size: number; color: string }
    const particles: Particle[] = Array.from({ length: 40 }, () => ({
      x: Math.random(), y: Math.random(), vy: -(0.1 + Math.random() * 0.3),
      alpha: 0.08 + Math.random() * 0.18, size: 1 + Math.random() * 2,
      color: ['#f97316','#10b981','#8b5cf6','#f59e0b'][Math.floor(Math.random()*4)],
    }))

    function drawTerrain(yFrac: number, opacity: number, color: string) {
      ctx!.beginPath(); ctx!.moveTo(0, h)
      const segs = 8
      for (let i = 0; i <= segs; i++) {
        const tx = (i / segs) * w
        const ty = yFrac * h + Math.sin(i * 0.9 + time * 0.3) * 18 + Math.cos(i * 1.4 + time * 0.2) * 12
        ctx!.lineTo(tx, ty)
      }
      ctx!.lineTo(w, h); ctx!.closePath()
      ctx!.fillStyle = color + Math.round(opacity * 255).toString(16).padStart(2,'0')
      ctx!.fill()
    }

    function draw() {
      time += 0.012
      ctx!.clearRect(0, 0, w, h)

      ctx!.strokeStyle = 'rgba(255,255,255,0.01)'; ctx!.lineWidth = 0.5
      for (let x = 0; x < w; x += 60) { ctx!.beginPath(); ctx!.moveTo(x,0); ctx!.lineTo(x,h); ctx!.stroke() }
      for (let y = 0; y < h; y += 60) { ctx!.beginPath(); ctx!.moveTo(0,y); ctx!.lineTo(w,y); ctx!.stroke() }

      drawTerrain(0.82, 0.04, '#8b5cf6')
      drawTerrain(0.84, 0.05, '#f97316')
      drawTerrain(0.86, 0.06, '#10b981')

      const hg = ctx!.createLinearGradient(0, h * 0.6, 0, h)
      hg.addColorStop(0, 'rgba(249,115,22,0.0)')
      hg.addColorStop(1, 'rgba(249,115,22,0.06)')
      ctx!.fillStyle = hg; ctx!.fillRect(0, h * 0.6, w, h * 0.4)

      particles.forEach(p => {
        p.y += p.vy / h
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random() }
        ctx!.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2,'0')
        ctx!.beginPath(); ctx!.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2); ctx!.fill()
      })

      markers.forEach(m => {
        const mx = m.xFrac * w, baseY = m.baseYFrac * h
        const pulse = 1 + 0.04 * Math.sin(time * 1.8 + m.phase)
        m.currentH += (m.targetHFrac * h - m.currentH) * 0.025
        const topY = baseY - m.currentH * pulse
        const barW = 20

        const barGrad = ctx!.createLinearGradient(mx, topY, mx, baseY)
        barGrad.addColorStop(0, m.color + 'cc'); barGrad.addColorStop(1, m.color + '22')
        ctx!.fillStyle = barGrad; ctx!.fillRect(mx - barW/2, topY, barW, baseY - topY)
        ctx!.strokeStyle = m.color + 'aa'; ctx!.lineWidth = 1
        ctx!.strokeRect(mx - barW/2, topY, barW, baseY - topY)

        const tg = ctx!.createRadialGradient(mx, topY, 0, mx, topY, 30)
        tg.addColorStop(0, m.color + '55'); tg.addColorStop(1, 'transparent')
        ctx!.fillStyle = tg
        ctx!.beginPath(); ctx!.arc(mx, topY, 30, 0, Math.PI*2); ctx!.fill()

        ctx!.fillStyle = m.color
        ctx!.beginPath()
        ctx!.moveTo(mx, topY - 8); ctx!.lineTo(mx + 6, topY); ctx!.lineTo(mx, topY + 8); ctx!.lineTo(mx - 6, topY)
        ctx!.closePath(); ctx!.fill()

        ctx!.font = '600 10px "IBM Plex Mono"'; ctx!.fillStyle = m.color + 'cc'
        ctx!.textAlign = 'center'; ctx!.fillText(m.label, mx, topY - 16)
        ctx!.font = '500 9px "IBM Plex Mono"'; ctx!.fillStyle = 'rgba(255,255,255,0.45)'
        ctx!.fillText('$' + (m.value / 1e6).toFixed(2) + 'M', mx, topY - 6)
      })

      const baseY = h * 0.78
      const bl = ctx!.createLinearGradient(0, baseY, w, baseY)
      bl.addColorStop(0, 'transparent'); bl.addColorStop(0.2, 'rgba(249,115,22,0.2)')
      bl.addColorStop(0.8, 'rgba(249,115,22,0.2)'); bl.addColorStop(1, 'transparent')
      ctx!.strokeStyle = bl; ctx!.lineWidth = 1; ctx!.setLineDash([6, 10])
      ctx!.beginPath(); ctx!.moveTo(0, baseY); ctx!.lineTo(w, baseY); ctx!.stroke()
      ctx!.setLineDash([])

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
