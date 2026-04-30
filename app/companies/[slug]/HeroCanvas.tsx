'use client'
import { useEffect } from 'react'

export default function HeroCanvas() {
  useEffect(() => {
    // Hero Canvas
    (function() {
      const canvas = document.getElementById('heroCanvas') as HTMLCanvasElement | null;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      let rafId: number;
      function resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas!.getBoundingClientRect();
        canvas!.width = rect.width * dpr;
        canvas!.height = rect.height * dpr;
        ctx!.scale(dpr, dpr);
      }
      resize();
      const w = () => canvas!.width / (window.devicePixelRatio || 1);
      const h = () => canvas!.height / (window.devicePixelRatio || 1);
      let particles = Array.from({length: 50}, () => ({
        x: Math.random() * w(), y: Math.random() * h(),
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 1.5
      }));
      function draw() {
        const cw = w(), ch = h();
        ctx!.clearRect(0, 0, cw, ch);
        ctx!.strokeStyle = 'rgba(59,130,246,0.03)'; ctx!.lineWidth = 0.5;
        for (let i = 0; i < cw; i += 60) { ctx!.beginPath(); ctx!.moveTo(i,0); ctx!.lineTo(i,ch); ctx!.stroke(); }
        for (let i = 0; i < ch; i += 60) { ctx!.beginPath(); ctx!.moveTo(0,i); ctx!.lineTo(cw,i); ctx!.stroke(); }
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > cw) p.vx *= -1;
          if (p.y < 0 || p.y > ch) p.vy *= -1;
          ctx!.fillStyle = 'rgba(59,130,246,0.3)'; ctx!.beginPath(); ctx!.arc(p.x,p.y,p.r,0,Math.PI*2); ctx!.fill();
        });
        ctx!.fillStyle = 'rgba(59,130,246,0.05)'; ctx!.beginPath(); ctx!.arc(cw*0.3, ch*0.5, 120, 0, Math.PI*2); ctx!.fill();
        rafId = requestAnimationFrame(draw);
      }
      draw();
      window.addEventListener('resize', resize);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resize);
      };
    })();

    // Orbital Canvas
    (function() {
      const canvas = document.getElementById('orbitalCanvas') as HTMLCanvasElement | null;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      let rafId: number;
      function resize() {
        const rect = canvas!.getBoundingClientRect();
        canvas!.width = rect.width * dpr; canvas!.height = rect.height * dpr;
        ctx!.scale(dpr, dpr);
      }
      resize();
      function draw(time: number) {
        const w = canvas!.width/dpr, h = canvas!.height/dpr, cx = w/2, cy = h/2;
        ctx!.clearRect(0,0,w,h);
        const t = time * 0.0005;
        for (let r = 40; r < 120; r += 30) {
          ctx!.strokeStyle = `rgba(59,130,246,${0.1 - r/400})`; ctx!.lineWidth = 1;
          ctx!.beginPath(); ctx!.arc(cx,cy,r,0,Math.PI*2); ctx!.stroke();
        }
        const x1 = cx + Math.cos(t)*70, y1 = cy + Math.sin(t)*70;
        ctx!.fillStyle='rgba(59,130,246,0.6)'; ctx!.beginPath(); ctx!.arc(x1,y1,4,0,Math.PI*2); ctx!.fill();
        const x2 = cx + Math.cos(t*0.7+Math.PI)*100, y2 = cy + Math.sin(t*0.7+Math.PI)*100;
        ctx!.fillStyle='rgba(139,92,246,0.5)'; ctx!.beginPath(); ctx!.arc(x2,y2,3,0,Math.PI*2); ctx!.fill();
        ctx!.fillStyle='rgba(59,130,246,0.15)'; ctx!.beginPath(); ctx!.arc(cx,cy,30,0,Math.PI*2); ctx!.fill();
        ctx!.fillStyle='rgba(59,130,246,0.3)'; ctx!.beginPath(); ctx!.arc(cx,cy,15,0,Math.PI*2); ctx!.fill();
        rafId = requestAnimationFrame(draw);
      }
      draw(0);
      window.addEventListener('resize', resize);
    })();

    // Sparkline bars
    for (let i = 1; i <= 5; i++) {
      const c = document.getElementById('bars'+i);
      if (c) for (let j = 0; j < 12; j++) {
        const b = document.createElement('div');
        b.className = 'kpi-bar'; b.style.height = (30 + Math.random()*70)+'%'; c.appendChild(b);
      }
    }

    // Timeline chart
    setTimeout(function() {
      const canvas = document.getElementById('timelineCanvas') as HTMLCanvasElement | null;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width*dpr; canvas.height = rect.height*dpr; ctx.scale(dpr,dpr);
      const w=canvas.width/dpr, h=canvas.height/dpr, p=20, gW=w-p*2, gH=h-p*2;
      const data=[35,32,30,28,31,29], months=['JAN','FEB','MAR','APR','MAY','JUN'], maxV=40;
      ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1;
      for(let i=0;i<=4;i++){const y=p+(gH/4)*i;ctx.beginPath();ctx.moveTo(p,y);ctx.lineTo(w-p,y);ctx.stroke();}
      ctx.fillStyle='rgba(16,185,129,0.2)'; ctx.beginPath(); ctx.moveTo(p,p+gH);
      for(let i=0;i<data.length;i++){const x=p+(gW/(data.length-1))*i;const y=p+gH-(data[i]/maxV)*gH;ctx.lineTo(x,y);}
      ctx.lineTo(w-p,p+gH); ctx.fill();
      ctx.strokeStyle='#10b981'; ctx.lineWidth=2; ctx.beginPath();
      for(let i=0;i<data.length;i++){const x=p+(gW/(data.length-1))*i;const y=p+gH-(data[i]/maxV)*gH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
      ctx.stroke();
      ctx.fillStyle='#10b981';
      for(let i=0;i<data.length;i++){const x=p+(gW/(data.length-1))*i;const y=p+gH-(data[i]/maxV)*gH;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='10px DM Sans'; ctx.textAlign='center';
      for(let i=0;i<months.length;i++){const x=p+(gW/(data.length-1))*i;ctx.fillText(months[i],x,h-5);}
    }, 100);

    // Market share chart
    setTimeout(function() {
      const canvas = document.getElementById('marketShareCanvas') as HTMLCanvasElement | null;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width*dpr; canvas.height = rect.height*dpr; ctx.scale(dpr,dpr);
      const w=canvas.width/dpr, h=canvas.height/dpr, p=20, gW=w-p*2, gH=h-p*2;
      const data=[3.2,3.4,3.5,3.6,3.7,3.8,3.9,4.0,4.05,4.08,4.09,4.1], maxV=4.5;
      ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1;
      for(let i=0;i<=4;i++){const y=p+(gH/4)*i;ctx.beginPath();ctx.moveTo(p,y);ctx.lineTo(w-p,y);ctx.stroke();}
      ctx.fillStyle='rgba(59,130,246,0.2)'; ctx.beginPath(); ctx.moveTo(p,p+gH);
      for(let i=0;i<data.length;i++){const x=p+(gW/(data.length-1))*i;const y=p+gH-(data[i]/maxV)*gH;ctx.lineTo(x,y);}
      ctx.lineTo(w-p,p+gH); ctx.fill();
      ctx.strokeStyle='#3b82f6'; ctx.lineWidth=2; ctx.beginPath();
      for(let i=0;i<data.length;i++){const x=p+(gW/(data.length-1))*i;const y=p+gH-(data[i]/maxV)*gH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
      ctx.stroke();
      ctx.fillStyle='#3b82f6';
      for(let i=0;i<data.length;i++){const x=p+(gW/(data.length-1))*i;const y=p+gH-(data[i]/maxV)*gH;ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}
    }, 100);
  }, [])

  return null
}
