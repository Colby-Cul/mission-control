'use client'
import { useEffect } from 'react'

/**
 * Agents HeroCanvas
 * Animation: swarm — 12-20 agent-dot nodes moving in organic patterns with
 * connection lines rendered when nodes are close (collaborating).
 * Nodes are colored by agent type.
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

      // Agent type colors
      const TYPE_COLORS: Record<string, string> = {
        orchestrator: '#f97316',
        worker:       '#10b981',
        assistant:    '#8b5cf6',
        research:     '#06b6d4',
        validator:    '#f59e0b',
        specialist:   '#ec4899',
      }
      const TYPE_KEYS = Object.keys(TYPE_COLORS)

      interface AgentNode {
        x: number
        y: number
        vx: number
        vy: number
        radius: number
        color: string
        type: string
        pulsePhase: number
        /** wander target */
        tx: number
        ty: number
        active: boolean
      }

      const NODE_COUNT = 16
      const nodes: AgentNode[] = []

      function makeNode(): AgentNode {
        const type = TYPE_KEYS[Math.floor(Math.random() * TYPE_KEYS.length)]
        return {
          x: Math.random() * (w || 800),
          y: Math.random() * (h || 480),
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: 4 + Math.random() * 4,
          color: TYPE_COLORS[type],
          type,
          pulsePhase: Math.random() * Math.PI * 2,
          tx: Math.random() * (w || 800),
          ty: Math.random() * (h || 480),
          active: Math.random() > 0.3,
        }
      }

      for (let i = 0; i < NODE_COUNT; i++) nodes.push(makeNode())

      const CONNECT_DIST = 120
      const WANDER_CHANGE = 0.008

      function draw() {
        time += 0.016
        ctx!.clearRect(0, 0, w, h)

        // Subtle dark grid
        ctx!.strokeStyle = 'rgba(255,255,255,0.012)'
        ctx!.lineWidth = 0.5
        for (let x = 0; x < w; x += 80) {
          ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke()
        }
        for (let y = 0; y < h; y += 60) {
          ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke()
        }

        // Update node positions (organic wander)
        nodes.forEach(n => {
          // Occasionally pick a new wander target
          if (Math.random() < WANDER_CHANGE) {
            n.tx = 40 + Math.random() * (w - 80)
            n.ty = 40 + Math.random() * (h - 80)
          }
          // Steer toward target (very gently)
          const dx = n.tx - n.x
          const dy = n.ty - n.y
          n.vx += dx * 0.0002
          n.vy += dy * 0.0002

          // Speed cap
          const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy)
          const maxSpeed = 0.7
          if (speed > maxSpeed) { n.vx = (n.vx / speed) * maxSpeed; n.vy = (n.vy / speed) * maxSpeed }

          n.x += n.vx
          n.y += n.vy

          // Soft boundary bounce
          if (n.x < 20 || n.x > w - 20) { n.vx *= -0.8; n.x = Math.max(20, Math.min(w - 20, n.x)) }
          if (n.y < 20 || n.y > h - 20) { n.vy *= -0.8; n.y = Math.max(20, Math.min(h - 20, n.y)) }
        })

        // Draw connection lines between nearby nodes
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i]
            const b = nodes[j]
            const dx = b.x - a.x
            const dy = b.y - a.y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < CONNECT_DIST && a.active && b.active) {
              const alpha = (1 - dist / CONNECT_DIST) * 0.25
              // Animated pulse along the line
              const pulseT = (time * 1.2 + i * 0.5) % 1
              const px = a.x + dx * pulseT
              const py = a.y + dy * pulseT

              const lg = ctx!.createLinearGradient(a.x, a.y, b.x, b.y)
              lg.addColorStop(0, a.color + '40')
              lg.addColorStop(1, b.color + '40')
              ctx!.strokeStyle = lg
              ctx!.lineWidth = 1
              ctx!.globalAlpha = alpha
              ctx!.beginPath()
              ctx!.moveTo(a.x, a.y)
              ctx!.lineTo(b.x, b.y)
              ctx!.stroke()
              ctx!.globalAlpha = 1

              // Moving packet along the line
              ctx!.beginPath()
              ctx!.arc(px, py, 2, 0, Math.PI * 2)
              ctx!.fillStyle = a.color
              ctx!.globalAlpha = alpha * 2
              ctx!.fill()
              ctx!.globalAlpha = 1
            }
          }
        }

        // Draw nodes
        nodes.forEach(n => {
          const pulseMag = n.active ? 0.4 + 0.3 * Math.sin(time * 2.5 + n.pulsePhase) : 0.2
          // Outer glow
          const glow = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * 4)
          glow.addColorStop(0, n.color + Math.round(pulseMag * 80).toString(16).padStart(2, '0'))
          glow.addColorStop(1, 'transparent')
          ctx!.fillStyle = glow
          ctx!.beginPath()
          ctx!.arc(n.x, n.y, n.radius * 4, 0, Math.PI * 2)
          ctx!.fill()

          // Core dot
          ctx!.beginPath()
          ctx!.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
          ctx!.fillStyle = n.active ? n.color : n.color + '50'
          ctx!.fill()

          // Pulse ring
          if (n.active) {
            const ringR = n.radius + 4 + 3 * Math.sin(time * 2.5 + n.pulsePhase)
            ctx!.beginPath()
            ctx!.arc(n.x, n.y, ringR, 0, Math.PI * 2)
            ctx!.strokeStyle = n.color + '60'
            ctx!.lineWidth = 1
            ctx!.stroke()
          }
        })

        // Ambient glow blobs
        const g1 = ctx!.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, w * 0.3)
        g1.addColorStop(0, 'rgba(249,115,22,0.04)')
        g1.addColorStop(1, 'transparent')
        ctx!.fillStyle = g1
        ctx!.fillRect(0, 0, w, h)

        const g2 = ctx!.createRadialGradient(w * 0.7, h * 0.6, 0, w * 0.7, h * 0.6, w * 0.25)
        g2.addColorStop(0, 'rgba(139,92,246,0.05)')
        g2.addColorStop(1, 'transparent')
        ctx!.fillStyle = g2
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
