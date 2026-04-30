'use client'
import { useEffect } from 'react'

export default function HeroCanvas() {
  useEffect(() => {
    // ═══ FINANCIAL NETWORK — Hero Canvas Animation ═══
    (function() {
      var canvas = document.getElementById('heroCanvas') as HTMLCanvasElement | null;
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      if (!ctx) return;
      var w: number, h: number, dpr: number, time = 0;
      var rafId: number;

      // Network nodes representing financial entities
      var nodes = [
        { label:'CABO TROPIC', x:0.15, y:0.3, size:8, color:[249,115,22] as [number,number,number], value:'$1.05M' },
        { label:'CULBERTSON', x:0.35, y:0.65, size:7, color:[16,185,129] as [number,number,number], value:'$836K' },
        { label:'XOME HOME', x:0.55, y:0.25, size:9, color:[139,92,246] as [number,number,number], value:'$812K' },
        { label:'CA STAYS', x:0.75, y:0.55, size:6, color:[236,72,153] as [number,number,number], value:'$245K' },
        { label:'BLC CA', x:0.85, y:0.3, size:5, color:[245,158,11] as [number,number,number], value:'$685K' },
        { label:'REAL ESTATE', x:0.25, y:0.5, size:10, color:[99,102,241] as [number,number,number], value:'$2.2M' },
        { label:'LIQUID', x:0.65, y:0.7, size:5, color:[52,211,153] as [number,number,number], value:'$345K' }
      ];

      // Connections between nodes
      var connections: [number,number][] = [
        [0,1],[0,2],[1,5],[2,3],[2,4],[3,6],[4,5],[5,6],[0,5],[1,6],[2,6],[3,4]
      ];

      // Flowing particles on connections
      var particles: { conn:number; t:number; speed:number; size:number; alpha:number }[] = [];
      for (var i = 0; i < 80; i++) {
        var connIdx = Math.floor(Math.random() * connections.length);
        particles.push({
          conn: connIdx,
          t: Math.random(),
          speed: 0.002 + Math.random() * 0.004,
          size: 1 + Math.random() * 2,
          alpha: 0.3 + Math.random() * 0.5
        });
      }

      // Background floating symbols
      var symbols: { char:string; x:number; y:number; speed:number; size:number; alpha:number; phase:number }[] = [];
      var symbolChars = ['$','₿','€','¥','£','%','↗','◆'];
      for (var i = 0; i < 40; i++) {
        symbols.push({
          char: symbolChars[Math.floor(Math.random() * symbolChars.length)],
          x: Math.random(),
          y: Math.random(),
          speed: 0.0002 + Math.random() * 0.0005,
          size: 8 + Math.random() * 14,
          alpha: 0.02 + Math.random() * 0.04,
          phase: Math.random() * Math.PI * 2
        });
      }

      function resize() {
        var rect = canvas!.parentElement!.getBoundingClientRect();
        dpr = window.devicePixelRatio || 1;
        w = rect.width; h = rect.height;
        canvas!.width = w * dpr; canvas!.height = h * dpr;
        canvas!.style.width = w + 'px'; canvas!.style.height = h + 'px';
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      resize(); window.addEventListener('resize', resize);

      function draw() {
        time += 0.016; ctx!.clearRect(0, 0, w, h);

        // Subtle grid
        ctx!.strokeStyle = 'rgba(59,130,246,0.015)'; ctx!.lineWidth = 0.5;
        for (var x = 0; x < w; x += 60) { ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, h); ctx!.stroke(); }
        for (var y = 0; y < h; y += 60) { ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(w, y); ctx!.stroke(); }

        // Floating currency symbols
        symbols.forEach(function(s) {
          s.y -= s.speed;
          if (s.y < -0.05) { s.y = 1.05; s.x = Math.random(); }
          var pulse = 0.5 + 0.5 * Math.sin(time * 0.5 + s.phase);
          ctx!.font = s.size + "px 'IBM Plex Mono', monospace";
          ctx!.fillStyle = 'rgba(59,130,246,' + (s.alpha * pulse) + ')';
          ctx!.textAlign = 'center';
          ctx!.fillText(s.char, s.x * w, s.y * h);
        });

        // Draw connections with flowing gradient
        connections.forEach(function(c, ci) {
          var n1 = nodes[c[0]], n2 = nodes[c[1]];
          var x1 = n1.x * w + Math.sin(time * 0.3 + ci) * 3;
          var y1 = n1.y * h + Math.cos(time * 0.4 + ci) * 3;
          var x2 = n2.x * w + Math.sin(time * 0.3 + ci + 2) * 3;
          var y2 = n2.y * h + Math.cos(time * 0.4 + ci + 2) * 3;
          var pulse = 0.3 + 0.2 * Math.sin(time * 0.8 + ci * 0.5);
          ctx!.beginPath(); ctx!.moveTo(x1, y1); ctx!.lineTo(x2, y2);
          ctx!.strokeStyle = 'rgba(59,130,246,' + (0.04 + pulse * 0.03) + ')';
          ctx!.lineWidth = 1; ctx!.stroke();
        });

        // Draw flowing particles along connections
        particles.forEach(function(p) {
          p.t += p.speed;
          if (p.t > 1) { p.t = 0; p.conn = Math.floor(Math.random() * connections.length); }
          var c = connections[p.conn], n1 = nodes[c[0]], n2 = nodes[c[1]];
          var x1 = n1.x * w + Math.sin(time * 0.3 + p.conn) * 3;
          var y1 = n1.y * h + Math.cos(time * 0.4 + p.conn) * 3;
          var x2 = n2.x * w + Math.sin(time * 0.3 + p.conn + 2) * 3;
          var y2 = n2.y * h + Math.cos(time * 0.4 + p.conn + 2) * 3;
          var px = x1 + (x2 - x1) * p.t, py = y1 + (y2 - y1) * p.t;
          var cr = n1.color[0] + (n2.color[0] - n1.color[0]) * p.t;
          var cg = n1.color[1] + (n2.color[1] - n1.color[1]) * p.t;
          var cb = n1.color[2] + (n2.color[2] - n1.color[2]) * p.t;
          var glow = ctx!.createRadialGradient(px, py, 0, px, py, p.size * 4);
          glow.addColorStop(0, 'rgba(' + Math.round(cr) + ',' + Math.round(cg) + ',' + Math.round(cb) + ',' + (p.alpha * 0.3) + ')');
          glow.addColorStop(1, 'transparent');
          ctx!.fillStyle = glow; ctx!.beginPath(); ctx!.arc(px, py, p.size * 4, 0, Math.PI*2); ctx!.fill();
          ctx!.beginPath(); ctx!.arc(px, py, p.size, 0, Math.PI*2);
          ctx!.fillStyle = 'rgba(' + Math.round(cr) + ',' + Math.round(cg) + ',' + Math.round(cb) + ',' + p.alpha + ')';
          ctx!.fill();
        });

        // Draw nodes
        nodes.forEach(function(n, ni) {
          var nx = n.x * w + Math.sin(time * 0.3 + ni) * 3;
          var ny = n.y * h + Math.cos(time * 0.4 + ni) * 3;
          var pulse = 0.6 + 0.4 * Math.sin(time * 1.2 + ni * 0.7);
          var cr = n.color[0], cg = n.color[1], cb = n.color[2];

          var glow = ctx!.createRadialGradient(nx, ny, 0, nx, ny, n.size * 6);
          glow.addColorStop(0, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.08 * pulse) + ')');
          glow.addColorStop(1, 'transparent');
          ctx!.fillStyle = glow; ctx!.beginPath(); ctx!.arc(nx, ny, n.size * 6, 0, Math.PI*2); ctx!.fill();

          ctx!.beginPath(); ctx!.arc(nx, ny, n.size + 4, 0, Math.PI*2);
          ctx!.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.2 + 0.15 * pulse) + ')';
          ctx!.lineWidth = 1.5; ctx!.stroke();

          var ringR = n.size + 8 + pulse * 6;
          ctx!.beginPath(); ctx!.arc(nx, ny, ringR, 0, Math.PI*2);
          ctx!.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.05 * (1 - pulse)) + ')';
          ctx!.lineWidth = 1; ctx!.stroke();

          var core = ctx!.createRadialGradient(nx, ny, 0, nx, ny, n.size);
          core.addColorStop(0, 'rgba(255,255,255,' + (0.8 * pulse) + ')');
          core.addColorStop(0.4, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.9 * pulse) + ')');
          core.addColorStop(1, 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.3 * pulse) + ')');
          ctx!.fillStyle = core; ctx!.beginPath(); ctx!.arc(nx, ny, n.size, 0, Math.PI*2); ctx!.fill();

          ctx!.shadowColor = 'rgba(0,0,0,0.9)'; ctx!.shadowBlur = 6;
          ctx!.font = "600 7px 'IBM Plex Mono', monospace";
          ctx!.fillStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ',' + (0.6 * pulse) + ')';
          ctx!.textAlign = 'center';
          ctx!.fillText(n.label, nx, ny - n.size - 10);
          ctx!.font = "700 9px 'DM Sans', sans-serif";
          ctx!.fillStyle = 'rgba(255,255,255,' + (0.5 * pulse) + ')';
          ctx!.fillText(n.value, nx, ny + n.size + 14);
          ctx!.shadowBlur = 0;
        });

        // Ambient glows
        var g1x = w * 0.2 + Math.sin(time * 0.08) * w * 0.05;
        var g1 = ctx!.createRadialGradient(g1x, h * 0.3, 0, g1x, h * 0.3, w * 0.25);
        g1.addColorStop(0, 'rgba(59,130,246,0.03)'); g1.addColorStop(1, 'transparent');
        ctx!.fillStyle = g1; ctx!.fillRect(0, 0, w, h);
        var g2x = w * 0.8 + Math.cos(time * 0.06) * w * 0.05;
        var g2 = ctx!.createRadialGradient(g2x, h * 0.6, 0, g2x, h * 0.6, w * 0.25);
        g2.addColorStop(0, 'rgba(139,92,246,0.025)'); g2.addColorStop(1, 'transparent');
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
