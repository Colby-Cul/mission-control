'use client'
import { useEffect, useRef } from 'react'

/**
 * Per-Property HeroCanvas
 * Animation: house/building silhouette with light pulses through windows
 * + ambient floating particles.
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

    const WINDOWS = [
      { rx: -50, ry: -20, rw: 22, rh: 18, phase: 0.0 },
      { rx:  10, ry: -20, rw: 22, rh: 18, phase: 1.2 },
      { rx: -50, ry:  10, rw: 22, rh: 18, phase: 2.4 },
      { rx:  10, ry:  10, rw: 22, rh: 18, phase: 0.6 },
    ]

    type Particle = { x: number; y: number; vx: number; vy: number; alpha: number; size: number; color: string }
    const particles: Particle[] = Array.from({ length: 50 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.3, vy: -(0.15 + Math.random() * 0.35),
      alpha: 0.04 + Math.random() * 0.16, size: 1 + Math.random() * 2.5,
      color: ['#f97316','#f59e0b','#ec4899','#8b5cf6'][Math.floor(Math.random()*4)],
    }))

    function drawHouse(cx: number, cy: number) {
      const bw = 140, bh = 100, rh = 55

      const sg = ctx!.createRadialGradient(cx, cy + bh/2 + 10, 5, cx, cy + bh/2 + 10, 80)
      sg.addColorStop(0, 'rgba(249,115,22,0.08)'); sg.addColorStop(1, 'transparent')
      ctx!.fillStyle = sg
      ctx!.beginPath(); ctx!.ellipse(cx, cy + bh/2 + 10, 80, 18, 0, 0, Math.PI*2); ctx!.fill()

      ctx!.fillStyle = 'rgba(255,255,255,0.04)'
      ctx!.strokeStyle = 'rgba(255,255,255,0.12)'; ctx!.lineWidth = 1
      ctx!.beginPath(); ctx!.rect(cx - bw/2, cy - bh/2, bw, bh); ctx!.fill(); ctx!.stroke()

      ctx!.beginPath()
      ctx!.moveTo(cx - bw/2 - 10, cy - bh/2)
      ctx!.lineTo(cx, cy - bh/2 - rh)
      ctx!.lineTo(cx + bw/2 + 10, cy - bh/2)
      ctx!.closePath()
      const roofGrad = ctx!.createLinearGradient(cx, cy - bh/2 - rh, cx, cy - bh/2)
      roofGrad.addColorStop(0, 'rgba(249,115,22,0.25)'); roofGrad.addColorStop(1, 'rgba(249,115,22,0.06)')
      ctx!.fillStyle = roofGrad; ctx!.fill()
      ctx!.strokeStyle = 'rgba(249,115,22,0.4)'; ctx!.stroke()

      // Chimney
      ctx!.fillStyle = 'rgba(255,255,255,0.05)'; ctx!.strokeStyle = 'rgba(255,255,255,0.1)'
      ctx!.fillRect(cx + 30, cy - bh/2 - rh * 0.55, 14, rh * 0.45)
      ctx!.strokeRect(cx + 30, cy - bh/2 - rh * 0.55, 14, rh * 0.45)

      // Smoke
      for (let i = 0; i < 3; i++) {
        const sy = cy - bh/2 - rh * 0.55 - i * 14 - ((time * 15) % 14)
        const sa = 0.05 - i * 0.015
        if (sa <= 0) continue
        ctx!.fillStyle = `rgba(255,255,255,${sa})`
        ctx!.beginPath(); ctx!.arc(cx + 37 + Math.sin(time + i) * 4, sy, 5 + i * 2, 0, Math.PI*2); ctx!.fill()
      }

      // Windows
      WINDOWS.forEach(win => {
        const wx = cx + win.rx, wy = cy - bh/2 + bh * 0.15 + win.ry
        const pulse = 0.5 + 0.5 * Math.sin(time * 1.5 + win.phase)
        ctx!.fillStyle = pulse > 0.3 ? `rgba(245,158,11,${0.3 + pulse * 0.4})` : 'rgba(255,255,255,0.03)'
        ctx!.strokeStyle = 'rgba(255,255,255,0.15)'; ctx!.lineWidth = 0.8
        ctx!.fillRect(wx, wy, win.rw, win.rh); ctx!.strokeRect(wx, wy, win.rw, win.rh)
        if (pulse > 0.3) {
          const wg = ctx!.createRadialGradient(wx + win.rw/2, wy + win.rh/2, 0, wx + win.rw/2, wy + win.rh/2, 28)
          wg.addColorStop(0, `rgba(245,158,11,${0.08 + pulse * 0.08})`); wg.addColorStop(1, 'transparent')
          ctx!.fillStyle = wg
          ctx!.beginPath(); ctx!.arc(wx + win.rw/2, wy + win.rh/2, 28, 0, Math.PI*2); ctx!.fill()
        }
      })

      const og = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 130)
      og.addColorStop(0, 'rgba(249,115,22,0.04)'); og.addColorStop(1, 'transparent')
      ctx!.fillStyle = og; ctx!.fillRect(cx - 160, cy - 140, 320, 280)
    }

    function draw() {
      time += 0.014
      ctx!.clearRect(0, 0, w, h)

      ctx!.strokeStyle = 'rgba(255,255,255,0.01)'; ctx!.lineWidth = 0.5
      for (let x = 0; x < w; x += 60) { ctx!.beginPath(); ctx!.moveTo(x,0); ctx!.lineTo(x,h); ctx!.stroke() }
      for (let y = 0; y < h; y += 60) { ctx!.beginPath(); ctx!.moveTo(0,y); ctx!.lineTo(w,y); ctx!.stroke() }

      particles.forEach(p => {
        p.x += p.vx / w; p.y += p.vy / h
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random() }
        if (p.x < -0.02) p.x = 1.02
        if (p.x > 1.02) p.x = -0.02
        ctx!.fillStyle = p.color + Math.round(p.alpha * 255).toString(16).padStart(2,'0')
        ctx!.beginPath(); ctx!.arc(p.x * w, p.y * h, p.size, 0, Math.PI*2); ctx!.fill()
      })

      drawHouse(w * 0.5, h * 0.52)
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
