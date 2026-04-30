'use client'
import { useEffect } from 'react'

/**
 * Rentals HeroCanvas
 * Animation: abstract map-grid with glowing property pins pulsing at different positions.
 * Pin color encodes occupancy status: green=booked, amber=vacant gap, red=maintenance.
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

      // Property pins
      const pins = [
        { xPct: 0.25, yPct: 0.32, color: '#10b981', label: 'Graeagle',  status: 'booked',      pulseSpeed: 2.0 },
        { xPct: 0.55, yPct: 0.45, color: '#f59e0b', label: 'Truckee',   status: 'vacant gap',  pulseSpeed: 1.5 },
        { xPct: 0.72, yPct: 0.62, color: '#10b981', label: 'Penryn',    status: 'booked',      pulseSpeed: 2.4 },
      ]

      // Map grid ISO lines (simulated topographic/road grid at angle)
      function drawMapGrid() {
        const gridSize = 36
        const angle = -0.22  // slight rotation
        ctx!.save()
        ctx!.translate(w * 0.5, h * 0.5)
        ctx!.rotate(angle)

        const diag = Math.sqrt(w * w + h * h)

        // Vertical lines
        ctx!.strokeStyle = 'rgba(255,255,255,0.025)'
        ctx!.lineWidth = 0.5
        for (let x = -diag; x < diag; x += gridSize) {
          ctx!.beginPath(); ctx!.moveTo(x, -diag); ctx!.lineTo(x, diag); ctx!.stroke()
        }
        // Horizontal lines
        for (let y = -diag; y < diag; y += gridSize) {
          ctx!.beginPath(); ctx!.moveTo(-diag, y); ctx!.lineTo(diag, y); ctx!.stroke()
        }

        // Slightly thicker "roads" every 5 cells
        ctx!.strokeStyle = 'rgba(255,255,255,0.05)'
        ctx!.lineWidth = 1
        for (let x = -diag; x < diag; x += gridSize * 5) {
          ctx!.beginPath(); ctx!.moveTo(x, -diag); ctx!.lineTo(x, diag); ctx!.stroke()
        }
        for (let y = -diag; y < diag; y += gridSize * 5) {
          ctx!.beginPath(); ctx!.moveTo(-diag, y); ctx!.lineTo(diag, y); ctx!.stroke()
        }
        ctx!.restore()
      }

      function draw() {
        time += 0.016
        ctx!.clearRect(0, 0, w, h)

        drawMapGrid()

        // Ambient glow under pins
        pins.forEach(pin => {
          const px = pin.xPct * w
          const py = pin.yPct * h
          const bg = ctx!.createRadialGradient(px, py, 0, px, py, 140)
          bg.addColorStop(0, pin.color + '18')
          bg.addColorStop(1, 'transparent')
          ctx!.fillStyle = bg
          ctx!.fillRect(0, 0, w, h)
        })

        pins.forEach(pin => {
          const px = pin.xPct * w
          const py = pin.yPct * h
          const pulse = 0.5 + 0.5 * Math.sin(time * pin.pulseSpeed)

          // Expanding ripple rings
          for (let r = 1; r <= 3; r++) {
            const rippleR = 20 + r * 22 + pulse * 12
            const rippleAlpha = (1 - r / 3.5) * 0.18 * pulse
            ctx!.beginPath()
            ctx!.arc(px, py, rippleR, 0, Math.PI * 2)
            ctx!.strokeStyle = pin.color + Math.round(rippleAlpha * 255).toString(16).padStart(2, '0')
            ctx!.lineWidth = 1.5
            ctx!.stroke()
          }

          // Drop shadow
          const shadow = ctx!.createRadialGradient(px, py + 18, 0, px, py + 18, 20)
          shadow.addColorStop(0, 'rgba(0,0,0,0.3)')
          shadow.addColorStop(1, 'transparent')
          ctx!.fillStyle = shadow
          ctx!.beginPath()
          ctx!.ellipse(px, py + 20, 16, 8, 0, 0, Math.PI * 2)
          ctx!.fill()

          // Pin body (teardrop)
          ctx!.beginPath()
          ctx!.arc(px, py - 16, 12, 0, Math.PI * 2)
          const pinGrad = ctx!.createRadialGradient(px - 4, py - 20, 0, px, py - 16, 12)
          pinGrad.addColorStop(0, pin.color)
          pinGrad.addColorStop(1, pin.color + 'aa')
          ctx!.fillStyle = pinGrad
          ctx!.fill()

          // Pin tail
          ctx!.beginPath()
          ctx!.moveTo(px - 6, py - 10)
          ctx!.lineTo(px, py)
          ctx!.lineTo(px + 6, py - 10)
          ctx!.fillStyle = pin.color + 'cc'
          ctx!.fill()

          // Pin glow
          const glow = ctx!.createRadialGradient(px, py - 16, 0, px, py - 16, 20 * (0.8 + 0.2 * pulse))
          glow.addColorStop(0, pin.color + '55')
          glow.addColorStop(1, 'transparent')
          ctx!.fillStyle = glow
          ctx!.beginPath()
          ctx!.arc(px, py - 16, 20, 0, Math.PI * 2)
          ctx!.fill()

          // White dot inside pin
          ctx!.beginPath()
          ctx!.arc(px, py - 16, 4, 0, Math.PI * 2)
          ctx!.fillStyle = 'rgba(255,255,255,0.9)'
          ctx!.fill()

          // Property label
          ctx!.font = '600 10px "DM Sans"'
          ctx!.fillStyle = 'rgba(255,255,255,0.7)'
          ctx!.textAlign = 'center'
          ctx!.fillText(pin.label, px, py + 14)

          // Status badge
          ctx!.font = '500 9px "IBM Plex Mono"'
          ctx!.fillStyle = pin.color + 'cc'
          ctx!.fillText(pin.status.toUpperCase(), px, py + 26)
        })

        // Compass rose (bottom right)
        const crx = w * 0.9
        const cry = h * 0.85
        const crR = 16
        ctx!.save()
        ctx!.translate(crx, cry)
        ctx!.rotate(time * 0.05)
        const cardinals = ['N', 'E', 'S', 'W']
        const angles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI]
        angles.forEach((a, i) => {
          ctx!.font = '700 9px "IBM Plex Mono"'
          ctx!.fillStyle = i === 0 ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.25)'
          ctx!.textAlign = 'center'
          ctx!.textBaseline = 'middle'
          ctx!.fillText(cardinals[i], Math.cos(a) * crR, Math.sin(a) * crR)
          ctx!.beginPath()
          ctx!.moveTo(Math.cos(a) * 4, Math.sin(a) * 4)
          ctx!.lineTo(Math.cos(a) * (crR - 12), Math.sin(a) * (crR - 12))
          ctx!.strokeStyle = i === 0 ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.1)'
          ctx!.lineWidth = 0.8
          ctx!.stroke()
        })
        ctx!.restore()

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
