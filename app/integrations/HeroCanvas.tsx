'use client'
import { useEffect, useRef } from 'react'

/**
 * Integrations HeroCanvas
 * Animation: Hub-spoke network — central MC node at center with spokes radiating
 * outward to named integration nodes. Data packets flow along active spokes.
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

    const INTEGRATIONS = [
      { name: 'Plaid',      color: '#10b981', connected: true  },
      { name: 'Stripe',     color: '#8b5cf6', connected: true  },
      { name: 'Supabase',   color: '#3ecf8e', connected: true  },
      { name: 'Gmail',      color: '#ef4444', connected: true  },
      { name: 'Lodgify',    color: '#3b82f6', connected: false },
      { name: 'Notion',     color: '#e2e8f0', connected: false },
      { name: 'QuickBooks', color: '#2ca01c', connected: false },
      { name: 'Slack',      color: '#e01e5a', connected: true  },
    ]

    type Packet = { t: number; speed: number; spoke: number; toCenter: boolean }
    const packets: Packet[] = []
    let pTimer = 0

    function draw() {
      time += 0.016
      pTimer += 0.016
      ctx!.clearRect(0, 0, w, h)

      // Grid
      ctx!.strokeStyle = 'rgba(255,255,255,0.012)'
      ctx!.lineWidth = 0.5
      for (let x = 0; x < w; x += 60) { ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke() }
      for (let y = 0; y < h; y += 60) { ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke() }

      const cx = w * 0.5, cy = h * 0.5
      const spokeLen = Math.min(w, h) * 0.34

      // Spawn packets on connected spokes
      if (pTimer > 0.4) {
        pTimer = 0
        const connected = INTEGRATIONS.filter(i => i.connected)
        if (connected.length > 0) {
          const idx = INTEGRATIONS.indexOf(connected[Math.floor(Math.random() * connected.length)])
          packets.push({ t: 0, speed: 0.008 + Math.random() * 0.006, spoke: idx, toCenter: Math.random() > 0.5 })
        }
      }

      // Draw spokes and spoke nodes
      INTEGRATIONS.forEach((intg, i) => {
        const angle = (i / INTEGRATIONS.length) * Math.PI * 2 - Math.PI / 2
        const nx = cx + Math.cos(angle) * spokeLen
        const ny = cy + Math.sin(angle) * spokeLen

        // Spoke line
        if (intg.connected) {
          const grad = ctx!.createLinearGradient(cx, cy, nx, ny)
          grad.addColorStop(0, intg.color + '44'); grad.addColorStop(1, intg.color + '22')
          ctx!.strokeStyle = grad; ctx!.lineWidth = 1.2
        } else {
          ctx!.strokeStyle = 'rgba(255,255,255,0.06)'; ctx!.lineWidth = 0.8
        }
        ctx!.setLineDash(intg.connected ? [] : [4, 4])
        ctx!.beginPath(); ctx!.moveTo(cx, cy); ctx!.lineTo(nx, ny); ctx!.stroke()
        ctx!.setLineDash([])

        // Spoke node
        const nr = intg.connected ? 16 : 12
        if (intg.connected) {
          const ng = ctx!.createRadialGradient(nx, ny, 0, nx, ny, nr * 2)
          ng.addColorStop(0, intg.color + '40'); ng.addColorStop(1, 'transparent')
          ctx!.fillStyle = ng
          ctx!.beginPath(); ctx!.arc(nx, ny, nr * 2, 0, Math.PI * 2); ctx!.fill()
        }
        ctx!.fillStyle = intg.connected ? intg.color + 'bb' : 'rgba(255,255,255,0.12)'
        ctx!.beginPath(); ctx!.arc(nx, ny, nr, 0, Math.PI * 2); ctx!.fill()
        ctx!.strokeStyle = intg.connected ? intg.color : 'rgba(255,255,255,0.2)'
        ctx!.lineWidth = 1.5
        ctx!.stroke()

        // Label
        const lx = cx + Math.cos(angle) * (spokeLen + 22)
        const ly = cy + Math.sin(angle) * (spokeLen + 22)
        ctx!.fillStyle = intg.connected ? '#ffffffaa' : 'rgba(255,255,255,0.3)'
        ctx!.font = '500 9px "IBM Plex Mono"'
        ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'
        ctx!.fillText(intg.name, lx, ly)
      })

      // Move + draw packets
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i]
        p.t += p.speed
        if (p.t > 1) { packets.splice(i, 1); continue }

        const angle = (p.spoke / INTEGRATIONS.length) * Math.PI * 2 - Math.PI / 2
        const nx = cx + Math.cos(angle) * spokeLen
        const ny = cy + Math.sin(angle) * spokeLen
        const t = p.toCenter ? p.t : 1 - p.t
        const px = nx + (cx - nx) * t
        const py = ny + (cy - ny) * t

        const intg = INTEGRATIONS[p.spoke]
        const pg = ctx!.createRadialGradient(px, py, 0, px, py, 6)
        pg.addColorStop(0, intg.color + 'ee'); pg.addColorStop(1, 'transparent')
        ctx!.fillStyle = pg
        ctx!.beginPath(); ctx!.arc(px, py, 6, 0, Math.PI * 2); ctx!.fill()
        ctx!.fillStyle = '#ffffffcc'
        ctx!.beginPath(); ctx!.arc(px, py, 2, 0, Math.PI * 2); ctx!.fill()
      }

      // Center hub node
      const hg = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 22)
      hg.addColorStop(0, 'rgba(59,130,246,0.5)'); hg.addColorStop(1, 'transparent')
      ctx!.fillStyle = hg
      ctx!.beginPath(); ctx!.arc(cx, cy, 22, 0, Math.PI * 2); ctx!.fill()
      ctx!.fillStyle = '#3b82f6dd'
      ctx!.beginPath(); ctx!.arc(cx, cy, 14, 0, Math.PI * 2); ctx!.fill()
      ctx!.fillStyle = '#ffffff'
      ctx!.font = '700 9px "IBM Plex Mono"'
      ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'
      ctx!.fillText('MC', cx, cy)

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
