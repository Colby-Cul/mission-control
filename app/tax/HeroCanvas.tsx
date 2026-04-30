'use client'
import { useEffect } from 'react'

/**
 * Tax Center HeroCanvas
 * Animation: calendar/deadline orbits — pulsing date markers on concentric rings
 * (Q1, Q2, Q3, Q4), urgent deadlines closer to center glowing amber/red.
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

      // Deadline markers on each ring
      const rings = [
        {
          radius: 70,
          label: 'Q1',
          color: '#ef4444',   // urgent — closest to center
          speed: 0.08,
          markers: [
            { angle: 0,              label: 'Jan 15', urgent: true },
            { angle: Math.PI * 0.5,  label: 'Mar 15', urgent: true },
          ],
        },
        {
          radius: 130,
          label: 'Q2',
          color: '#f59e0b',
          speed: 0.05,
          markers: [
            { angle: Math.PI * 0.25, label: 'Apr 15', urgent: true },
            { angle: Math.PI,        label: 'Jun 15', urgent: false },
          ],
        },
        {
          radius: 200,
          label: 'Q3',
          color: '#8b5cf6',
          speed: 0.03,
          markers: [
            { angle: Math.PI * 0.75, label: 'Jul 15', urgent: false },
            { angle: Math.PI * 1.5,  label: 'Sep 15', urgent: false },
          ],
        },
        {
          radius: 270,
          label: 'Q4',
          color: '#06b6d4',
          speed: 0.02,
          markers: [
            { angle: Math.PI * 1.25, label: 'Oct 15', urgent: false },
            { angle: Math.PI * 1.75, label: 'Dec 31', urgent: false },
          ],
        },
      ]

      function draw() {
        time += 0.016
        ctx!.clearRect(0, 0, w, h)

        // Faint grid
        ctx!.strokeStyle = 'rgba(245,158,11,0.018)'
        ctx!.lineWidth = 0.5
        for (let x = 0; x < w; x += 60) {
          ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke()
        }
        for (let y = 0; y < h; y += 60) {
          ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke()
        }

        const cx = w * 0.42
        const cy = h * 0.5

        rings.forEach(ring => {
          const ringTime = time * ring.speed

          // Draw ring arc
          ctx!.beginPath()
          ctx!.arc(cx, cy, ring.radius, 0, Math.PI * 2)
          ctx!.strokeStyle = ring.color + '22'
          ctx!.lineWidth = 1.5
          ctx!.stroke()

          // Quarter label at top of ring
          const labelAngle = -Math.PI / 2
          const lx = cx + Math.cos(labelAngle) * ring.radius
          const ly = cy + Math.sin(labelAngle) * ring.radius - 14
          ctx!.font = '600 9px "IBM Plex Mono"'
          ctx!.fillStyle = ring.color + '88'
          ctx!.textAlign = 'center'
          ctx!.fillText(ring.label, lx, ly)

          // Rotating tick on the ring (slow sweep)
          const sweepAngle = -Math.PI / 2 + ringTime
          const tx = cx + Math.cos(sweepAngle) * ring.radius
          const ty = cy + Math.sin(sweepAngle) * ring.radius
          const sweepPulse = 0.5 + 0.5 * Math.sin(time * 3)
          ctx!.beginPath()
          ctx!.arc(tx, ty, 3, 0, Math.PI * 2)
          ctx!.fillStyle = ring.color + Math.round(sweepPulse * 200 + 55).toString(16).padStart(2, '0')
          ctx!.fill()

          // Deadline markers
          ring.markers.forEach(marker => {
            const angle = marker.angle + ringTime
            const mx = cx + Math.cos(angle) * ring.radius
            const my = cy + Math.sin(angle) * ring.radius

            // Pulse for urgent deadlines
            const pulse = marker.urgent
              ? 0.6 + 0.4 * Math.sin(time * 4 + marker.angle)
              : 0.8

            // Outer glow
            const glow = ctx!.createRadialGradient(mx, my, 0, mx, my, marker.urgent ? 18 : 12)
            glow.addColorStop(0, ring.color + Math.round(pulse * 120).toString(16).padStart(2, '0'))
            glow.addColorStop(1, 'transparent')
            ctx!.fillStyle = glow
            ctx!.beginPath()
            ctx!.arc(mx, my, marker.urgent ? 18 : 12, 0, Math.PI * 2)
            ctx!.fill()

            // Marker dot
            ctx!.beginPath()
            ctx!.arc(mx, my, marker.urgent ? 6 : 4, 0, Math.PI * 2)
            ctx!.fillStyle = ring.color
            ctx!.fill()

            // Label
            const labelOffset = marker.urgent ? 18 : 14
            ctx!.font = `${marker.urgent ? '700' : '500'} 9px "IBM Plex Mono"`
            ctx!.fillStyle = ring.color + Math.round(pulse * 200 + 55).toString(16).padStart(2, '0')
            ctx!.textAlign = 'center'
            // Position label away from center
            const dx = mx - cx
            const dy = my - cy
            const dist = Math.sqrt(dx * dx + dy * dy)
            ctx!.fillText(marker.label, mx + (dx / dist) * labelOffset, my + (dy / dist) * labelOffset)
          })
        })

        // Central "TAX" core
        const corePulse = 0.8 + 0.2 * Math.sin(time * 1.5)
        const coreR = 22 * corePulse

        const coreGlow = ctx!.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.5)
        coreGlow.addColorStop(0, 'rgba(245,158,11,0.15)')
        coreGlow.addColorStop(1, 'transparent')
        ctx!.fillStyle = coreGlow
        ctx!.beginPath()
        ctx!.arc(cx, cy, coreR * 2.5, 0, Math.PI * 2)
        ctx!.fill()

        const coreGrad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, coreR)
        coreGrad.addColorStop(0, '#fbbf24')
        coreGrad.addColorStop(1, '#f59e0b')
        ctx!.beginPath()
        ctx!.arc(cx, cy, coreR, 0, Math.PI * 2)
        ctx!.fillStyle = coreGrad
        ctx!.fill()

        ctx!.font = '700 11px "IBM Plex Mono"'
        ctx!.fillStyle = '#060610'
        ctx!.textAlign = 'center'
        ctx!.textBaseline = 'middle'
        ctx!.fillText('TAX', cx, cy)

        // Ambient background glow
        const bg1 = ctx!.createRadialGradient(cx, cy, 0, cx, cy, w * 0.3)
        bg1.addColorStop(0, 'rgba(245,158,11,0.04)')
        bg1.addColorStop(1, 'transparent')
        ctx!.fillStyle = bg1
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
