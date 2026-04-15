'use client'
import { useEffect, useRef } from 'react'

/**
 * Team HeroCanvas
 * Animation: network graph of team/role nodes.
 * Nodes pulse when "recently active". Color by role category.
 * Connections between collaborating nodes carry flowing particles.
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

    const ROLE_COLORS: Record<string, string> = {
      leadership: '#f97316', engineering: '#8b5cf6', finance: '#10b981',
      legal: '#f59e0b', operations: '#ec4899', marketing: '#06b6d4', agents: '#a3e635',
    }
    const ROLE_KEYS = Object.keys(ROLE_COLORS)

    type Node = {
      x: number; y: number; vx: number; vy: number
      role: string; color: string; radius: number
      label: string; pulsePhase: number; active: boolean
    }
    type Particle = { edgeIdx: number; t: number; speed: number; alpha: number }

    const roleLabels = ['CEO', 'CTO', 'CFO', 'Legal', 'Ops', 'Mktg', 'AI-1', 'AI-2', 'AI-3', 'Dev', 'PM']
    const nodes: Node[] = roleLabels.map((label, i) => {
      const angle = (i / roleLabels.length) * Math.PI * 2 - Math.PI / 2
      const rx = w * 0.28 || 120, ry = h * 0.32 || 80
      const cx = w * 0.5 || 200, cy = h * 0.5 || 120
      const jitter = () => (Math.random() - 0.5) * 50
      return {
        x: cx + Math.cos(angle) * rx + jitter(),
        y: cy + Math.sin(angle) * ry + jitter(),
        vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12,
        role: ROLE_KEYS[i % ROLE_KEYS.length],
        color: ROLE_COLORS[ROLE_KEYS[i % ROLE_KEYS.length]],
        radius: i < 3 ? 10 : 7,
        label, pulsePhase: Math.random() * Math.PI * 2,
        active: Math.random() > 0.35,
      }
    })

    const EDGES: [number, number][] = [
      [0,1],[0,2],[0,4],[1,6],[1,7],[1,8],[1,9],[2,3],[2,4],[3,5],[4,5],[4,10],[0,5],[6,8],[7,9],[1,10]
    ]

    const particles: Particle[] = []
    for (let ei = 0; ei < EDGES.length; ei++) {
      for (let j = 0; j < 3; j++) {
        particles.push({ edgeIdx: ei, t: Math.random(), speed: 0.003 + Math.random() * 0.004, alpha: 0.4 + Math.random() * 0.4 })
      }
    }

    function draw() {
      time += 0.016
      ctx!.clearRect(0, 0, w, h)

      ctx!.strokeStyle = 'rgba(255,255,255,0.012)'
      ctx!.lineWidth = 0.5
      for (let x = 0; x < w; x += 60) { ctx!.beginPath(); ctx!.moveTo(x,0); ctx!.lineTo(x,h); ctx!.stroke() }
      for (let y = 0; y < h; y += 60) { ctx!.beginPath(); ctx!.moveTo(0,y); ctx!.lineTo(w,y); ctx!.stroke() }

      EDGES.forEach(([a, b]) => {
        const na = nodes[a], nb = nodes[b]
        const grad = ctx!.createLinearGradient(na.x, na.y, nb.x, nb.y)
        grad.addColorStop(0, na.color + '33'); grad.addColorStop(1, nb.color + '33')
        ctx!.strokeStyle = grad; ctx!.lineWidth = 0.8
        ctx!.beginPath(); ctx!.moveTo(na.x, na.y); ctx!.lineTo(nb.x, nb.y); ctx!.stroke()
      })

      particles.forEach(p => {
        p.t += p.speed; if (p.t > 1) p.t -= 1
        const [a, b] = EDGES[p.edgeIdx]
        const na = nodes[a], nb = nodes[b]
        const px = na.x + (nb.x - na.x) * p.t
        const py = na.y + (nb.y - na.y) * p.t
        const glow = ctx!.createRadialGradient(px, py, 0, px, py, 5)
        glow.addColorStop(0, na.color + Math.round(p.alpha * 200).toString(16).padStart(2,'0'))
        glow.addColorStop(1, 'transparent')
        ctx!.fillStyle = glow
        ctx!.beginPath(); ctx!.arc(px, py, 5, 0, Math.PI * 2); ctx!.fill()
        ctx!.fillStyle = na.color + 'cc'
        ctx!.beginPath(); ctx!.arc(px, py, 2, 0, Math.PI * 2); ctx!.fill()
      })

      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy
        if (n.x < 50 || n.x > w - 50) n.vx *= -1
        if (n.y < 30 || n.y > h - 30) n.vy *= -1
        const pulse = n.active ? 1 + 0.25 * Math.sin(time * 2.5 + n.pulsePhase) : 1
        const r = n.radius * pulse
        const glow = ctx!.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3.5)
        glow.addColorStop(0, n.color + (n.active ? '40' : '20')); glow.addColorStop(1, 'transparent')
        ctx!.fillStyle = glow
        ctx!.beginPath(); ctx!.arc(n.x, n.y, r * 3.5, 0, Math.PI * 2); ctx!.fill()
        ctx!.fillStyle = n.color + (n.active ? 'cc' : '55')
        ctx!.beginPath(); ctx!.arc(n.x, n.y, r, 0, Math.PI * 2); ctx!.fill()
        ctx!.strokeStyle = n.color + 'aa'; ctx!.lineWidth = 1.5; ctx!.stroke()
        if (n.active) {
          ctx!.fillStyle = '#ffffff'
          ctx!.beginPath(); ctx!.arc(n.x, n.y, r * 0.35, 0, Math.PI * 2); ctx!.fill()
        }
        ctx!.font = '600 9px "IBM Plex Mono"'
        ctx!.fillStyle = 'rgba(255,255,255,0.55)'
        ctx!.textAlign = 'center'; ctx!.textBaseline = 'top'
        ctx!.fillText(n.label, n.x, n.y + r + 4)
      })

      const ag = ctx!.createRadialGradient(w*0.5, h*0.5, 0, w*0.5, h*0.5, w*0.3)
      ag.addColorStop(0, 'rgba(249,115,22,0.03)'); ag.addColorStop(1, 'transparent')
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
