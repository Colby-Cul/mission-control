'use client'
import { useEffect, useRef } from 'react'

/**
 * Workspace Files HeroCanvas
 * Animation: folder/file icons floating in a 3D-ish perspective grid layer.
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

    const FILE_COLORS = ['#f97316','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4','#a3e635']
    const FILE_LABELS = ['pdf','doc','xlsx','img','mp4','zip','csv','txt','json','png']

    type Icon = {
      x: number; y: number; z: number; vx: number; vy: number
      isFolder: boolean; color: string; phase: number; rotation: number; vrot: number
      label: string; alpha: number
    }

    function spawnIcon(): Icon {
      const z = 0.2 + Math.random() * 0.8
      return {
        x: Math.random() * w, y: Math.random() * h, z,
        vx: (Math.random() - 0.5) * 0.15 * z, vy: (Math.random() - 0.5) * 0.12 * z,
        isFolder: Math.random() > 0.55,
        color: FILE_COLORS[Math.floor(Math.random() * FILE_COLORS.length)],
        phase: Math.random() * Math.PI * 2,
        rotation: (Math.random() - 0.5) * 0.3, vrot: (Math.random() - 0.5) * 0.001,
        label: FILE_LABELS[Math.floor(Math.random() * FILE_LABELS.length)],
        alpha: 0.06 + z * 0.18,
      }
    }

    const icons: Icon[] = Array.from({ length: 32 }, spawnIcon)

    function drawFolder(cx: number, cy: number, size: number, color: string, alpha: number) {
      ctx!.save(); ctx!.globalAlpha = alpha
      ctx!.fillStyle = color + '30'; ctx!.strokeStyle = color + '80'; ctx!.lineWidth = 1
      ctx!.beginPath(); ctx!.roundRect(cx - size, cy - size * 0.6, size * 2, size * 1.4, 3)
      ctx!.fill(); ctx!.stroke()
      ctx!.beginPath()
      ctx!.moveTo(cx - size, cy - size * 0.6); ctx!.lineTo(cx - size * 0.3, cy - size * 0.6)
      ctx!.lineTo(cx - size * 0.1, cy - size * 0.85); ctx!.lineTo(cx + size * 0.4, cy - size * 0.85)
      ctx!.lineTo(cx + size * 0.4, cy - size * 0.6)
      ctx!.fillStyle = color + '40'; ctx!.fill(); ctx!.stroke()
      ctx!.strokeStyle = color + '40'; ctx!.lineWidth = 0.5
      for (let i = 0; i < 3; i++) {
        const ly = cy - size * 0.1 + i * size * 0.3
        ctx!.beginPath(); ctx!.moveTo(cx - size * 0.6, ly); ctx!.lineTo(cx + size * 0.6, ly); ctx!.stroke()
      }
      ctx!.globalAlpha = 1; ctx!.restore()
    }

    function drawFile(cx: number, cy: number, size: number, color: string, alpha: number, label: string) {
      ctx!.save(); ctx!.globalAlpha = alpha
      const pw = size * 1.3, ph = size * 1.7
      ctx!.fillStyle = 'rgba(255,255,255,0.03)'; ctx!.strokeStyle = color + '70'; ctx!.lineWidth = 1
      ctx!.beginPath()
      ctx!.moveTo(cx - pw/2, cy - ph/2)
      ctx!.lineTo(cx + pw/2 - size*0.35, cy - ph/2)
      ctx!.lineTo(cx + pw/2, cy - ph/2 + size*0.35)
      ctx!.lineTo(cx + pw/2, cy + ph/2); ctx!.lineTo(cx - pw/2, cy + ph/2); ctx!.closePath()
      ctx!.fill(); ctx!.stroke()
      ctx!.fillStyle = color + '40'
      ctx!.beginPath()
      ctx!.moveTo(cx + pw/2 - size*0.35, cy - ph/2)
      ctx!.lineTo(cx + pw/2, cy - ph/2 + size*0.35)
      ctx!.lineTo(cx + pw/2 - size*0.35, cy - ph/2 + size*0.35)
      ctx!.closePath(); ctx!.fill()
      ctx!.strokeStyle = color + '35'; ctx!.lineWidth = 0.5
      for (let i = 0; i < 4; i++) {
        const ly = cy - ph/2 + ph*0.28 + i * ph*0.15
        ctx!.beginPath(); ctx!.moveTo(cx - pw/2 + 4, ly); ctx!.lineTo(cx + pw/2 - 6, ly); ctx!.stroke()
      }
      ctx!.font = `500 ${size * 0.45}px "IBM Plex Mono"`
      ctx!.fillStyle = color + '99'; ctx!.textAlign = 'center'; ctx!.textBaseline = 'bottom'
      ctx!.fillText(label.toUpperCase(), cx, cy + ph/2 + 1)
      ctx!.globalAlpha = 1; ctx!.restore()
    }

    function drawGrid3D() {
      if (w === 0 || h === 0) return
      const vp = { x: w * 0.5, y: h * 0.4 }
      const baseY = h * 0.9
      ctx!.strokeStyle = 'rgba(255,255,255,0.015)'; ctx!.lineWidth = 0.5
      for (let i = 0; i < 8; i++) {
        const t = i / 8
        const y = baseY - t * (baseY - h * 0.3) * 0.6
        const xLeft = vp.x - (w * 0.5) * t, xRight = vp.x + (w * 0.5) * t
        ctx!.beginPath(); ctx!.moveTo(xLeft, y); ctx!.lineTo(xRight, y); ctx!.stroke()
      }
      for (let i = 0; i <= 10; i++) {
        const t = i / 10
        ctx!.beginPath(); ctx!.moveTo(t * w, baseY); ctx!.lineTo(vp.x + (t * w - vp.x) * 0.1, h * 0.3); ctx!.stroke()
      }
    }

    function draw() {
      time += 0.012
      ctx!.clearRect(0, 0, w, h)

      ctx!.strokeStyle = 'rgba(255,255,255,0.01)'; ctx!.lineWidth = 0.5
      for (let x = 0; x < w; x += 60) { ctx!.beginPath(); ctx!.moveTo(x,0); ctx!.lineTo(x,h); ctx!.stroke() }
      for (let y = 0; y < h; y += 60) { ctx!.beginPath(); ctx!.moveTo(0,y); ctx!.lineTo(w,y); ctx!.stroke() }

      drawGrid3D()

      const sorted = [...icons].sort((a, b) => a.z - b.z)
      sorted.forEach(icon => {
        icon.x += icon.vx; icon.y += icon.vy; icon.rotation += icon.vrot
        if (icon.x < -60) icon.x = w + 60
        if (icon.x > w + 60) icon.x = -60
        if (icon.y < -60) icon.y = h + 60
        if (icon.y > h + 60) icon.y = -60
        const size = 10 + icon.z * 14
        ctx!.save(); ctx!.translate(icon.x, icon.y); ctx!.rotate(icon.rotation)
        if (icon.isFolder) drawFolder(0, 0, size, icon.color, icon.alpha)
        else drawFile(0, 0, size, icon.color, icon.alpha, icon.label)
        ctx!.restore()
      })

      const ag = ctx!.createRadialGradient(w*0.5, h*0.5, 0, w*0.5, h*0.5, w*0.3)
      ag.addColorStop(0, 'rgba(249,115,22,0.025)'); ag.addColorStop(1, 'transparent')
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
