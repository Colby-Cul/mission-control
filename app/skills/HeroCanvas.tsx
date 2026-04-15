'use client'
import { useEffect, useRef } from 'react'

/**
 * Skills HeroCanvas
 * Animation: Constellation / skill-tree — nodes arranged in a tree pattern
 * with connecting lines that light up sequentially in orange→purple gradient.
 * Unlocked nodes glow; locked nodes are dim. Lines pulse as they activate.
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

    type Node = { xFrac: number; yFrac: number; unlocked: boolean; phase: number; color: string; label: string }
    type Edge = [number, number]

    const NODES: Node[] = [
      // Root
      { xFrac: 0.5,  yFrac: 0.85, unlocked: true,  phase: 0,    color: '#f97316', label: 'Core' },
      // Level 1
      { xFrac: 0.3,  yFrac: 0.65, unlocked: true,  phase: 0.5,  color: '#f97316', label: 'Finance' },
      { xFrac: 0.5,  yFrac: 0.65, unlocked: true,  phase: 1.0,  color: '#ec4899', label: 'Strategy' },
      { xFrac: 0.7,  yFrac: 0.65, unlocked: true,  phase: 1.5,  color: '#8b5cf6', label: 'Agents' },
      // Level 2
      { xFrac: 0.18, yFrac: 0.45, unlocked: true,  phase: 2.0,  color: '#10b981', label: 'Tax' },
      { xFrac: 0.34, yFrac: 0.45, unlocked: false, phase: 2.5,  color: '#f59e0b', label: 'Invest' },
      { xFrac: 0.5,  yFrac: 0.45, unlocked: false, phase: 3.0,  color: '#8b5cf6', label: 'Systems' },
      { xFrac: 0.66, yFrac: 0.45, unlocked: false, phase: 3.5,  color: '#ec4899', label: 'Scale' },
      { xFrac: 0.82, yFrac: 0.45, unlocked: false, phase: 4.0,  color: '#06b6d4', label: 'AI Ops' },
      // Level 3 (locked)
      { xFrac: 0.26, yFrac: 0.25, unlocked: false, phase: 4.5,  color: '#a3e635', label: 'Legacy' },
      { xFrac: 0.5,  yFrac: 0.22, unlocked: false, phase: 5.0,  color: '#f97316', label: 'Empire' },
      { xFrac: 0.74, yFrac: 0.25, unlocked: false, phase: 5.5,  color: '#8b5cf6', label: 'Automate' },
    ]

    const EDGES: Edge[] = [
      [0,1],[0,2],[0,3],
      [1,4],[1,5],[2,6],[3,7],[3,8],
      [4,9],[5,10],[6,10],[7,11],[8,11],
    ]

    function draw() {
      time += 0.016
      ctx!.clearRect(0, 0, w, h)

      // Grid
      ctx!.strokeStyle = 'rgba(255,255,255,0.012)'
      ctx!.lineWidth = 0.5
      for (let x = 0; x < w; x += 60) { ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke() }
      for (let y = 0; y < h; y += 60) { ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke() }

      // Compute node screen positions
      const nodePos = NODES.map(n => ({ x: w * n.xFrac, y: h * n.yFrac }))

      // Draw edges
      EDGES.forEach(([a, b]) => {
        const na = NODES[a], nb = NODES[b]
        const pa = nodePos[a], pb = nodePos[b]
        const bothUnlocked = na.unlocked && nb.unlocked
        const pulse = bothUnlocked ? (0.4 + 0.3 * Math.sin(time * 1.5 + na.phase)) : 0

        const grad = ctx!.createLinearGradient(pa.x, pa.y, pb.x, pb.y)
        grad.addColorStop(0, na.color + (bothUnlocked ? Math.round(pulse * 220).toString(16).padStart(2,'0') : '18'))
        grad.addColorStop(1, nb.color + (bothUnlocked ? Math.round(pulse * 140).toString(16).padStart(2,'0') : '18'))
        ctx!.strokeStyle = grad
        ctx!.lineWidth = bothUnlocked ? 1.5 : 0.8
        ctx!.setLineDash(bothUnlocked ? [] : [3, 4])
        ctx!.beginPath(); ctx!.moveTo(pa.x, pa.y); ctx!.lineTo(pb.x, pb.y); ctx!.stroke()
        ctx!.setLineDash([])
      })

      // Draw nodes
      NODES.forEach((n, i) => {
        const { x, y } = nodePos[i]
        const r = i === 0 ? 12 : 8
        const pulse = n.unlocked ? 1 + 0.2 * Math.sin(time * 2 + n.phase) : 1
        const rr = r * pulse

        if (n.unlocked) {
          const glow = ctx!.createRadialGradient(x, y, 0, x, y, rr * 3.5)
          glow.addColorStop(0, n.color + '55'); glow.addColorStop(1, 'transparent')
          ctx!.fillStyle = glow
          ctx!.beginPath(); ctx!.arc(x, y, rr * 3.5, 0, Math.PI * 2); ctx!.fill()
        }

        ctx!.fillStyle = n.unlocked ? n.color + 'cc' : 'rgba(255,255,255,0.1)'
        ctx!.beginPath(); ctx!.arc(x, y, rr, 0, Math.PI * 2); ctx!.fill()
        ctx!.strokeStyle = n.unlocked ? n.color : 'rgba(255,255,255,0.2)'
        ctx!.lineWidth = 1.5; ctx!.stroke()

        if (n.unlocked) {
          ctx!.fillStyle = '#ffffffdd'
          ctx!.beginPath(); ctx!.arc(x, y, rr * 0.3, 0, Math.PI * 2); ctx!.fill()
        }

        ctx!.fillStyle = n.unlocked ? '#ffffffcc' : 'rgba(255,255,255,0.25)'
        ctx!.font = `500 8px "IBM Plex Mono"`
        ctx!.textAlign = 'center'; ctx!.textBaseline = 'top'
        ctx!.fillText(n.label, x, y + rr + 3)
      })

      // Ambient glow
      const ag = ctx!.createRadialGradient(w*0.5, h*0.5, 0, w*0.5, h*0.5, w*0.4)
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
