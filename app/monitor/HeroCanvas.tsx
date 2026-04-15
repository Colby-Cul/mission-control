'use client'
import { useEffect, useRef } from 'react'

/**
 * Monitor HeroCanvas
 * Animation: EKG/heartbeat line pulse across the center + animated vitals bar chart wave.
 * Multiple horizontal ECG traces at staggered vertical positions.
 * Periodic QRS spikes fire at random intervals, then flatline briefly.
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

    // EKG traces — each at different y-pos
    const TRACES = [
      { yFrac: 0.28, color: '#10b981', amp: 28, speed: 0.8, label: 'CPU' },
      { yFrac: 0.50, color: '#f97316', amp: 22, speed: 0.65, label: 'MEM' },
      { yFrac: 0.72, color: '#8b5cf6', amp: 18, speed: 0.9, label: 'NET' },
    ]

    // Bar chart vitals (right side)
    const VITALS = [
      { key: 'CPU',   pct: 0.42, color: '#10b981' },
      { key: 'MEM',   pct: 0.67, color: '#f97316' },
      { key: 'DISK',  pct: 0.31, color: '#8b5cf6' },
      { key: 'NET',   pct: 0.55, color: '#06b6d4' },
    ]

    // ECG waveform function — flat baseline with periodic sharp spike
    function ekgY(x: number, baseY: number, amp: number, speed: number, timeOff: number): number {
      const t = (x / w + timeOff * speed) * 3
      const phase = t % 1.0
      if (phase > 0.35 && phase < 0.42) return baseY - amp * 0.3 * Math.sin((phase - 0.35) / 0.07 * Math.PI)
      if (phase > 0.42 && phase < 0.48) return baseY + amp * 1.1 * Math.sin((phase - 0.42) / 0.06 * Math.PI)
      if (phase > 0.48 && phase < 0.52) return baseY - amp * 0.5 * Math.sin((phase - 0.48) / 0.04 * Math.PI)
      if (phase > 0.52 && phase < 0.58) return baseY + amp * 0.2 * Math.sin((phase - 0.52) / 0.06 * Math.PI)
      return baseY + Math.sin(t * 8 + timeOff) * 2
    }

    function draw() {
      time += 0.016
      ctx!.clearRect(0, 0, w, h)

      // Grid
      ctx!.strokeStyle = 'rgba(255,255,255,0.012)'
      ctx!.lineWidth = 0.5
      for (let x = 0; x < w; x += 60) { ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke() }
      for (let y = 0; y < h; y += 60) { ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke() }

      const traceWidth = w * 0.62

      TRACES.forEach(trace => {
        const baseY = h * trace.yFrac

        // Glow trail
        for (let pass = 0; pass < 2; pass++) {
          ctx!.beginPath()
          for (let x = 0; x < traceWidth; x += 2) {
            const y = ekgY(x, baseY, trace.amp, trace.speed, time)
            if (x === 0) ctx!.moveTo(x, y); else ctx!.lineTo(x, y)
          }
          if (pass === 0) {
            ctx!.strokeStyle = trace.color + '22'
            ctx!.lineWidth = 6
          } else {
            ctx!.strokeStyle = trace.color + 'cc'
            ctx!.lineWidth = 1.5
          }
          ctx!.stroke()
        }

        // Moving cursor dot at leading edge
        const cursorX = traceWidth - 4
        const cursorY = ekgY(cursorX, baseY, trace.amp, trace.speed, time)
        const glow = ctx!.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, 8)
        glow.addColorStop(0, trace.color + 'cc')
        glow.addColorStop(1, 'transparent')
        ctx!.fillStyle = glow
        ctx!.beginPath(); ctx!.arc(cursorX, cursorY, 8, 0, Math.PI * 2); ctx!.fill()
        ctx!.fillStyle = trace.color
        ctx!.beginPath(); ctx!.arc(cursorX, cursorY, 3, 0, Math.PI * 2); ctx!.fill()

        // Label
        ctx!.fillStyle = trace.color + '99'
        ctx!.font = '500 9px "IBM Plex Mono"'
        ctx!.textAlign = 'left'; ctx!.textBaseline = 'middle'
        ctx!.fillText(trace.label, 4, baseY)
      })

      // Right panel: animated bar chart vitals
      const barPanelX = w * 0.68
      const barW = 14, barGap = 22
      VITALS.forEach((v, i) => {
        const bx = barPanelX + i * (barW + barGap)
        const maxH = h * 0.55
        const wave = 0.06 * Math.sin(time * 1.5 + i * 1.1)
        const pct = Math.max(0.05, Math.min(0.95, v.pct + wave))
        const bh = maxH * pct
        const by = h * 0.72 - bh

        // Bar glow
        const barGrad = ctx!.createLinearGradient(bx, by, bx, by + bh)
        barGrad.addColorStop(0, v.color + 'dd')
        barGrad.addColorStop(1, v.color + '22')
        ctx!.fillStyle = barGrad
        ctx!.beginPath()
        ctx!.roundRect ? ctx!.roundRect(bx, by, barW, bh, [3, 3, 0, 0]) : ctx!.rect(bx, by, barW, bh)
        ctx!.fill()

        // Track background
        ctx!.fillStyle = 'rgba(255,255,255,0.04)'
        ctx!.beginPath()
        ctx!.roundRect ? ctx!.roundRect(bx, h * 0.72 - maxH, barW, maxH, 3) : ctx!.rect(bx, h * 0.72 - maxH, barW, maxH)
        ctx!.fill()

        // Label
        ctx!.fillStyle = v.color + '99'
        ctx!.font = '500 8px "IBM Plex Mono"'
        ctx!.textAlign = 'center'; ctx!.textBaseline = 'top'
        ctx!.fillText(v.key, bx + barW / 2, h * 0.74)

        // Pct
        ctx!.fillStyle = v.color + 'bb'
        ctx!.font = '600 8px "IBM Plex Mono"'
        ctx!.textBaseline = 'bottom'
        ctx!.fillText(Math.round(pct * 100) + '%', bx + barW / 2, by - 2)
      })

      // Ambient center glow
      const ag = ctx!.createRadialGradient(w * 0.3, h * 0.5, 0, w * 0.3, h * 0.5, w * 0.35)
      ag.addColorStop(0, 'rgba(16,185,129,0.04)'); ag.addColorStop(1, 'transparent')
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
