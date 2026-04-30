'use client'
import { useEffect, useRef } from 'react'

/**
 * Docs Hub HeroCanvas
 * Animation: floating document card silhouettes drifting slowly with subtle rotation,
 * color-coded by document category (stacks of pages).
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

    const CATEGORY_COLORS: Record<string, string> = {
      Legal: '#3b82f6', Tax: '#f59e0b', Insurance: '#10b981',
      Property: '#8b5cf6', Company: '#ec4899', Personal: '#06b6d4',
    }
    const CATS = Object.keys(CATEGORY_COLORS)

    type DocCard = {
      x: number; y: number; vx: number; vy: number
      rotation: number; vrot: number; width: number; height: number
      color: string; cat: string; alpha: number; depth: number
    }

    function spawnCard(): DocCard {
      const cat = CATS[Math.floor(Math.random() * CATS.length)]
      return {
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18, vy: -(0.08 + Math.random() * 0.2),
        rotation: (Math.random() - 0.5) * 0.4, vrot: (Math.random() - 0.5) * 0.002,
        width: 36 + Math.random() * 24, height: 48 + Math.random() * 28,
        color: CATEGORY_COLORS[cat], cat, alpha: 0.07 + Math.random() * 0.15,
        depth: Math.random() > 0.6 ? 1 : 0,
      }
    }

    const cards: DocCard[] = Array.from({ length: 28 }, spawnCard)

    function drawDoc(card: DocCard) {
      ctx!.save()
      ctx!.translate(card.x, card.y)
      ctx!.rotate(card.rotation)
      ctx!.globalAlpha = card.alpha

      for (let i = 2; i >= 1; i--) {
        ctx!.fillStyle = card.color + '30'; ctx!.strokeStyle = card.color + '20'; ctx!.lineWidth = 0.5
        ctx!.beginPath(); ctx!.rect(-card.width/2 + i*3, -card.height/2 + i*3, card.width, card.height)
        ctx!.fill(); ctx!.stroke()
      }

      ctx!.fillStyle = 'rgba(255,255,255,0.04)'; ctx!.strokeStyle = card.color + '70'; ctx!.lineWidth = 1
      ctx!.beginPath(); ctx!.rect(-card.width/2, -card.height/2, card.width, card.height)
      ctx!.fill(); ctx!.stroke()

      const fold = 7
      ctx!.fillStyle = card.color + '50'
      ctx!.beginPath()
      ctx!.moveTo(card.width/2 - fold, -card.height/2)
      ctx!.lineTo(card.width/2, -card.height/2 + fold)
      ctx!.lineTo(card.width/2, -card.height/2)
      ctx!.closePath(); ctx!.fill()

      const lineCount = Math.floor(card.height / 9)
      ctx!.strokeStyle = card.color + '40'; ctx!.lineWidth = 0.5
      for (let i = 1; i < lineCount; i++) {
        const ly = -card.height/2 + i * (card.height / lineCount)
        const lw = (i % 3 === 0) ? card.width * 0.5 : card.width * 0.7
        ctx!.beginPath(); ctx!.moveTo(-lw/2, ly); ctx!.lineTo(lw/2, ly); ctx!.stroke()
      }

      ctx!.font = '500 6px "IBM Plex Mono"'; ctx!.fillStyle = card.color + '99'
      ctx!.textAlign = 'center'
      ctx!.fillText(card.cat.toUpperCase(), 0, -card.height/2 + 9)
      ctx!.globalAlpha = 1
      ctx!.restore()
    }

    function draw() {
      time += 0.012
      ctx!.clearRect(0, 0, w, h)

      ctx!.strokeStyle = 'rgba(255,255,255,0.01)'; ctx!.lineWidth = 0.5
      for (let x = 0; x < w; x += 60) { ctx!.beginPath(); ctx!.moveTo(x,0); ctx!.lineTo(x,h); ctx!.stroke() }
      for (let y = 0; y < h; y += 60) { ctx!.beginPath(); ctx!.moveTo(0,y); ctx!.lineTo(w,y); ctx!.stroke() }

      cards.filter(c => c.depth === 0).forEach(c => {
        c.x += c.vx; c.y += c.vy; c.rotation += c.vrot
        if (c.y < -c.height - 10) { c.y = h + c.height; c.x = Math.random() * w }
        drawDoc(c)
      })

      const ag = ctx!.createRadialGradient(w*0.5, h*0.45, 0, w*0.5, h*0.45, w*0.3)
      ag.addColorStop(0, 'rgba(59,130,246,0.03)'); ag.addColorStop(1, 'transparent')
      ctx!.fillStyle = ag; ctx!.fillRect(0, 0, w, h)

      cards.filter(c => c.depth === 1).forEach(c => {
        c.x += c.vx; c.y += c.vy; c.rotation += c.vrot
        if (c.y < -c.height - 10) { c.y = h + c.height; c.x = Math.random() * w }
        drawDoc(c)
      })

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
