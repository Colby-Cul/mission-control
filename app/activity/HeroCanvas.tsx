'use client'
import { useEffect, useRef } from 'react'

/**
 * Activity HeroCanvas
 * Animation: Timeline river — horizontal streams of event dots at different lanes
 * (agent, user, system), scrolling right-to-left continuously.
 * Each lane has a color, label, and particles flowing along it.
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

    const LANES = [
      { label: 'AGENT',  color: '#8b5cf6', yFrac: 0.28, speed: 1.8 },
      { label: 'USER',   color: '#3b82f6', yFrac: 0.50, speed: 1.2 },
      { label: 'SYSTEM', color: '#10b981', yFrac: 0.72, speed: 2.2 },
    ]

    // Event dot particles — each has a lane, x position (0..1 of w+overflow), size, alpha
    type Dot = {
      lane: number; x: number; radius: number; alpha: number
      burstPhase: number; isBurst: boolean
    }

    const dots: Dot[] = []
    // seed initial dots spread across the width
    LANES.forEach((lane, li) => {
      for (let i = 0; i < 18; i++) {
        dots.push({
          lane: li,
          x: Math.random() * (w * 1.5 || 1200),
          radius: 2.5 + Math.random() * 4,
          alpha: 0.4 + Math.random() * 0.5,
          burstPhase: Math.random() * Math.PI * 2,
          isBurst: Math.random() > 0.75,
        })
      }
    })

    // spawn new dots continuously
    let spawnTimer = 0

    function draw() {
      time += 0.016
      spawnTimer += 0.016
      ctx!.clearRect(0, 0, w, h)

      // Grid
      ctx!.strokeStyle = 'rgba(255,255,255,0.012)'
      ctx!.lineWidth = 0.5
      for (let x = 0; x < w; x += 60) { ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke() }
      for (let y = 0; y < h; y += 60) { ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke() }

      // Spawn new dots
      if (spawnTimer > 0.3) {
        spawnTimer = 0
        const li = Math.floor(Math.random() * LANES.length)
        dots.push({
          lane: li, x: w + 20,
          radius: 2.5 + Math.random() * 4,
          alpha: 0.5 + Math.random() * 0.4,
          burstPhase: Math.random() * Math.PI * 2,
          isBurst: Math.random() > 0.8,
        })
      }

      LANES.forEach((lane, li) => {
        const y = h * lane.yFrac

        // Lane line
        const grad = ctx!.createLinearGradient(0, y, w, y)
        grad.addColorStop(0, 'transparent')
        grad.addColorStop(0.1, lane.color + '22')
        grad.addColorStop(0.9, lane.color + '22')
        grad.addColorStop(1, 'transparent')
        ctx!.strokeStyle = grad
        ctx!.lineWidth = 1
        ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke()

        // Lane label
        ctx!.fillStyle = lane.color + '88'
        ctx!.font = '600 9px "IBM Plex Mono"'
        ctx!.textAlign = 'left'; ctx!.textBaseline = 'middle'
        ctx!.fillText(lane.label, 6, y)
      })

      // Move + draw dots
      for (let i = dots.length - 1; i >= 0; i--) {
        const d = dots[i]
        const lane = LANES[d.lane]
        d.x -= lane.speed * 0.8

        if (d.x < -20) { dots.splice(i, 1); continue }

        const y = h * lane.yFrac
        const pulse = d.isBurst ? 1 + 0.3 * Math.sin(time * 4 + d.burstPhase) : 1
        const r = d.radius * pulse

        // Glow
        const glow = ctx!.createRadialGradient(d.x, y, 0, d.x, y, r * 3)
        glow.addColorStop(0, lane.color + Math.round(d.alpha * 100).toString(16).padStart(2, '0'))
        glow.addColorStop(1, 'transparent')
        ctx!.fillStyle = glow
        ctx!.beginPath(); ctx!.arc(d.x, y, r * 3, 0, Math.PI * 2); ctx!.fill()

        // Core dot
        ctx!.fillStyle = lane.color + Math.round(d.alpha * 220).toString(16).padStart(2, '0')
        ctx!.beginPath(); ctx!.arc(d.x, y, r, 0, Math.PI * 2); ctx!.fill()

        // Inner bright spot
        if (d.isBurst) {
          ctx!.fillStyle = '#ffffff88'
          ctx!.beginPath(); ctx!.arc(d.x, y, r * 0.3, 0, Math.PI * 2); ctx!.fill()
        }
      }

      // Ambient glow
      const ag = ctx!.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.4)
      ag.addColorStop(0, 'rgba(59,130,246,0.03)'); ag.addColorStop(1, 'transparent')
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
