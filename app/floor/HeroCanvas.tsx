'use client'
import { useEffect, useRef } from 'react'

/**
 * Floor HeroCanvas
 * Animation: Top-down floor-plan view — desk/workstation nodes on a grid.
 * Agent dots move between workstations, trail fading behind them.
 * Active workstations glow; idle ones dim.
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

    // Workstation layout (floor-plan grid)
    const STATIONS = [
      { xFrac: 0.15, yFrac: 0.25, label: 'Finance',   color: '#10b981', active: true  },
      { xFrac: 0.35, yFrac: 0.25, label: 'Research',  color: '#8b5cf6', active: true  },
      { xFrac: 0.55, yFrac: 0.25, label: 'Strategy',  color: '#f97316', active: false },
      { xFrac: 0.75, yFrac: 0.25, label: 'Legal',     color: '#f59e0b', active: false },
      { xFrac: 0.15, yFrac: 0.70, label: 'Support',   color: '#ec4899', active: true  },
      { xFrac: 0.35, yFrac: 0.70, label: 'Dev',       color: '#06b6d4', active: true  },
      { xFrac: 0.55, yFrac: 0.70, label: 'Ops',       color: '#a3e635', active: false },
      { xFrac: 0.75, yFrac: 0.70, label: 'Marketing', color: '#f97316', active: true  },
    ]

    // Agent movers
    type Agent = {
      x: number; y: number; targetStation: number; speed: number
      color: string; name: string; trail: { x: number; y: number }[]
      phase: number
    }

    const AGENT_NAMES = ['A-01', 'A-02', 'A-03', 'A-04']
    const AGENT_COLORS = ['#f97316', '#8b5cf6', '#10b981', '#ec4899']

    const agents: Agent[] = AGENT_NAMES.map((name, i) => {
      const startSt = i % STATIONS.length
      return {
        x: 0, y: 0, // set in draw on first run
        targetStation: startSt,
        speed: 0.4 + i * 0.15,
        color: AGENT_COLORS[i],
        name,
        trail: [],
        phase: Math.random() * Math.PI * 2,
      }
    })

    let agentTimer = 0

    function draw() {
      time += 0.016
      agentTimer += 0.016
      ctx!.clearRect(0, 0, w, h)

      // Floor grid (tiled squares representing the floor plan)
      ctx!.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx!.lineWidth = 0.5
      const gridSize = 40
      for (let x = 0; x < w; x += gridSize) { ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke() }
      for (let y = 0; y < h; y += gridSize) { ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke() }

      // Compute station screen positions
      const stPos = STATIONS.map(st => ({ x: w * st.xFrac, y: h * st.yFrac }))

      // Periodically reassign agents to new stations
      if (agentTimer > 2.5) {
        agentTimer = 0
        agents.forEach(agent => {
          if (Math.random() > 0.5) {
            let newTarget
            do { newTarget = Math.floor(Math.random() * STATIONS.length) }
            while (newTarget === agent.targetStation)
            agent.targetStation = newTarget
          }
        })
      }

      // Initialize agent positions on first draw
      agents.forEach((agent, i) => {
        if (agent.x === 0 && agent.y === 0) {
          const st = stPos[agent.targetStation]
          agent.x = st.x + (Math.random() - 0.5) * 20
          agent.y = st.y + (Math.random() - 0.5) * 20
        }
      })

      // Draw workstations (desk icons)
      STATIONS.forEach((st, i) => {
        const { x, y } = stPos[i]
        const pulse = st.active ? 1 + 0.15 * Math.sin(time * 2 + i) : 1

        // Desk rectangle
        const dw = 48, dh = 28
        ctx!.fillStyle = st.active ? st.color + '18' : 'rgba(255,255,255,0.03)'
        ctx!.strokeStyle = st.active ? st.color + '55' : 'rgba(255,255,255,0.1)'
        ctx!.lineWidth = 1
        ctx!.beginPath()
        ctx!.roundRect
          ? ctx!.roundRect(x - dw/2, y - dh/2, dw, dh, 4)
          : ctx!.rect(x - dw/2, y - dh/2, dw, dh)
        ctx!.fill()
        ctx!.stroke()

        // Status dot
        const dotColor = st.active ? st.color : 'rgba(255,255,255,0.2)'
        ctx!.fillStyle = dotColor
        ctx!.beginPath(); ctx!.arc(x + dw/2 - 6, y - dh/2 + 6, 3 * pulse, 0, Math.PI * 2); ctx!.fill()

        // Label
        ctx!.fillStyle = st.active ? '#ffffffcc' : 'rgba(255,255,255,0.3)'
        ctx!.font = '500 8px "IBM Plex Mono"'
        ctx!.textAlign = 'center'; ctx!.textBaseline = 'top'
        ctx!.fillText(st.label, x, y + dh/2 + 4)
      })

      // Move and draw agents
      agents.forEach(agent => {
        const target = stPos[agent.targetStation]
        const dx = target.x - agent.x, dy = target.y - agent.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist > 3) {
          const spd = agent.speed * 0.6
          agent.x += (dx / dist) * spd
          agent.y += (dy / dist) * spd
        }

        // Trail
        agent.trail.push({ x: agent.x, y: agent.y })
        if (agent.trail.length > 20) agent.trail.shift()

        // Draw trail
        if (agent.trail.length > 1) {
          for (let i = 1; i < agent.trail.length; i++) {
            const alpha = (i / agent.trail.length) * 0.4
            ctx!.strokeStyle = agent.color + Math.round(alpha * 255).toString(16).padStart(2,'0')
            ctx!.lineWidth = 2
            ctx!.beginPath()
            ctx!.moveTo(agent.trail[i - 1].x, agent.trail[i - 1].y)
            ctx!.lineTo(agent.trail[i].x, agent.trail[i].y)
            ctx!.stroke()
          }
        }

        // Agent dot
        const pulse = 1 + 0.2 * Math.sin(time * 4 + agent.phase)
        const ag = ctx!.createRadialGradient(agent.x, agent.y, 0, agent.x, agent.y, 10)
        ag.addColorStop(0, agent.color + 'cc'); ag.addColorStop(1, 'transparent')
        ctx!.fillStyle = ag
        ctx!.beginPath(); ctx!.arc(agent.x, agent.y, 10, 0, Math.PI * 2); ctx!.fill()
        ctx!.fillStyle = agent.color
        ctx!.beginPath(); ctx!.arc(agent.x, agent.y, 5 * pulse, 0, Math.PI * 2); ctx!.fill()
        ctx!.fillStyle = '#ffffffcc'
        ctx!.beginPath(); ctx!.arc(agent.x, agent.y, 2, 0, Math.PI * 2); ctx!.fill()

        // Name tag
        ctx!.fillStyle = agent.color + 'aa'
        ctx!.font = '600 7px "IBM Plex Mono"'
        ctx!.textAlign = 'center'; ctx!.textBaseline = 'bottom'
        ctx!.fillText(agent.name, agent.x, agent.y - 7)
      })

      // Ambient
      const ag2 = ctx!.createRadialGradient(w*0.5, h*0.5, 0, w*0.5, h*0.5, w*0.4)
      ag2.addColorStop(0, 'rgba(249,115,22,0.03)'); ag2.addColorStop(1, 'transparent')
      ctx!.fillStyle = ag2; ctx!.fillRect(0, 0, w, h)

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
