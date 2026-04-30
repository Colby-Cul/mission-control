'use client'
import { useEffect, useRef } from 'react'

/**
 * Sessions HeroCanvas
 * Animation: Concentric user-presence rings pulsing outward from a central point,
 * with device icons (laptop, phone, tablet) drifting around the rings.
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

    // Pulse rings
    type Ring = { radius: number; alpha: number; speed: number; born: number }
    const rings: Ring[] = []
    let ringTimer = 0

    // Device icons as unicode chars drifting in orbits
    const DEVICES = ['💻', '📱', '⌚', '🖥️', '📟']
    type Device = { angle: number; orbitR: number; speed: number; label: string; phase: number }
    const devices: Device[] = DEVICES.map((label, i) => ({
      label,
      angle: (i / DEVICES.length) * Math.PI * 2,
      orbitR: 55 + i * 15,
      speed: 0.003 + i * 0.001,
      phase: Math.random() * Math.PI * 2,
    }))

    function draw() {
      time += 0.016
      ringTimer += 0.016
      ctx!.clearRect(0, 0, w, h)

      // Grid
      ctx!.strokeStyle = 'rgba(255,255,255,0.012)'
      ctx!.lineWidth = 0.5
      for (let x = 0; x < w; x += 60) { ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke() }
      for (let y = 0; y < h; y += 60) { ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke() }

      const cx = w * 0.5, cy = h * 0.5

      // Spawn new ring every 1.2s
      if (ringTimer > 1.2) {
        ringTimer = 0
        rings.push({ radius: 20, alpha: 0.7, speed: 40, born: time })
      }

      // Draw + age rings
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i]
        const elapsed = time - ring.born
        ring.radius = 20 + elapsed * ring.speed
        ring.alpha = Math.max(0, 0.7 - elapsed * 0.15)
        if (ring.alpha <= 0) { rings.splice(i, 1); continue }
        ctx!.strokeStyle = `rgba(59,130,246,${ring.alpha * 0.5})`
        ctx!.lineWidth = 1.5
        ctx!.beginPath(); ctx!.arc(cx, cy, ring.radius, 0, Math.PI * 2); ctx!.stroke()
      }

      // Static orbit rings (ghost)
      [80, 130, 180].forEach((r, i) => {
        ctx!.strokeStyle = `rgba(255,255,255,${0.03 + i * 0.01})`
        ctx!.lineWidth = 1
        ctx!.beginPath(); ctx!.arc(cx, cy, r, 0, Math.PI * 2); ctx!.stroke()
      })

      // Center node
      const centerGlow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 30)
      centerGlow.addColorStop(0, 'rgba(59,130,246,0.4)'); centerGlow.addColorStop(1, 'transparent')
      ctx!.fillStyle = centerGlow
      ctx!.beginPath(); ctx!.arc(cx, cy, 30, 0, Math.PI * 2); ctx!.fill()
      ctx!.fillStyle = '#3b82f6cc'
      ctx!.beginPath(); ctx!.arc(cx, cy, 10, 0, Math.PI * 2); ctx!.fill()
      ctx!.fillStyle = '#ffffff'
      ctx!.beginPath(); ctx!.arc(cx, cy, 4, 0, Math.PI * 2); ctx!.fill()

      // Device nodes orbiting
      devices.forEach(dev => {
        dev.angle += dev.speed
        const dx = cx + Math.cos(dev.angle) * dev.orbitR
        const dy = cy + Math.sin(dev.angle) * dev.orbitR
        const pulse = 1 + 0.15 * Math.sin(time * 3 + dev.phase)

        // Connection line
        ctx!.strokeStyle = 'rgba(59,130,246,0.15)'
        ctx!.lineWidth = 0.8
        ctx!.beginPath(); ctx!.moveTo(cx, cy); ctx!.lineTo(dx, dy); ctx!.stroke()

        // Device glow
        const dg = ctx!.createRadialGradient(dx, dy, 0, dx, dy, 16)
        dg.addColorStop(0, 'rgba(139,92,246,0.3)'); dg.addColorStop(1, 'transparent')
        ctx!.fillStyle = dg
        ctx!.beginPath(); ctx!.arc(dx, dy, 16, 0, Math.PI * 2); ctx!.fill()

        // Emoji
        ctx!.font = `${Math.round(14 * pulse)}px sans-serif`
        ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'
        ctx!.fillText(dev.label, dx, dy)
      })

      // Outer ambient
      const ag = ctx!.createRadialGradient(cx, cy, 0, cx, cy, w * 0.5)
      ag.addColorStop(0, 'rgba(139,92,246,0.04)'); ag.addColorStop(1, 'transparent')
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
