'use client'
import { useEffect, useRef } from 'react'

/**
 * Memory HeroCanvas
 * Animation: Neural net web — nodes arranged in a grid-like web.
 * Synaptic pulses ripple outward from randomly activated nodes.
 * Lines dim/brighten as signal propagates.
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

    type NNode = { x: number; y: number; activation: number; phase: number; color: string }
    type NPulse = { from: number; to: number; t: number; speed: number; color: string }

    // Build neural net grid
    const ROWS = 4, COLS = 7
    const nodes: NNode[] = []
    const edges: [number, number][] = []
    const COLORS = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#06b6d4', '#a3e635', '#f59e0b']

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        nodes.push({
          x: 0, y: 0, // computed in draw based on w/h
          activation: 0,
          phase: Math.random() * Math.PI * 2,
          color: COLORS[(r * COLS + c) % COLORS.length],
        })
      }
    }

    // Build connections: horizontal, vertical, and some diagonals
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c
        if (c < COLS - 1) edges.push([i, i + 1])
        if (r < ROWS - 1) edges.push([i, i + COLS])
        if (r < ROWS - 1 && c < COLS - 1 && Math.random() > 0.5) edges.push([i, i + COLS + 1])
        if (r < ROWS - 1 && c > 0 && Math.random() > 0.5) edges.push([i, i + COLS - 1])
      }
    }

    const pulses: NPulse[] = []
    let pulseTimer = 0
    let activationTimer = 0

    function draw() {
      time += 0.016
      pulseTimer += 0.016
      activationTimer += 0.016
      ctx!.clearRect(0, 0, w, h)

      // Grid overlay
      ctx!.strokeStyle = 'rgba(255,255,255,0.012)'
      ctx!.lineWidth = 0.5
      for (let x = 0; x < w; x += 60) { ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke() }
      for (let y = 0; y < h; y += 60) { ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke() }

      // Compute node positions (responsive to w/h)
      const marginX = w * 0.08, marginY = h * 0.15
      const cellW = (w - marginX * 2) / (COLS - 1)
      const cellH = (h - marginY * 2) / (ROWS - 1)
      nodes.forEach((n, i) => {
        const r = Math.floor(i / COLS), c = i % COLS
        n.x = marginX + c * cellW
        n.y = marginY + r * cellH
      })

      // Activate a random node periodically
      if (activationTimer > 0.6) {
        activationTimer = 0
        const ni = Math.floor(Math.random() * nodes.length)
        nodes[ni].activation = 1.0
        // Spawn pulses along its edges
        edges.forEach(([a, b]) => {
          if (a === ni || b === ni) {
            const other = a === ni ? b : a
            pulses.push({ from: ni, to: other, t: 0, speed: 0.012 + Math.random() * 0.01, color: nodes[ni].color })
          }
        })
      }

      // Decay activations
      nodes.forEach(n => { n.activation = Math.max(0, n.activation - 0.018) })

      // Spawn ambient pulses
      if (pulseTimer > 0.25) {
        pulseTimer = 0
        if (edges.length > 0) {
          const ei = Math.floor(Math.random() * edges.length)
          const [a] = edges[ei]
          pulses.push({ from: edges[ei][0], to: edges[ei][1], t: 0, speed: 0.008 + Math.random() * 0.008, color: nodes[a].color })
        }
      }

      // Draw edges
      edges.forEach(([a, b]) => {
        const na = nodes[a], nb = nodes[b]
        const alpha = 0.05 + Math.max(na.activation, nb.activation) * 0.25
        const grad = ctx!.createLinearGradient(na.x, na.y, nb.x, nb.y)
        grad.addColorStop(0, na.color + Math.round(alpha * 255).toString(16).padStart(2,'0'))
        grad.addColorStop(1, nb.color + Math.round(alpha * 200).toString(16).padStart(2,'0'))
        ctx!.strokeStyle = grad
        ctx!.lineWidth = 0.8
        ctx!.beginPath(); ctx!.moveTo(na.x, na.y); ctx!.lineTo(nb.x, nb.y); ctx!.stroke()
      })

      // Draw pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i]
        p.t += p.speed
        if (p.t > 1) { pulses.splice(i, 1); continue }
        const na = nodes[p.from], nb = nodes[p.to]
        const px = na.x + (nb.x - na.x) * p.t
        const py = na.y + (nb.y - na.y) * p.t
        const pg = ctx!.createRadialGradient(px, py, 0, px, py, 7)
        pg.addColorStop(0, p.color + 'ee'); pg.addColorStop(1, 'transparent')
        ctx!.fillStyle = pg
        ctx!.beginPath(); ctx!.arc(px, py, 7, 0, Math.PI * 2); ctx!.fill()
        ctx!.fillStyle = '#ffffffcc'
        ctx!.beginPath(); ctx!.arc(px, py, 2, 0, Math.PI * 2); ctx!.fill()
      }

      // Draw nodes
      nodes.forEach(n => {
        const pulse = n.activation > 0.1 ? 1 + n.activation * 0.5 : 1 + 0.1 * Math.sin(time * 1.5 + n.phase)
        const r = 5 * pulse

        if (n.activation > 0.05) {
          const glow = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4)
          glow.addColorStop(0, n.color + Math.round(n.activation * 80).toString(16).padStart(2,'0'))
          glow.addColorStop(1, 'transparent')
          ctx!.fillStyle = glow
          ctx!.beginPath(); ctx!.arc(n.x, n.y, r * 4, 0, Math.PI * 2); ctx!.fill()
        }

        ctx!.fillStyle = n.activation > 0.1 ? n.color + 'dd' : n.color + '44'
        ctx!.beginPath(); ctx!.arc(n.x, n.y, r, 0, Math.PI * 2); ctx!.fill()
      })

      // Overall ambient
      const ag = ctx!.createRadialGradient(w*0.5, h*0.5, 0, w*0.5, h*0.5, w*0.5)
      ag.addColorStop(0, 'rgba(139,92,246,0.03)'); ag.addColorStop(1, 'transparent')
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
