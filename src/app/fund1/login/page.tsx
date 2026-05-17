"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const BEBAS = "var(--font-bebas, 'Bebas Neue', sans-serif)";
const MONO  = "var(--font-mono, 'Space Mono', monospace)";
const BODY  = "Switzer, 'Helvetica Neue', Arial, sans-serif";

function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const setSize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    setSize(); window.addEventListener("resize", setSize);
    const ctx = canvas.getContext("2d")!;
    const N = 70;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random()-.5)*.22, vy: (Math.random()-.5)*.22,
      r: Math.random()*1.3+.4, o: Math.random()*.3+.07,
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      pts.forEach(p => {
        p.x=(p.x+p.vx+canvas.width)%canvas.width; p.y=(p.y+p.vy+canvas.height)%canvas.height;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${p.o})`; ctx.fill();
      });
      for(let i=0;i<N;i++) for(let j=i+1;j<N;j++) {
        const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.hypot(dx,dy);
        if(d<150) { ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y); ctx.strokeStyle=`rgba(255,255,255,${.07*(1-d/150)})`; ctx.lineWidth=.6; ctx.stroke(); }
      }
      raf=requestAnimationFrame(draw);
    };
    draw();
    return()=>{ cancelAnimationFrame(raf); window.removeEventListener("resize",setSize); };
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:1}}/>;
}

export default function Fund1LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(false);
    const res = await fetch("/api/fund1-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.replace("/fund1");
      router.refresh();
    } else {
      setErr(true);
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{position:"fixed",inset:0,background:"#000",zIndex:0}}/>
      <ParticleCanvas/>
      <div style={{position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:5,fontFamily:BODY,padding:24}}>
        <div style={{width:"100%",maxWidth:420,textAlign:"center"}}>
          <img src="/logo-cover.png" alt="Backfield Ventures" style={{width:"100%",maxWidth:280,height:"auto",marginBottom:36,display:"block",marginLeft:"auto",marginRight:"auto"}}/>
          <div style={{fontFamily:MONO,fontSize:9,color:"rgba(255,255,255,.42)",letterSpacing:4,marginBottom:14,textTransform:"uppercase"}}>Fund I — Confidential</div>
          <div style={{fontFamily:BEBAS,fontSize:42,color:"#fff",letterSpacing:2,lineHeight:.9,marginBottom:8}}>RESTRICTED ACCESS</div>
          <div style={{fontFamily:BODY,color:"rgba(255,255,255,.5)",fontSize:13,lineHeight:1.6,marginBottom:32}}>Enter the access password to view the Fund I materials.</div>

          <form onSubmit={submit} style={{display:"flex",flexDirection:"column",gap:12}}>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={e=>{setPassword(e.target.value); setErr(false);}}
              placeholder="PASSWORD"
              style={{
                fontFamily:MONO,
                fontSize:13,
                letterSpacing:3,
                textAlign:"center",
                color:"#fff",
                background:"rgba(255,255,255,.04)",
                border:`1.5px solid ${err?"#ff5555":"rgba(255,255,255,.18)"}`,
                padding:"16px 20px",
                outline:"none",
                transition:"border-color .2s",
              }}
            />
            <button
              type="submit"
              disabled={loading || !password}
              style={{
                fontFamily:BEBAS,
                fontSize:14,
                letterSpacing:3,
                color:"#000",
                background:"#fff",
                border:"none",
                padding:"14px 30px",
                cursor:loading||!password?"not-allowed":"pointer",
                opacity:loading||!password?.5:1,
                transition:"opacity .18s,transform .18s",
              }}
            >
              {loading ? "VERIFYING…" : "ENTER DECK →"}
            </button>
            {err && (
              <div style={{fontFamily:MONO,fontSize:9,color:"#ff5555",letterSpacing:2,marginTop:4,textTransform:"uppercase"}}>
                Incorrect password
              </div>
            )}
          </form>

          <div style={{fontFamily:MONO,fontSize:8,color:"rgba(255,255,255,.22)",letterSpacing:2,marginTop:36}}>
            BACKFIELDVENTURES.COM · AUSTIN, TX
          </div>
        </div>
      </div>
    </>
  );
}
