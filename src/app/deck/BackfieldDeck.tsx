"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const BEBAS = "var(--font-bebas, 'Bebas Neue', sans-serif)";
const MONO  = "var(--font-mono, 'Space Mono', monospace)";
const BODY  = "Switzer, 'Helvetica Neue', Arial, sans-serif";

/* ─────────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────────── */
const CSS = `
  @keyframes sInR  { from { opacity:0; transform:translateX(60px) scale(.975); } to { opacity:1; transform:none; } }
  @keyframes sInL  { from { opacity:0; transform:translateX(-60px) scale(.975); } to { opacity:1; transform:none; } }
  @keyframes fadeUp{ from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
  @keyframes marquee{ to { transform:translateX(-50%); } }
  @keyframes barGrow{ from { transform:scaleX(0); } to { transform:scaleX(1); } }
  @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }

  .sR { animation: sInR .44s cubic-bezier(.4,0,.2,1) both; }
  .sL { animation: sInL .44s cubic-bezier(.4,0,.2,1) both; }

  .fu  { animation: fadeUp .5s         both; }
  .fu1 { animation: fadeUp .5s .07s    both; }
  .fu2 { animation: fadeUp .5s .14s    both; }
  .fu3 { animation: fadeUp .5s .21s    both; }
  .fu4 { animation: fadeUp .5s .28s    both; }
  .fu5 { animation: fadeUp .5s .35s    both; }
  .fu6 { animation: fadeUp .5s .42s    both; }

  .c3 { transition:transform .28s ease,box-shadow .28s ease; transform-style:preserve-3d; }
  .c3:hover { transform:perspective(900px) rotateX(-1deg) rotateY(2deg) translateY(-4px); box-shadow:0 24px 60px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.1); }
  .c3l { transition:transform .28s ease,box-shadow .28s ease; transform-style:preserve-3d; }
  .c3l:hover { transform:perspective(900px) rotateX(-1deg) rotateY(2deg) translateY(-3px); box-shadow:0 16px 40px rgba(0,0,0,.1); }

  .rh  { transition:background .15s; cursor:default; }
  .rh:hover  { background:rgba(255,255,255,.06) !important; }
  .rhl { transition:background .15s; cursor:default; }
  .rhl:hover { background:rgba(0,0,0,.05) !important; }

  .bw  { background:#fff; color:#000; border:none; font-family:${BEBAS}; font-size:13px; letter-spacing:3px; padding:12px 30px; cursor:pointer; transition:opacity .18s,transform .18s; }
  .bw:hover  { opacity:.78; transform:translateY(-2px); }
  .bo  { background:transparent; color:#fff; border:1.5px solid rgba(255,255,255,.3); font-family:${BEBAS}; font-size:13px; letter-spacing:3px; padding:12px 30px; cursor:pointer; transition:border-color .18s,transform .18s; }
  .bo:hover  { border-color:#fff; transform:translateY(-2px); }
  .bb  { background:#000; color:#fff; border:1.5px solid #000; font-family:${BEBAS}; font-size:13px; letter-spacing:3px; padding:12px 30px; cursor:pointer; transition:opacity .18s,transform .18s; }
  .bb:hover  { opacity:.72; transform:translateY(-2px); }
  .bbl { background:transparent; color:#000; border:1.5px solid rgba(0,0,0,.28); font-family:${BEBAS}; font-size:13px; letter-spacing:3px; padding:12px 30px; cursor:pointer; transition:border-color .18s,transform .18s; }
  .bbl:hover { border-color:#000; transform:translateY(-2px); }

  .dot { cursor:pointer; transition:width .3s,background .3s; border-radius:3px; }
  .dot:hover { opacity:.8; }

  .wg { transition:box-shadow .25s,border-color .25s; }
  .wg:hover { box-shadow:0 0 32px rgba(255,255,255,.1),inset 0 0 0 1px rgba(255,255,255,.18); border-color:rgba(255,255,255,.18) !important; }

  .slide-inner { height:100%; display:flex; flex-direction:column; overflow:hidden; }

  /* logo img helpers */
  .logo-dark { filter:brightness(0) invert(1); }
  .logo-dark-soft { filter:invert(1) grayscale(1); }
  .logo-light { filter:brightness(0); }
  .logo-light-soft { filter:grayscale(1) brightness(.15); }
`;

/* ─────────────────────────────────────────────
   PARTICLE CANVAS
───────────────────────────────────────────── */
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const setSize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    setSize(); window.addEventListener("resize", setSize);
    const ctx = canvas.getContext("2d")!;
    const N = 80;
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

function CursorGlow() {
  const [p,setP]=useState({x:-999,y:-999});
  useEffect(()=>{
    const h=(e:MouseEvent)=>setP({x:e.clientX,y:e.clientY});
    window.addEventListener("mousemove",h,{passive:true});
    return()=>window.removeEventListener("mousemove",h);
  },[]);
  return <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:2,background:`radial-gradient(520px circle at ${p.x}px ${p.y}px,rgba(255,255,255,.04),transparent 40%)`}}/>;
}

/* ─────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────── */
function useCountUp(target:number,decimals=0,delay=160) {
  const [v,setV]=useState(0);
  useEffect(()=>{
    setV(0);
    const t=setTimeout(()=>{
      const steps=60,dur=1200,inc=target/steps; let cur=0,n=0;
      const id=setInterval(()=>{ n++; cur=Math.min(cur+inc,target); setV(parseFloat(cur.toFixed(decimals))); if(n>=steps) clearInterval(id); },dur/steps);
    },delay);
    return()=>clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  return v;
}

function useParallax() {
  const [p,setP]=useState({x:0,y:0});
  useEffect(()=>{
    const h=(e:MouseEvent)=>setP({x:(e.clientX/window.innerWidth-.5)*2,y:(e.clientY/window.innerHeight-.5)*2});
    window.addEventListener("mousemove",h,{passive:true});
    return()=>window.removeEventListener("mousemove",h);
  },[]);
  return p;
}

/* ─────────────────────────────────────────────
   SHARED UI
───────────────────────────────────────────── */
function Ticker() {
  const t="BACKFIELD VENTURES · FUND I · $20M–$25M TARGET · CONSUMER & SPORTS VC · AUSTIN, TX · EARLY STAGE · SEED / SERIES A · ";
  return (
    <div style={{height:22,background:"#fff",overflow:"hidden",display:"flex",alignItems:"center",flexShrink:0,zIndex:20}}>
      <div style={{display:"flex",whiteSpace:"nowrap",animation:"marquee 28s linear infinite"}}>
        {[t,t].map((s,i)=><span key={i} style={{fontFamily:BEBAS,fontSize:10,letterSpacing:4,color:"#000"}}>{s}</span>)}
      </div>
    </div>
  );
}

function ProgressBar({cur,total}:{cur:number;total:number}) {
  return (
    <div style={{height:1.5,background:"rgba(255,255,255,.07)",flexShrink:0,zIndex:20}}>
      <div style={{height:"100%",width:`${((cur+1)/total)*100}%`,background:"#fff",transition:"width .5s cubic-bezier(.4,0,.2,1)"}}/>
    </div>
  );
}

function Logo({light,size=36}:{light?:boolean;size?:number}) {
  return <img src="/logo-bw.png" alt="Backfield Ventures" style={{height:size,width:"auto",objectFit:"contain",filter:light?"none":"invert(1)",display:"block"}}/>;
}

function DotNav({cur,total,onGo,light}:{cur:number;total:number;onGo:(n:number)=>void;light?:boolean}) {
  return (
    <div style={{display:"flex",gap:5,alignItems:"center"}}>
      {Array.from({length:total}).map((_,i)=>(
        <div key={i} className="dot" onClick={()=>onGo(i)} style={{width:i===cur?22:5,height:4,background:i===cur?(light?"#000":"#fff"):(light?"rgba(0,0,0,.14)":"rgba(255,255,255,.18)")}}/>
      ))}
    </div>
  );
}

function Nav({cur,total,onPrev,onNext,onGo,light}:{cur:number;total:number;onPrev?:()=>void;onNext?:()=>void;onGo:(n:number)=>void;light?:boolean}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:8,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <DotNav cur={cur} total={total} onGo={onGo} light={light}/>
        <span style={{fontFamily:MONO,fontSize:7.5,color:light?"rgba(0,0,0,.26)":"rgba(255,255,255,.2)",letterSpacing:2}}>{String(cur+1).padStart(2,"0")} / {String(total).padStart(2,"0")}</span>
      </div>
      <div style={{display:"flex",gap:7,alignItems:"center"}}>
        <span style={{fontFamily:MONO,fontSize:7,color:light?"rgba(0,0,0,.16)":"rgba(255,255,255,.14)",letterSpacing:2}}>← → KEYS</span>
        {onPrev&&<button className={light?"bbl":"bo"} onClick={onPrev}>← PREV</button>}
        {onNext&&<button className={light?"bb":"bw"} onClick={onNext}>NEXT →</button>}
      </div>
    </div>
  );
}

function Header({n,label,light,right}:{n:string;label:string;light?:boolean;right?:string}) {
  return (
    <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <Logo light={light} size={30}/>
        <div style={{width:1,height:14,background:light?"rgba(0,0,0,.1)":"rgba(255,255,255,.1)"}}/>
        <span style={{fontFamily:MONO,fontSize:8,letterSpacing:3,color:light?"rgba(0,0,0,.55)":"rgba(255,255,255,.5)"}}>{n} — {label}</span>
      </div>
      {right&&<span style={{fontFamily:MONO,fontSize:8,color:light?"rgba(0,0,0,.5)":"rgba(255,255,255,.42)",letterSpacing:2}}>{right}</span>}
    </div>
  );
}

/* Slide wrappers */
const PAD = "clamp(16px,2vh,32px) 52px clamp(12px,1.5vh,24px) 56px";
function Dark({children}:{children:React.ReactNode}) {
  return <div className="slide-inner" style={{padding:PAD,position:"relative",zIndex:5}}>{children}</div>;
}
function Light({children}:{children:React.ReactNode}) {
  return <div className="slide-inner" style={{padding:PAD,position:"relative",zIndex:5,background:"#f0f0f0"}}>{children}</div>;
}

/* ─────────────────────────────────────────────
   BIG STAT (for market slides)
───────────────────────────────────────────── */
function BigStat({raw,label,source,light,delay=0}:{raw:string;label:string;source:string;light?:boolean;delay?:number}) {
  const m=raw.match(/^([^0-9]*)([0-9]+\.?[0-9]*)([^0-9]*)$/);
  const pfx=m?.[1]??"", num=parseFloat(m?.[2]??"0"), sfx=m?.[3]??"";
  const decs=(m?.[2]??"").includes(".")?1:0;
  const v=useCountUp(num,decs,160+delay);
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 24px",borderRight:light?"1px solid rgba(0,0,0,.08)":"1px solid rgba(255,255,255,.07)"}}>
      <div style={{fontFamily:BEBAS,fontSize:"clamp(38px,5.5vh,68px)",lineHeight:.9,letterSpacing:1,color:light?"#000":"#fff"}}>{pfx}{v}{sfx}</div>
      <div style={{fontFamily:MONO,fontSize:8,color:light?"rgba(0,0,0,.55)":"rgba(255,255,255,.5)",marginTop:6,letterSpacing:2,textTransform:"uppercase",lineHeight:1.4}}>{label}</div>
      <div style={{fontFamily:MONO,fontSize:7,color:light?"rgba(0,0,0,.42)":"rgba(255,255,255,.38)",marginTop:4,letterSpacing:1.5}}>{source}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DEAL ROW — dark
───────────────────────────────────────────── */
function DealRow({acquirer,aLogo,target,tLogo,value,valueNum,maxVal,cat,year,delay=0}:{
  acquirer:string;aLogo?:string;target:string;tLogo:string;
  value:string;valueNum:number;maxVal:number;cat:string;year:string;delay?:number;
}) {
  const [w,setW]=useState(0);
  useEffect(()=>{ const t=setTimeout(()=>setW((valueNum/maxVal)*100),delay+300); return()=>clearTimeout(t); },[valueNum,maxVal,delay]);
  return (
    <div className="rh" style={{padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,.06)",flex:1,display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
      <div style={{display:"grid",gridTemplateColumns:"110px 64px 110px 1fr auto",alignItems:"center",gap:0,marginBottom:7}}>
        {/* acquirer */}
        <div style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
          {aLogo
            ? <img src={aLogo} className="logo-dark" style={{height:28,maxWidth:100,objectFit:"contain",objectPosition:"center",opacity:.85}} alt={acquirer}/>
            : <span style={{fontFamily:BEBAS,fontSize:14,color:"#fff",letterSpacing:.5,textAlign:"center"}}>{acquirer}</span>
          }
        </div>
        {/* acquired arrow */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <span style={{fontFamily:MONO,fontSize:9,color:"rgba(255,255,255,.25)"}}>→</span>
          <span style={{fontFamily:MONO,fontSize:6,color:"rgba(255,255,255,.18)",letterSpacing:1.5,textTransform:"uppercase"}}>acquired</span>
        </div>
        {/* target */}
        <div style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
          <img src={tLogo} className="logo-dark" style={{height:28,maxWidth:100,objectFit:"contain",objectPosition:"center",opacity:.7}} alt={target}/>
        </div>
        {/* category */}
        <div style={{paddingLeft:16}}>
          <span style={{fontFamily:MONO,fontSize:7,letterSpacing:2,color:"rgba(255,255,255,.2)",border:"1px solid rgba(255,255,255,.08)",padding:"2px 5px",textTransform:"uppercase",whiteSpace:"nowrap"}}>{cat}</span>
        </div>
        {/* value + year */}
        <div style={{display:"flex",alignItems:"baseline",gap:6}}>
          <span style={{fontFamily:BEBAS,fontSize:22,color:"#fff",letterSpacing:1}}>{value}</span>
          <span style={{fontFamily:MONO,fontSize:7.5,color:"rgba(255,255,255,.22)"}}>{year}</span>
        </div>
      </div>
      <div style={{height:2.5,background:"rgba(255,255,255,.06)",transformOrigin:"left"}}>
        <div style={{height:"100%",width:`${w}%`,background:"#fff",transition:`width 1.4s cubic-bezier(.4,0,.2,1) ${delay}ms`}}/>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DEAL ROW — light
───────────────────────────────────────────── */
function DealRowLight({acquirer,aLogo,target,tLogo,value,valueNum,maxVal,cat,year,delay=0}:{
  acquirer:string;aLogo?:string;target:string;tLogo:string;
  value:string;valueNum:number;maxVal:number;cat:string;year:string;delay?:number;
}) {
  const [w,setW]=useState(0);
  useEffect(()=>{ const t=setTimeout(()=>setW((valueNum/maxVal)*100),delay+300); return()=>clearTimeout(t); },[valueNum,maxVal,delay]);
  return (
    <div className="rhl" style={{padding:"10px 16px",borderBottom:"1px solid rgba(0,0,0,.07)",flex:1,display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
      <div style={{display:"grid",gridTemplateColumns:"110px 64px 110px 1fr auto",alignItems:"center",gap:0,marginBottom:7}}>
        {/* acquirer */}
        <div style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
          {aLogo
            ? <img src={aLogo} className="logo-light" style={{height:28,maxWidth:100,objectFit:"contain",objectPosition:"center",opacity:.75}} alt={acquirer}/>
            : <span style={{fontFamily:BEBAS,fontSize:14,color:"#000",letterSpacing:.5,textAlign:"center"}}>{acquirer}</span>
          }
        </div>
        {/* acquired arrow */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <span style={{fontFamily:MONO,fontSize:9,color:"rgba(0,0,0,.22)"}}>→</span>
          <span style={{fontFamily:MONO,fontSize:6,color:"rgba(0,0,0,.28)",letterSpacing:1.5,textTransform:"uppercase"}}>acquired</span>
        </div>
        {/* target */}
        <div style={{display:"flex",justifyContent:"center",alignItems:"center"}}>
          <img src={tLogo} className="logo-light" style={{height:28,maxWidth:100,objectFit:"contain",objectPosition:"center",opacity:.65}} alt={target}/>
        </div>
        {/* category */}
        <div style={{paddingLeft:16}}>
          <span style={{fontFamily:MONO,fontSize:7,letterSpacing:2,color:"rgba(0,0,0,.3)",border:"1px solid rgba(0,0,0,.1)",padding:"2px 5px",textTransform:"uppercase",whiteSpace:"nowrap"}}>{cat}</span>
        </div>
        {/* value + year */}
        <div style={{display:"flex",alignItems:"baseline",gap:6}}>
          <span style={{fontFamily:BEBAS,fontSize:22,color:"#000",letterSpacing:1}}>{value}</span>
          <span style={{fontFamily:MONO,fontSize:7.5,color:"rgba(0,0,0,.3)"}}>{year}</span>
        </div>
      </div>
      <div style={{height:2.5,background:"rgba(0,0,0,.08)",transformOrigin:"left"}}>
        <div style={{height:"100%",width:`${w}%`,background:"#000",transition:`width 1.4s cubic-bezier(.4,0,.2,1) ${delay}ms`}}/>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   BRAND LOGO CARD
───────────────────────────────────────────── */
function BrandCard({name,logo,light}:{name:string;logo:string;light?:boolean}) {
  return (
    <div className={light?"c3l":"c3 wg"} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,background:light?"#fff":"rgba(255,255,255,.04)",border:`1px solid ${light?"rgba(0,0,0,.09)":"rgba(255,255,255,.08)"}`,padding:"14px 12px",cursor:"default",height:"100%",boxSizing:"border-box"}}>
      <img src={logo} style={{height:28,maxWidth:80,objectFit:"contain",filter:light?"grayscale(1) brightness(.1)":"brightness(0) invert(1)",opacity:light?.85:.75}} alt={name}/>
      <span style={{fontFamily:MONO,fontSize:7.5,color:light?"rgba(0,0,0,.45)":"rgba(255,255,255,.45)",letterSpacing:2.5,textTransform:"uppercase",textAlign:"center",lineHeight:1.3}}>{name}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SLIDE 0 — COVER
───────────────────────────────────────────── */
function Cover({onNext,onGo,total}:{onNext:()=>void;onGo:(n:number)=>void;total:number}) {
  const m=useParallax();
  const metrics=[
    {label:"FUND",        value:"FUND I"},
    {label:"FUND SIZE",   value:"$20M–$25M"},
    {label:"CATEGORIES",  value:"CPG & SPORTS"},
    {label:"STAGE",       value:"SEED / SERIES A"},
  ];
  return (
    <Dark>
      {/* subtle radial glow behind logo */}
      <div style={{position:"absolute",width:900,height:900,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(255,255,255,.028) 0%,transparent 60%)",top:"44%",left:"50%",transform:`translate(calc(-50% + ${m.x*18}px),calc(-50% + ${m.y*18}px))`,transition:"transform 1.1s ease",pointerEvents:"none"}}/>

      {/* top bar */}
      <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <span style={{fontFamily:MONO,fontSize:8,color:"rgba(255,255,255,.38)",letterSpacing:3}}>CONFIDENTIAL LP MATERIALS</span>
        <span style={{fontFamily:MONO,fontSize:8,color:"rgba(255,255,255,.38)",letterSpacing:3}}>AUSTIN, TX · 2026</span>
      </div>

      {/* large centered logo */}
      <div className="fu2" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",zIndex:10,position:"relative"}}>
        <img
          src="/logo-cover.png"
          alt="Backfield Ventures"
          style={{
            width:"clamp(320px,52vw,700px)",
            height:"auto",
            objectFit:"contain",
            transform:`translate(${m.x*10}px,${m.y*8}px)`,
            transition:"transform 1.1s ease",
            display:"block",
          }}
        />
      </div>

      {/* fund metrics strip */}
      <div className="fu3" style={{flexShrink:0,borderTop:"1px solid rgba(255,255,255,.08)",marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)"}}>
          {metrics.map(({label,value},i)=>(
            <div key={i} style={{padding:"16px 24px",borderRight:i<3?"1px solid rgba(255,255,255,.07)":"none",display:"flex",flexDirection:"column",gap:5}}>
              <span style={{fontFamily:MONO,fontSize:7.5,color:"rgba(255,255,255,.48)",letterSpacing:3,textTransform:"uppercase"}}>{label}</span>
              <span style={{fontFamily:BEBAS,fontSize:"clamp(18px,2.4vh,26px)",color:"#fff",letterSpacing:1,lineHeight:1}}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* bottom nav */}
      <div className="fu4" style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <DotNav cur={0} total={total} onGo={onGo}/>
        <button className="bw" onClick={onNext}>VIEW DECK →</button>
      </div>
    </Dark>
  );
}

/* ─────────────────────────────────────────────
   SLIDE 1 — THESIS
───────────────────────────────────────────── */
function Thesis({onNext,onPrev,onGo,total}:{onNext:()=>void;onPrev:()=>void;onGo:(n:number)=>void;total:number}) {
  return (
    <Dark>
      <Header n="01" label="INVESTMENT THESIS"/>

      {/* Overline */}
      <div className="fu1" style={{fontFamily:MONO,fontSize:8.5,color:"rgba(255,255,255,.55)",letterSpacing:4,marginBottom:8,flexShrink:0}}>TWO CATEGORIES. DEEP CONVICTION.</div>

      {/* Two category panels - fills remaining space */}
      <div className="fu2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,flex:1,minHeight:0}}>
        {[
          {n:"01",name:"CONSUMER",
           sub:"Brands people return to — and tell their friends about.",
           body:"Food, beverage, lifestyle, apparel. We back founders building repeat-purchase businesses with earned loyalty, clean cap tables, and cultural staying power.",
           criteria:["Repeat-purchase over impulse buy","Founder-led with long-term vision","Brand equity > single product","Clear path to distribution at scale"],
           tags:["CPG","DTC","FUNCTIONAL FOOD","LIFESTYLE","APPAREL"],
           stat:"$2.3T",statLabel:"Global CPG Market"},
          {n:"02",name:"SPORTS",
           sub:"Where culture, competition, and capital converge.",
           body:"Athlete brands, fan engagement, sports tech, performance analytics, wagering infrastructure — we understand sports from the field to the cap table.",
           criteria:["Real IP, data moat, or media rights","Cross-category appeal beyond the sport","Gen Z fandom + media upside","Clear institutional exit path"],
           tags:["ATHLETE BRANDS","SPORTS TECH","FAN ENGAGEMENT","ANALYTICS"],
           stat:"$495B",statLabel:"Global Sports Market"},
        ].map(({n,name,sub,body,criteria,tags,stat,statLabel})=>(
          <div key={n} className="c3 wg" style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.09)",padding:"clamp(16px,2vh,26px) 24px",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",right:8,top:-4,fontFamily:BEBAS,fontSize:"clamp(100px,14vh,160px)",color:"rgba(255,255,255,.022)",lineHeight:1,userSelect:"none"}}>{n}</div>
            <div style={{fontFamily:MONO,fontSize:8,color:"rgba(255,255,255,.3)",letterSpacing:3,marginBottom:6}}>{n}</div>
            <div style={{fontFamily:BEBAS,fontSize:"clamp(34px,4.8vh,54px)",color:"#fff",letterSpacing:1,marginBottom:6,lineHeight:.9}}>{name}</div>
            <div style={{fontFamily:BODY,fontStyle:"italic",color:"rgba(255,255,255,.38)",fontSize:"clamp(11px,1.4vh,13px)",marginBottom:12,lineHeight:1.6}}>{sub}</div>
            <div style={{fontFamily:BODY,color:"rgba(255,255,255,.5)",fontSize:"clamp(11px,1.35vh,13px)",lineHeight:1.8,marginBottom:14}}>{body}</div>
            {/* Investment criteria — fills the middle space */}
            <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"space-evenly",borderTop:"1px solid rgba(255,255,255,.07)",borderBottom:"1px solid rgba(255,255,255,.07)",paddingTop:10,paddingBottom:10,marginBottom:14}}>
              {criteria.map((c,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:4,height:4,background:"rgba(255,255,255,.35)",flexShrink:0,borderRadius:"50%"}}/>
                  <span style={{fontFamily:BODY,fontSize:"clamp(11px,1.35vh,13px)",color:"rgba(255,255,255,.48)",lineHeight:1.5}}>{c}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
                {tags.map(t=><span key={t} style={{border:"1px solid rgba(255,255,255,.18)",padding:"2px 7px",fontFamily:MONO,fontSize:7,letterSpacing:3,color:"rgba(255,255,255,.48)",textTransform:"uppercase"}}>{t}</span>)}
              </div>
              <div style={{display:"flex",alignItems:"baseline",gap:10}}>
                <span style={{fontFamily:BEBAS,fontSize:"clamp(26px,3.8vh,40px)",color:"#fff",letterSpacing:1}}>{stat}</span>
                <span style={{fontFamily:MONO,fontSize:8,color:"rgba(255,255,255,.32)",letterSpacing:2,textTransform:"uppercase"}}>{statLabel}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Nav cur={1} total={total} onPrev={onPrev} onNext={onNext} onGo={onGo}/>
    </Dark>
  );
}

/* ─────────────────────────────────────────────
   SLIDE 2 — CONSUMER MARKET
───────────────────────────────────────────── */
function ConsumerMarket({onNext,onPrev,onGo,total}:{onNext:()=>void;onPrev:()=>void;onGo:(n:number)=>void;total:number}) {
  const deals=[
    {acquirer:"Kimberly-Clark",aLogo:"/logos/kimberly-clark.png",target:"Kenvue",tLogo:"/logos/kenvue.png",value:"$48.7B",valueNum:48.7,maxVal:50,cat:"PERSONAL CARE",year:"2025",delay:0},
    {acquirer:"Mars",aLogo:"/logos/mars.svg",target:"Kellanova",tLogo:"/logos/kellanova.png",value:"$35.9B",valueNum:35.9,maxVal:50,cat:"SNACKING/CPG",year:"2024",delay:120},
    {acquirer:"Keurig Dr Pepper",aLogo:"/logos/keurig.png",target:"JDE Peet's",tLogo:"/logos/jde-peets.png",value:"$23.0B",valueNum:23.0,maxVal:50,cat:"BEVERAGE",year:"2025",delay:240},
    {acquirer:"Ferrero",aLogo:"/logos/ferrero.png",target:"WK Kellogg",tLogo:"/logos/wk-kellogg.svg",value:"$3.1B",valueNum:3.1,maxVal:50,cat:"FOOD",year:"2025",delay:360},
  ];
  const brands=[
    {name:"Liquid Death",logo:"/logos/liquid-death.png"},
    {name:"RXBAR",logo:"/logos/rxbar.png"},
    {name:"Athletic Brewing",logo:"/logos/athletic-brewing.png"},
    {name:"Hims & Hers",logo:"/logos/hims-hers.png"},
    {name:"Tecovas",logo:"/logos/tecovas.png"},
    {name:"C4 Energy",logo:"/logos/c4-energy.png"},
  ];
  return (
    <Dark>
      <Header n="02" label="CONSUMER MARKET" right="THE WINDOW IS OPEN NOW"/>

      {/* Stats row — full width, prominent numbers */}
      <div className="fu1" style={{display:"flex",flexShrink:0,borderBottom:"1px solid rgba(255,255,255,.07)",marginBottom:12,paddingBottom:12,minHeight:"clamp(70px,10vh,100px)"}}>
        <BigStat raw="$2.3T" label="Global CPG Market" source="ZION MARKET RESEARCH, 2024" delay={0}/>
        <BigStat raw="15.4%" label="DTC E-Commerce CAGR 2024–33" source="INVESP / STATISTA, 2024" delay={100}/>
        <BigStat raw="41%" label="Consumer M&A Value Growth 2025" source="PWC GLOBAL M&A TRENDS, 2025" delay={200}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 24px"}}>
          <div style={{fontFamily:BEBAS,fontSize:"clamp(26px,3.5vh,40px)",color:"#fff",lineHeight:.9,letterSpacing:1}}>THE CONSUMER MARKET IS<br/>CONSOLIDATING FAST.</div>
          <div style={{fontFamily:BODY,color:"rgba(255,255,255,.38)",fontSize:"clamp(10px,1.3vh,12.5px)",lineHeight:1.65,marginTop:8}}>The biggest players are buying everyone. The window for early-stage brands is wider than ever.</div>
        </div>
      </div>

      {/* M&A + brands */}
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:20,flex:1,minHeight:0}}>
        <div className="fu2" style={{display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{fontFamily:MONO,fontSize:8,color:"rgba(255,255,255,.45)",letterSpacing:3,marginBottom:6}}>RECENT M&A — BAR WIDTH = RELATIVE DEAL SIZE</div>
          <div style={{border:"1px solid rgba(255,255,255,.07)",background:"rgba(255,255,255,.02)",flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
            {deals.map((d,i)=><DealRow key={i} {...d}/>)}
          </div>
          <div style={{fontFamily:MONO,fontSize:6.5,color:"rgba(255,255,255,.14)",marginTop:4,letterSpacing:1.5}}>SOURCES: PWC M&A TRENDS · FOOD DIVE · CNBC 2024–2025</div>
        </div>
        <div className="fu3" style={{display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{fontFamily:MONO,fontSize:8,color:"rgba(255,255,255,.45)",letterSpacing:3,marginBottom:6}}>VC-BACKED BREAKOUT BRANDS</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gridTemplateRows:"repeat(2,1fr)",gap:4,flex:1}}>
            {brands.map((b,i)=><BrandCard key={i} name={b.name} logo={b.logo}/>)}
          </div>
        </div>
      </div>
      <Nav cur={2} total={total} onPrev={onPrev} onNext={onNext} onGo={onGo}/>
    </Dark>
  );
}

/* ─────────────────────────────────────────────
   SLIDE 3 — SPORTS MARKET
───────────────────────────────────────────── */
function SportsMarket({onNext,onPrev,onGo,total}:{onNext:()=>void;onPrev:()=>void;onGo:(n:number)=>void;total:number}) {
  const deals=[
    {acquirer:"Silver Lake",aLogo:"/logos/silver-lake.svg",target:"Endeavor",tLogo:"/logos/endeavor.svg",value:"$13.0B",valueNum:13,maxVal:13,cat:"SPORTS MEDIA",year:"2024",delay:0},
    {acquirer:"Private Investors",target:"LA Lakers",tLogo:"/logos/lakers.png",value:"$10.0B",valueNum:10,maxVal:13,cat:"FRANCHISE",year:"2025",delay:120},
    {acquirer:"Endeavor",aLogo:"/logos/endeavor.svg",target:"WWE → TKO",tLogo:"/logos/wwe.png",value:"$9.3B",valueNum:9.3,maxVal:13,cat:"ENTERTAINMENT",year:"2023",delay:240},
    {acquirer:"Private Investors",target:"Celtics",tLogo:"/logos/celtics.svg",value:"$6.1B",valueNum:6.1,maxVal:13,cat:"FRANCHISE",year:"2024",delay:360},
  ];
  const brands=[
    {name:"WHOOP",logo:"/logos/whoop.png"},
    {name:"Fanatics",logo:"/logos/fanatics.png"},
    {name:"DraftKings",logo:"/logos/draftkings.png"},
    {name:"Hudl",logo:"/logos/hudl.png"},
    {name:"Overtime",logo:"/logos/overtime.webp"},
    {name:"Sportradar",logo:"/logos/sportradar.png"},
  ];
  return (
    <Light>
      <Header n="03" label="SPORTS MARKET" light right="2025 WAS A RECORD YEAR"/>

      {/* Stats row */}
      <div className="fu1" style={{display:"flex",flexShrink:0,borderBottom:"1px solid rgba(0,0,0,.07)",marginBottom:12,paddingBottom:12,minHeight:"clamp(70px,10vh,100px)"}}>
        <BigStat raw="$495B" label="Global Sports Market 2025" source="STATISTA SPORTS OUTLOOK, 2025" light delay={0}/>
        <BigStat raw="21.9%" label="Sports Tech CAGR 2025–30" source="GRAND VIEW RESEARCH, 2024" light delay={100}/>
        <BigStat raw="$156B" label="Sports M&A Deal Value 2025" source="DRAKE STAR SPORTS TECH REPORT" light delay={200}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 24px",borderRight:"1px solid rgba(0,0,0,.07)"}}>
          <div style={{fontFamily:BEBAS,fontSize:"clamp(26px,3.5vh,40px)",color:"#000",lineHeight:.9,letterSpacing:1}}>SPORTS IS THE BEST<br/>INVESTMENT OF<br/>THE DECADE.</div>
          <div style={{fontFamily:BODY,color:"rgba(0,0,0,.42)",fontSize:"clamp(10px,1.3vh,12.5px)",lineHeight:1.65,marginTop:8}}>Record franchise valuations, $156B in M&A, and sports tech at escape velocity.</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:20,flex:1,minHeight:0}}>
        <div className="fu2" style={{display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{fontFamily:MONO,fontSize:8,color:"rgba(0,0,0,.52)",letterSpacing:3,marginBottom:6}}>RECENT M&A — BAR WIDTH = RELATIVE DEAL SIZE</div>
          <div style={{border:"1px solid rgba(0,0,0,.08)",background:"#fff",flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
            {deals.map((d,i)=><DealRowLight key={i} {...d}/>)}
          </div>
          <div style={{fontFamily:MONO,fontSize:6.5,color:"rgba(0,0,0,.22)",marginTop:4,letterSpacing:1.5}}>SOURCES: DRAKE STAR · SPORTICO · AXIOS 2023–2025</div>
        </div>
        <div className="fu3" style={{display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{fontFamily:MONO,fontSize:8,color:"rgba(0,0,0,.52)",letterSpacing:3,marginBottom:6}}>VC-BACKED SPORTS TECH & MEDIA LEADERS</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gridTemplateRows:"repeat(2,1fr)",gap:4,flex:1}}>
            {brands.map((b,i)=><BrandCard key={i} name={b.name} logo={b.logo} light/>)}
          </div>
        </div>
      </div>
      <Nav cur={3} total={total} onPrev={onPrev} onNext={onNext} onGo={onGo} light/>
    </Light>
  );
}

/* ─────────────────────────────────────────────
   SLIDE 4 — WHAT SEPARATES BACKFIELD
───────────────────────────────────────────── */
function Separates({onNext,onPrev,onGo,total}:{onNext:()=>void;onPrev:()=>void;onGo:(n:number)=>void;total:number}) {
  const items=[
    {n:"01",l:"NETWORK-FIRST MODEL",b:"We don't just write checks — we build a portfolio of companies that support each other through partnerships, distribution, and strategic collaboration."},
    {n:"02",l:"EXPERT-LED DILIGENCE",b:"Deep experience across technology, sports, and consumer sectors. Every deal runs through our proprietary scoring framework before a check is written."},
    {n:"03",l:"ELITE DEAL FLOW",b:"Exclusive access to opportunities typically reserved for institutional investors — driven by relationships across CPG, media, sports, and emerging tech."},
    {n:"04",l:"CONNECTED COMMUNITY",b:"A network of visionary influencers, investors, founders, and professionals aligned by shared goals with regular, transparent LP communication."},
    {n:"05",l:"STRATEGIC ALIGNMENT",b:"Backfield integrates capital, influence, and shared values. Our LPs become embedded in every company we back — more than backers, true partners."},
  ];
  return (
    <Light>
      <Header n="04" label="WHAT SEPARATES BACKFIELD" light/>
      <div className="fu1" style={{fontFamily:BEBAS,fontSize:"clamp(36px,5vh,58px)",color:"#000",lineHeight:.88,letterSpacing:1,marginBottom:"clamp(10px,1.5vh,18px)",flexShrink:0}}>WE&apos;RE BUILT DIFFERENT.</div>
      <div className="fu2" style={{display:"flex",flexDirection:"column",gap:2,flex:1,minHeight:0}}>
        {items.map(({n,l,b},i)=>(
          <div key={i} className="rhl" style={{background:"#fff",padding:"0 20px",display:"grid",gridTemplateColumns:"28px 200px 1fr",gap:16,alignItems:"center",flex:1,borderLeft:"3px solid transparent",transition:"border-color .2s"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderLeftColor="#000";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderLeftColor="transparent";}}>
            <span style={{fontFamily:MONO,fontSize:8,color:"rgba(0,0,0,.42)",letterSpacing:2}}>{n}</span>
            <div style={{fontFamily:BEBAS,fontSize:"clamp(13px,1.6vh,16px)",color:"#000",letterSpacing:2,textTransform:"uppercase",lineHeight:1.2}}>{l}</div>
            <div style={{fontFamily:BODY,fontSize:"clamp(11.5px,1.4vh,13.5px)",color:"#444",lineHeight:1.75}}>{b}</div>
          </div>
        ))}
      </div>
      <Nav cur={4} total={total} onPrev={onPrev} onNext={onNext} onGo={onGo} light/>
    </Light>
  );
}

/* ─────────────────────────────────────────────
   SLIDE 5 — FUND DETAILS
───────────────────────────────────────────── */
function FundDetails({onNext,onPrev,onGo,total}:{onNext:()=>void;onPrev:()=>void;onGo:(n:number)=>void;total:number}) {
  const hi=[
    {v:"$20–25M",l:"Fund Target",sub:"Fund I"},
    {v:"15–25",  l:"Portfolio Companies",sub:"Target"},
    {v:"3–7 YRS",l:"Investment Horizon",sub:"+ Extensions"},
  ];
  const rows=[
    ["FUND STRUCTURE",    "Delaware LP / Standard VC Terms"],
    ["TARGET STAGE",      "Seed / Series A"],
    ["INITIAL CHECK",     "$100K – $500K Per Company"],
    ["RESERVE RATIO",     "~40% Reserved for Follow-On"],
    ["MANAGEMENT FEE",    "2.0% Per Annum"],
    ["CARRIED INTEREST",  "20% Above 8% Preferred Return"],
    ["MIN. LP INVESTMENT","$50,000 (Accredited Investors Only)"],
  ];
  return (
    <Dark>
      <Header n="05" label="FUND DETAILS" right="CLEAN STRUCTURE. FAIR TERMS."/>
      {/* Hero numbers */}
      <div className="fu1" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2,marginBottom:10,flexShrink:0}}>
        {hi.map(({v,l,sub})=>(
          <div key={l} className="c3" style={{background:"#fff",padding:"clamp(16px,2.2vh,26px) 24px"}}>
            <div style={{fontFamily:BEBAS,fontSize:"clamp(32px,5vh,52px)",color:"#000",lineHeight:.95,letterSpacing:1}}>{v}</div>
            <div style={{fontFamily:BEBAS,fontSize:"clamp(12px,1.4vh,14px)",color:"rgba(0,0,0,.6)",marginTop:8,letterSpacing:3}}>{l}</div>
            <div style={{fontFamily:MONO,fontSize:7.5,color:"rgba(0,0,0,.36)",marginTop:3,letterSpacing:2}}>{sub}</div>
          </div>
        ))}
      </div>
      {/* Detail rows */}
      <div className="fu2" style={{display:"flex",flexDirection:"column",gap:1.5,flex:1,minHeight:0}}>
        {rows.map(([label,val],i)=>(
          <div key={i} className="rh" style={{display:"flex",alignItems:"center",flex:1,background:i%2===0?"rgba(255,255,255,.04)":"rgba(255,255,255,.02)",borderLeft:`2px solid ${i===0?"#fff":"rgba(255,255,255,.07)"}`,padding:"0 20px",minHeight:0}}>
            <div style={{fontFamily:MONO,fontSize:"clamp(7.5px,1vh,9.5px)",color:"rgba(255,255,255,.36)",letterSpacing:2.5,textTransform:"uppercase",minWidth:210,flexShrink:0}}>{label}</div>
            <div style={{fontFamily:BEBAS,fontSize:"clamp(13px,1.7vh,16px)",color:"#fff",letterSpacing:1}}>{val}</div>
          </div>
        ))}
      </div>
      <Nav cur={5} total={total} onPrev={onPrev} onNext={onNext} onGo={onGo}/>
    </Dark>
  );
}

/* ─────────────────────────────────────────────
   SLIDE 6 — PIPELINE
───────────────────────────────────────────── */
function Pipeline({onNext,onPrev,onGo,total}:{onNext:()=>void;onPrev:()=>void;onGo:(n:number)=>void;total:number}) {
  const deals=[
    {desc:"Skincare brand supporting active lifestyles with athlete-focused product lines",     cat:"PERSONAL CARE",    src:"MD Network",      rev:"~$20M",  stage:"TERM SHEET"},
    {desc:"Emerging sports team / league with strong brand identity and growth potential",      cat:"PRO SPORTS",       src:"Founder Network", rev:"~$10.5M", stage:"DUE DILIGENCE"},
    {desc:"Wearable tech enhancing performance and recovery via real-time data tracking",       cat:"SPORTS TECH",      src:"Advisor Network", rev:"~$6.5M",  stage:"INTRO CALL"},
    {desc:"Protein-infused overnight oats disrupting the functional breakfast category",        cat:"FUNCTIONAL FOODS", src:"Founder Network", rev:"~$3.3M",  stage:"EVALUATING"},
  ];
  const stageColor=(s:string)=>s==="TERM SHEET"?"rgba(255,255,255,.85)":s==="DUE DILIGENCE"?"rgba(255,255,255,.6)":"rgba(255,255,255,.35)";
  return (
    <Dark>
      <Header n="06" label="DEAL PIPELINE" right="DEAL FLOW ALREADY COMING TO US"/>
      <div className="fu1" style={{fontFamily:BEBAS,fontSize:"clamp(36px,5vh,56px)",color:"#fff",lineHeight:.88,letterSpacing:1,marginBottom:"clamp(8px,1.2vh,14px)",flexShrink:0}}>ACTIVE PIPELINE.</div>
      {/* Table header */}
      <div style={{display:"grid",gridTemplateColumns:"3fr 1.2fr 1fr .9fr .85fr",padding:"0 16px",marginBottom:4,flexShrink:0}}>
        {["COMPANY DESCRIPTION","CATEGORY","SOURCE","NET REV","STAGE"].map(h=>(
          <span key={h} style={{fontFamily:MONO,fontSize:7,letterSpacing:2.5,color:"rgba(255,255,255,.2)"}}>{h}</span>
        ))}
      </div>
      <div className="fu2" style={{display:"flex",flexDirection:"column",gap:2,flex:1,minHeight:0}}>
        {deals.map(({desc,cat,src,rev,stage},i)=>(
          <div key={i} className="rh c3" style={{display:"grid",gridTemplateColumns:"3fr 1.2fr 1fr .9fr .85fr",background:i%2===0?"rgba(255,255,255,.04)":"rgba(255,255,255,.02)",borderLeft:`2px solid ${i===0?"#fff":"rgba(255,255,255,.06)"}`,alignItems:"center",flex:1,minHeight:0}}>
            <div style={{padding:"0 14px",fontFamily:BODY,color:"rgba(255,255,255,.7)",fontSize:"clamp(11px,1.35vh,13px)",lineHeight:1.6}}>{desc}</div>
            <div style={{padding:"0 10px",fontFamily:MONO,fontSize:8,color:"rgba(255,255,255,.38)",letterSpacing:2,textTransform:"uppercase",lineHeight:1.3}}>{cat}</div>
            <div style={{padding:"0 10px",fontFamily:BODY,color:"rgba(255,255,255,.32)",fontSize:12}}>{src}</div>
            <div style={{padding:"0 10px"}}><span style={{fontFamily:BEBAS,fontSize:"clamp(15px,2vh,20px)",color:"#fff",letterSpacing:1}}>{rev}</span></div>
            <div style={{padding:"0 10px"}}><span style={{fontFamily:MONO,fontSize:7,letterSpacing:1.5,color:stageColor(stage),border:`1px solid ${stageColor(stage)}`,padding:"3px 6px",textTransform:"uppercase"}}>{stage}</span></div>
          </div>
        ))}
      </div>
      <Nav cur={6} total={total} onPrev={onPrev} onNext={onNext} onGo={onGo}/>
    </Dark>
  );
}

/* ─────────────────────────────────────────────
   SLIDE 7 — PROCESS
───────────────────────────────────────────── */
function Process({onNext,onPrev,onGo,total}:{onNext:()=>void;onPrev:()=>void;onGo:(n:number)=>void;total:number}) {
  const steps=[
    {n:"01",t:"DEAL SOURCING",       b:"Continuously evaluate top opportunities across CPG, sports, and consumer tech aligned with our thesis."},
    {n:"02",t:"INITIAL ASSESSMENT",  b:"Grade company, founders, product, and market A+ to F using our proprietary investment scorecard."},
    {n:"03",t:"DEEP DIVE ANALYSIS",  b:"In-depth diligence on financials, positioning, product differentiation, and risk factors."},
    {n:"04",t:"INVESTMENT DECISION", b:"Swift, decisive calls with one GP. Key insights shared with LPs in regular fund updates."},
    {n:"05",t:"CAPITAL DEPLOYMENT",  b:"Raise once. Deploy strategically over 3–5 years through structured capital calls."},
    {n:"06",t:"ACCELERATE GROWTH",   b:"Advisors and partners help portfolio companies grow through connections and visibility."},
    {n:"07",t:"LP ENGAGEMENT",       b:"Quarterly updates covering fund progress, new investments, and portfolio developments."},
    {n:"08",t:"PERFORMANCE TRACKING",b:"Consistent KPI tracking with quarterly portfolio performance reporting to LPs."},
    {n:"09",t:"EXIT STRATEGY",       b:"3–7 year exits targeting optimal returns. LPs fully informed throughout."},
  ];
  return (
    <Light>
      <Header n="07" label="THE PROCESS" light/>
      <div className="fu1" style={{fontFamily:BEBAS,fontSize:"clamp(32px,4.5vh,52px)",color:"#000",lineHeight:.88,letterSpacing:1,marginBottom:"clamp(8px,1.2vh,14px)",flexShrink:0}}>HOW WE WORK.</div>
      <div className="fu2" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:2,flex:1,minHeight:0}}>
        {steps.map(({n,t,b},i)=>(
          <div key={n} className="c3l" style={{background:"#fff",borderTop:`2px solid ${i===0?"#000":"rgba(0,0,0,.1)"}`,padding:"clamp(10px,1.4vh,18px) 16px",display:"flex",flexDirection:"column",transition:"border-color .2s",overflow:"hidden"}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderTopColor="#000";}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderTopColor=i===0?"#000":"rgba(0,0,0,.1)";}}>
            <span style={{fontFamily:MONO,fontSize:9,color:"#bbb",marginBottom:8,letterSpacing:2}}>{n}</span>
            <span style={{fontFamily:BEBAS,fontSize:"clamp(13px,1.6vh,16px)",color:"#000",marginBottom:7,letterSpacing:1.5}}>{t}</span>
            <span style={{fontFamily:BODY,fontSize:"clamp(10.5px,1.25vh,12.5px)",color:"#555",lineHeight:1.75,flex:1}}>{b}</span>
          </div>
        ))}
      </div>
      <Nav cur={7} total={total} onPrev={onPrev} onNext={onNext} onGo={onGo} light/>
    </Light>
  );
}

/* ─────────────────────────────────────────────
   ADVISOR CARD
───────────────────────────────────────────── */
function AdvisorCard({init,name,title,note,co,tags,highlight}:{init:string;name:string;title:string;note:string;co:string;tags:string[];highlight:string}) {
  return (
    <div className="c3 wg" style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.09)",padding:"clamp(14px,2vh,24px) 18px",display:"flex",flexDirection:"column"}}>
      <div style={{width:38,height:38,borderRadius:"50%",border:"1px solid rgba(255,255,255,.12)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12,background:"rgba(255,255,255,.05)",flexShrink:0}}>
        <span style={{fontFamily:BEBAS,fontSize:15,color:"rgba(255,255,255,.5)",letterSpacing:1}}>{init}</span>
      </div>
      <div style={{fontFamily:BEBAS,fontSize:"clamp(16px,2.2vh,22px)",color:"#fff",letterSpacing:1,marginBottom:2}}>{name}</div>
      <div style={{fontFamily:MONO,fontSize:8,color:"rgba(255,255,255,.48)",letterSpacing:2,marginBottom:3,textTransform:"uppercase"}}>{co}</div>
      <div style={{fontFamily:BODY,fontStyle:"italic",color:"rgba(255,255,255,.35)",fontSize:"clamp(10px,1.2vh,11px)",marginBottom:14,lineHeight:1.5}}>{title}</div>
      {/* Focus tags */}
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:12}}>
        {tags.map(t=><span key={t} style={{border:"1px solid rgba(255,255,255,.1)",padding:"2px 7px",fontFamily:MONO,fontSize:7,letterSpacing:2.5,color:"rgba(255,255,255,.3)",textTransform:"uppercase"}}>{t}</span>)}
      </div>
      {/* Highlight stat */}
      <div style={{flex:1,display:"flex",alignItems:"center",borderTop:"1px solid rgba(255,255,255,.06)",borderBottom:"1px solid rgba(255,255,255,.06)",padding:"12px 0",marginBottom:14}}>
        <span style={{fontFamily:BEBAS,fontSize:"clamp(18px,2.6vh,28px)",color:"rgba(255,255,255,.75)",letterSpacing:1}}>{highlight}</span>
      </div>
      <div style={{fontFamily:BODY,fontSize:"clamp(10.5px,1.3vh,12.5px)",color:"rgba(255,255,255,.45)",lineHeight:1.75}}>{note}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SLIDE 8 — ADVISORS
───────────────────────────────────────────── */
function Advisors({onNext,onPrev,onGo,total}:{onNext:()=>void;onPrev:()=>void;onGo:(n:number)=>void;total:number}) {
  const people=[
    {init:"AB",name:"Alex Bente", co:"ADvantage Sports",  title:"Founding Partner",          tags:["SPORTS M&A","GLOBAL NETWORK","FUND STRATEGY"],  highlight:"leAD Sports · Adidas Family Office", note:"Co-founded Adidas Family Office and leAD Sports. Unmatched access to the global sports investment ecosystem."},
    {init:"MB",name:"Matt Bocci", co:"Amity Ventures",    title:"Principal",                 tags:["EARLY STAGE","B2C TECH","WEST COAST VC"],        highlight:"Arketa · Prive · Sully AI",          note:"Early-stage tech investor. Key deals: Arketa, Prive, Sully AI. Elite west coast venture network."},
    {init:"JB",name:"Jaan Bains", co:"Saepio Capital",    title:"CEO & CIO",                 tags:["MACRO FINANCE","HEDGE FUNDS","CROSS-ASSET"],     highlight:"Former Blackstone · Multi-B AUM",    note:"Former Blackstone investor. Runs a global macro hedge fund with multi-billion cross-asset experience."},
    {init:"BW",name:"Blake Wiley",co:"Access Capital",    title:"Co-Founder, $150M+ AUM",    tags:["CONSUMER VC","CPG / DTC","SPORTS TECH"],         highlight:"$150M+ AUM Deployed",               note:"Portfolio includes Liquid Death, Whoop, C4 Energy, Beyond Meat, Hims & Hers, and Tecovas."},
  ];
  return (
    <Dark>
      <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <Logo size={30}/>
          <div style={{width:1,height:14,background:"rgba(255,255,255,.1)"}}/>
          <span style={{fontFamily:MONO,fontSize:8,letterSpacing:3,color:"rgba(255,255,255,.48)"}}>08 — ADVISORS & NETWORK</span>
        </div>
        <span style={{fontFamily:MONO,fontSize:8,color:"rgba(255,255,255,.42)",letterSpacing:2}}>$2B+ CAPITAL DEPLOYED ACROSS NETWORK</span>
      </div>
      <div className="fu1" style={{fontFamily:BEBAS,fontSize:"clamp(36px,5vh,56px)",color:"#fff",lineHeight:.88,letterSpacing:1,marginBottom:"clamp(12px,1.5vh,20px)",flexShrink:0}}>THE ROOM IS ALREADY FULL.</div>
      <div className="fu2" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:2,flex:1,minHeight:0}}>
        {people.map(p=><AdvisorCard key={p.name} {...p}/>)}
      </div>
      <Nav cur={8} total={total} onPrev={onPrev} onNext={onNext} onGo={onGo}/>
    </Dark>
  );
}

/* ─────────────────────────────────────────────
   SLIDE 9 — CLOSE
───────────────────────────────────────────── */
function CloseSlide({onPrev,onRestart,onGo,total}:{onPrev:()=>void;onRestart:()=>void;onGo:(n:number)=>void;total:number}) {
  const m=useParallax();
  return (
    <Dark>
      <div style={{position:"absolute",width:800,height:800,borderRadius:"50%",background:"radial-gradient(ellipse,rgba(255,255,255,.02) 0%,transparent 65%)",top:"50%",left:"50%",transform:`translate(calc(-50% + ${m.x*28}px),calc(-50% + ${m.y*28}px))`,transition:"transform .9s ease",pointerEvents:"none"}}/>
      <div style={{position:"absolute",fontFamily:BEBAS,fontSize:"min(20vw,24vh)",color:"rgba(255,255,255,.013)",whiteSpace:"nowrap",top:"50%",left:"50%",transform:`translate(calc(-50% + ${m.x*-12}px),calc(-50% + ${m.y*-8}px))`,transition:"transform .9s ease",userSelect:"none",pointerEvents:"none",letterSpacing:6}}>BACKFIELD</div>

      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",zIndex:10,position:"relative"}}>
        <div className="fu" style={{marginBottom:"clamp(16px,2.2vh,28px)"}}><Logo size={54}/></div>
        <div className="fu1" style={{width:1,height:"clamp(28px,4vh,48px)",background:"rgba(255,255,255,.12)",margin:"0 auto",marginBottom:"clamp(16px,2.2vh,28px)"}}/>
        <div className="fu2" style={{fontFamily:BEBAS,fontSize:"clamp(52px,9vh,100px)",color:"#fff",lineHeight:.86,letterSpacing:2,marginBottom:"clamp(10px,1.5vh,18px)"}}>
          LET&apos;S BUILD<br/>SOMETHING<br/>ICONIC.
        </div>
        <div className="fu3" style={{width:28,height:1,background:"rgba(255,255,255,.2)",margin:"0 auto",marginBottom:"clamp(10px,1.5vh,18px)"}}/>
        <div className="fu4" style={{fontFamily:BODY,color:"rgba(255,255,255,.42)",fontSize:"clamp(12px,1.6vh,15px)",lineHeight:1.85,maxWidth:440,margin:"0 auto",marginBottom:"clamp(20px,2.8vh,36px)"}}>
          Backfield Ventures is raising Fund I — targeting $20M to $25M. We&apos;re looking for LPs who want to back the next generation of culture-defining consumer and sports brands.
        </div>
        <div className="fu5" style={{display:"flex",gap:9,justifyContent:"center",marginBottom:"clamp(16px,2.2vh,28px)"}}>
          <button className="bw" onClick={onRestart}>↩ START OVER</button>
          <button className="bo" onClick={onPrev}>← BACK</button>
        </div>
        <div className="fu6" style={{display:"flex",justifyContent:"center",marginBottom:"clamp(10px,1.5vh,18px)"}}>
          <DotNav cur={total-1} total={total} onGo={onGo}/>
        </div>
        <span style={{fontFamily:MONO,fontSize:8,color:"rgba(255,255,255,.14)",letterSpacing:2}}>BACKFIELDVENTURES.COM · AUSTIN, TX · FUND I · 2026</span>
      </div>
    </Dark>
  );
}

/* ─────────────────────────────────────────────
   APP SHELL
───────────────────────────────────────────── */
export default function BackfieldDeck() {
  const TOTAL=10;
  const [slide,setSlide]=useState(0);
  const [dir,setDir]=useState(1);
  const [key,setKey]=useState(0);

  const go=useCallback((n:number)=>{ if(n===slide)return; setDir(n>slide?1:-1); setSlide(n); setKey(k=>k+1); },[slide]);
  const next=useCallback(()=>go(Math.min(slide+1,TOTAL-1)),[go,slide]);
  const prev=useCallback(()=>go(Math.max(slide-1,0)),[go,slide]);

  useEffect(()=>{
    const h=(e:KeyboardEvent)=>{ if(e.key==="ArrowRight"||e.key==="ArrowDown")next(); if(e.key==="ArrowLeft"||e.key==="ArrowUp")prev(); };
    window.addEventListener("keydown",h); return()=>window.removeEventListener("keydown",h);
  },[next,prev]);

  const shared={onNext:next,onPrev:prev,onGo:go,total:TOTAL};
  const slides=[
    <Cover          key={`s0-${key}`} onNext={next} onGo={go} total={TOTAL}/>,
    <Thesis         key={`s1-${key}`} {...shared}/>,
    <ConsumerMarket key={`s2-${key}`} {...shared}/>,
    <SportsMarket   key={`s3-${key}`} {...shared}/>,
    <Separates      key={`s4-${key}`} {...shared}/>,
    <FundDetails    key={`s5-${key}`} {...shared}/>,
    <Pipeline       key={`s6-${key}`} {...shared}/>,
    <Process        key={`s7-${key}`} {...shared}/>,
    <Advisors       key={`s8-${key}`} {...shared}/>,
    <CloseSlide     key={`s9-${key}`} onPrev={prev} onRestart={()=>go(0)} onGo={go} total={TOTAL}/>,
  ];

  return (
    <>
      <style>{CSS}</style>
      <div style={{position:"fixed",inset:0,background:"#000",zIndex:0}}/>
      <ParticleCanvas/>
      <CursorGlow/>
      <div style={{position:"fixed",inset:0,display:"flex",flexDirection:"column",fontFamily:BODY,zIndex:5,overflow:"hidden"}}>
        <div style={{flexShrink:0,zIndex:20}}>
          <Ticker/>
          <ProgressBar cur={slide} total={TOTAL}/>
        </div>
        <div key={key} className={dir>0?"sR":"sL"} style={{flex:1,minHeight:0,overflow:"hidden"}}>
          {slides[slide]}
        </div>
      </div>
    </>
  );
}
