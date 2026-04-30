'use client'
import { useEffect } from 'react'

export default function HeroCanvas() {
  useEffect(() => {
    // ═══ TOPOGRAPHIC TERRAIN — Flowing Contour Lines ═══
    (function() {
      const canvas = document.getElementById('heroCanvas') as HTMLCanvasElement | null;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      let w: number, h: number, dpr: number;
      let time = 0;
      let rafId: number;

      function resize() {
        const rect = canvas!.parentElement!.getBoundingClientRect();
        dpr = window.devicePixelRatio || 1;
        w = rect.width; h = rect.height;
        canvas!.width = w * dpr; canvas!.height = h * dpr;
        canvas!.style.width = w + 'px'; canvas!.style.height = h + 'px';
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resize();
      window.addEventListener('resize', resize);

      function draw() {
        time += 0.016;
        ctx!.clearRect(0, 0, w, h);

        // === Faint grid overlay ===
        ctx!.strokeStyle = 'rgba(59,130,246,0.025)';
        ctx!.lineWidth = 0.5;
        for (let x = 0; x < w; x += 50) {
          ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke();
        }
        for (let y = 0; y < h; y += 50) {
          ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke();
        }

        // === Contour lines — 30 layers flowing across the full hero ===
        const totalLines = 30;
        for (let i = 0; i < totalLines; i++) {
          const t = i / totalLines;
          const baseY = t * h * 1.2 - h * 0.1;

          let r: number, g: number, b: number;
          if (t < 0.33) {
            const m = t / 0.33;
            r = Math.round(249 + (236-249)*m); g = Math.round(115 + (72-115)*m); b = Math.round(22 + (153-22)*m);
          } else if (t < 0.66) {
            const m = (t-0.33)/0.33;
            r = Math.round(236 + (139-236)*m); g = Math.round(72 + (92-72)*m); b = Math.round(153 + (246-153)*m);
          } else {
            const m = (t-0.66)/0.34;
            r = Math.round(139 + (80-139)*m); g = Math.round(92 + (40-92)*m); b = Math.round(246 + (200-246)*m);
          }

          const pulse = 0.5 + 0.5 * Math.sin(time * 0.4 + i * 0.3);
          const alpha = 0.04 + 0.10 * pulse;

          ctx!.beginPath();
          ctx!.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx!.lineWidth = 1.2 + pulse * 0.8;

          for (let x = 0; x <= w; x += 3) {
            const nx = x / w;
            const wave1 = Math.sin(nx * Math.PI * 3 + time * 0.2 + i * 0.15) * 18;
            const wave2 = Math.sin(nx * Math.PI * 5.3 + time * 0.15 + i * 0.08) * 10;
            const wave3 = Math.sin(nx * Math.PI * 1.7 + time * 0.3 + i * 0.25) * 14;
            const wave4 = Math.cos(nx * Math.PI * 7.1 + time * 0.1 + i * 0.12) * 6;
            const peak1 = Math.exp(-Math.pow((nx - 0.25) * 6, 2)) * 40 * (1 - t * 0.6);
            const peak2 = Math.exp(-Math.pow((nx - 0.55) * 5, 2)) * 60 * (1 - t * 0.5);
            const peak3 = Math.exp(-Math.pow((nx - 0.80) * 7, 2)) * 50 * (1 - t * 0.7);
            const y = baseY + wave1 + wave2 + wave3 + wave4 - peak1 - peak2 - peak3;
            if (x === 0) ctx!.moveTo(x, y); else ctx!.lineTo(x, y);
          }
          ctx!.stroke();

          if (alpha > 0.08) {
            ctx!.beginPath();
            for (let x = 0; x <= w; x += 3) {
              const nx = x / w;
              const wave1 = Math.sin(nx * Math.PI * 3 + time * 0.2 + i * 0.15) * 18;
              const wave2 = Math.sin(nx * Math.PI * 5.3 + time * 0.15 + i * 0.08) * 10;
              const wave3 = Math.sin(nx * Math.PI * 1.7 + time * 0.3 + i * 0.25) * 14;
              const wave4 = Math.cos(nx * Math.PI * 7.1 + time * 0.1 + i * 0.12) * 6;
              const peak1 = Math.exp(-Math.pow((nx - 0.25) * 6, 2)) * 40 * (1 - t * 0.6);
              const peak2 = Math.exp(-Math.pow((nx - 0.55) * 5, 2)) * 60 * (1 - t * 0.5);
              const peak3 = Math.exp(-Math.pow((nx - 0.80) * 7, 2)) * 50 * (1 - t * 0.7);
              const y = baseY + wave1 + wave2 + wave3 + wave4 - peak1 - peak2 - peak3;
              if (x === 0) ctx!.moveTo(x, y); else ctx!.lineTo(x, y);
            }
            ctx!.lineTo(w, baseY + 30);
            ctx!.lineTo(0, baseY + 30);
            ctx!.closePath();
            ctx!.fillStyle = `rgba(${r},${g},${b},${alpha * 0.15})`;
            ctx!.fill();
          }
        }

        // === Drifting ambient glow zones ===
        const g1x = w * 0.25 + Math.sin(time * 0.08) * w * 0.05;
        const g1 = ctx!.createRadialGradient(g1x, h * 0.3, 0, g1x, h * 0.3, w * 0.2);
        g1.addColorStop(0, 'rgba(59,130,246,0.04)'); g1.addColorStop(1, 'transparent');
        ctx!.fillStyle = g1; ctx!.fillRect(0, 0, w, h);

        const g2x = w * 0.75 + Math.cos(time * 0.06) * w * 0.05;
        const g2 = ctx!.createRadialGradient(g2x, h * 0.5, 0, g2x, h * 0.5, w * 0.2);
        g2.addColorStop(0, 'rgba(139,92,246,0.03)'); g2.addColorStop(1, 'transparent');
        ctx!.fillStyle = g2; ctx!.fillRect(0, 0, w, h);

        rafId = requestAnimationFrame(draw);
      }
      rafId = requestAnimationFrame(draw);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resize);
      };
    })();
  }, [])

  return null
}
