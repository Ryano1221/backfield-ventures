// @ts-nocheck
import { inFlowWindow } from "@/lib/os/flow";
import type { OfficeData } from "@/lib/os/night";

export function mountOffice(root: HTMLElement, data: OfficeData, opts: { now?: number; active?: () => boolean; onOpenBot?: (slug: string) => void; needs?: { slug: string; name: string; href: string | null }[] } = {}): { destroy: () => void; poke: () => void } {
const D = data;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/* Backfield bot office. Every bot, status, task and handoff comes from office-data.js (snapshot bots + interactions + os/packets). */
const LIGHT=root.dataset.theme==='b';
const portrait=window.matchMedia("(max-width: 640px)").matches;
const T=16, GW=portrait?22:42, GH=portrait?36:25, W=GW*T, H=GH*T;
const ROOMS=portrait?{
  executive:{x0:12,x1:21,y0:0,y1:6,iy:2,per:3,floor:'wood',name:'Executive',laneY:7*T+14,doorX:12*T+12},
  intelligence:{x0:0,x1:9,y0:9,y1:16,iy:11,per:3,floor:'slate',name:'Intelligence',laneY:7*T+14,doorX:9*T+6},
  investment:{x0:12,x1:21,y0:9,y1:16,iy:11,per:3,floor:'sage',name:'Investment',laneY:7*T+14,doorX:12*T+12},
  network:{x0:0,x1:9,y0:19,y1:26,iy:21,per:3,floor:'lav',name:'Network',laneY:17*T+14,doorX:9*T+6},
  growth:{x0:12,x1:21,y0:19,y1:26,iy:21,per:3,floor:'sand',name:'Growth',laneY:17*T+14,doorX:12*T+12},
  firm_os:{x0:0,x1:21,y0:29,y1:35,iy:31,per:6,floor:'concrete',name:'Firm OS',laneY:27*T+14,doorX:11*T-4},
}:{
  intelligence:{x0:0,x1:13,top:true,name:'Intelligence',floor:'slate',per:3},
  executive:{x0:14,x1:29,top:true,name:'Executive',floor:'wood',per:4},
  investment:{x0:30,x1:41,top:true,name:'Investment',floor:'sage',per:2},
  network:{x0:0,x1:18,top:false,name:'Network',floor:'lav',per:5},
  growth:{x0:19,x1:31,top:false,name:'Growth',floor:'sand',per:3},
  firm_os:{x0:32,x1:41,top:false,name:'Firm OS',floor:'concrete',per:2},
};
const TEAMKEY={'Executive':'executive','Network':'network','Investment':'investment','Intelligence':'intelligence','Growth':'growth','Firm OS':'firm_os'};
const BODY={executive:['#3b3b3b','#262626'],network:['#8f88b0','#6f6990'],investment:['#6f8f78','#55705d'],intelligence:['#6b8296','#536676'],growth:['#c8a56f','#a5844f'],firm_os:['#3f7350','#2c5539']};
const EYE={executive:'#f0ede8',network:'#d9d3ff',investment:'#c9f2d2',intelligence:'#bfe6ff',growth:'#ffe2a8',firm_os:'#b8ffcb'};
const STAT={'Working':'#8faa96','Needs Ryan':'#c8b89a','Idle':'#77736c','Paused':'#a09ab8'};
const KINDC={packet:'#f0ede8',result:'#8faa96',message:'#a09ab8',amendment:'#c8b89a'};
const KINDL={packet:'Packet',result:'Result',message:'Message',amendment:'Amendment'};
function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
function rng(seed){let s=seed||1;return()=>((s=Math.imul(s^s>>>15,2246822507)^Math.imul(s^s>>>13,3266489909))>>>0)/4294967296}

/* ---------- layout ---------- */
const bots=D.bots.map(b=>Object.assign({},b,{room:TEAMKEY[b.team]||'firm_os',h:hash(b.slug)}));
const bySlug={};bots.forEach(b=>bySlug[b.slug]=b);
const teamName={};bots.forEach(b=>{if(b.role==='Director'||b.role==='Executive')teamName[b.room]=b.name});
const SHORT={intelligence:'Intel',executive:'Exec',investment:'Invest',network:'Network',growth:'Growth',firm_os:'Firm'};
for(const k in ROOMS){
  const R=ROOMS[k];R.key=k;
  if(!portrait){R.y0=R.top?0:13;R.y1=R.top?10:24;R.iy=R.top?2:15;}
  const L=x=>(x.role==='Director'||x.role==='Executive')?1:0;const list=bots.filter(b=>b.room===k).sort((a,b)=>(L(b)-L(a))||a.name.localeCompare(b.name));
  R.bots=list;
  const seats=[];
  if(portrait){
    const cols=R.x1-R.x0>12?[0,3,6,13,16,19]:(R.x0>=12?[R.x0+1,R.x0+4,R.x0+7]:[R.x0,R.x0+3,R.x0+6]);
    for(let sy=R.iy;sy<=R.y1-1 && seats.length<list.length;sy+=2) for(const sx of cols){ if(seats.length<list.length) seats.push({sx,sy}); }
  }
  list.forEach((b,i)=>{
    if(portrait){const seat=seats[i]||{sx:R.x0+1,sy:R.iy};b.sx=seat.sx;b.sy=seat.sy;}
    else{const col=i%R.per,row=Math.floor(i/R.per);b.sx=R.x0+3+col*3;b.sy=R.iy+row*3;}
    b.hx=b.sx*T+26;b.hy=(b.sy+1)*T+1;b.x=b.hx;b.y=b.hy;b.dir=1;b.walk=null;b.queue=[];b.stack=0;b.pulse=0;b.lead=(b.role==='Director'||b.role==='Executive');});
  R.aisle=portrait?R.doorX:(R.x0+2)*T;R.door=portrait?R.laneY:(R.top?(11*T):(15*T));
}
const INBOX={x:40*T+8,y:12*T+2};
const LANE_R=11*T+10, LANE_L=12*T+12;

/* ---------- canvas ---------- */
root.classList.add('ofc'); if(LIGHT) root.classList.add('light');
const coarse=window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(max-width: 700px)").matches;
root.innerHTML=`<div class="ofc-stage"><div class="ofc-hud"><select class="ofc-win-select" aria-label="Time window"><option value="today">Today</option><option value="week">7 days</option><option value="all">All</option></select><div class="ofc-win" role="group" aria-label="Time window"><button type="button" data-w="today">Today</button><button type="button" data-w="week">7d</button><button type="button" data-w="all">All</button></div><div class="ofc-play" role="group" aria-label="Replay"><button type="button" class="pp">${reduce?'Play':'Pause'}</button><button type="button" class="sp on" data-s="1">1x</button><button type="button" class="sp" data-s="4">4x</button><button type="button" class="sp" data-s="16">16x</button><button type="button" class="sp-cycle">1x</button></div><label class="ofc-scrub"><span class="ct">Replay</span><input type="range" min="0" max="1" step="0.01" value="0" aria-label="Replay time" /></label></div><div class="ofc-view"><canvas></canvas><div class="ofc-layer"></div></div><p class="ofc-ticker" hidden></p></div>
<div class="legend"><span><i style="background:#7DBB91"></i>Working</span><span><i style="background:#c8b89a"></i>Needs you</span><span><i style="background:#8C8C8C"></i>Idle</span><span><i style="background:#A6A6A6"></i>Paused</span><span>${coarse?"Pinch to zoom. Double-tap a room.":"Scroll to zoom. Click a room to focus."}</span></div>`;
const stage=root.querySelector('.ofc-view'),cv=root.querySelector('canvas'),ctx=cv.getContext('2d'),layer=root.querySelector('.ofc-layer');
const bg=document.createElement('canvas');bg.width=W;bg.height=H;const g=bg.getContext('2d');
const buf=document.createElement('canvas');buf.width=W;buf.height=H;const c=buf.getContext('2d');
const cam={x:0,y:0,z:1.4};
let aim=null,dragging=false;
const clockNow=opts.now||Date.now();
const onOpen=opts.onOpenBot||(()=>{});
const isActive=()=>opts.active?opts.active():true;
function R_(x,y,w,h,col,cc){(cc||c).fillStyle=col;(cc||c).fillRect(x|0,y|0,w|0,h|0)}

/* ---------- static background ---------- */
function floor(R){
  const r=rng(hash(R.name));const x0=R.x0*T,y0=(R.y0+2)*T,x1=(R.x1+1)*T,y1=(R.y1+1)*T;
  for(let y=y0;y<y1;y+=T)for(let x=x0;x<x1;x+=T){
    if(R.floor==='wood'){for(let k=0;k<4;k++){const sh=['#7a5b40','#73563c','#7f6045','#6f5239'][(k+((x/T)|0))%4];R_(x,y+k*4,T,4,sh,g);R_(x+(((y/4+k)*7)%16),y+k*4,1,4,'#5c4430',g);}R_(x,y+15,T,1,'#634a34',g);}
    else if(R.floor==='slate'){R_(x,y,T,T,'#3d4752',g);R_(x+1,y+1,T-2,T-2,((x+y)/T)%2?'#435060':'#404b58',g);}
    else if(R.floor==='concrete'){R_(x,y,T,T,'#55534f',g);for(let k=0;k<3;k++)R_(x+r()*15,y+r()*15,1,1,'#4a4844',g);if(((x/T)+(y/T))%4==0)R_(x,y,T,1,'#4d4b47',g);}
    else{const cols={lav:['#5d5873','#59546e'],sage:['#53675a','#4f6256'],sand:['#7c6a55','#776550']}[R.floor];R_(x,y,T,T,cols[0],g);for(let yy=0;yy<T;yy+=2)for(let xx=(yy/2)%2;xx<T;xx+=2)R_(x+xx,y+yy,1,1,cols[1],g);}
  }
}
function wall(R){
  const x0=R.x0*T,x1=(R.x1+1)*T,y=R.y0*T;
  R_(x0,y,x1-x0,32,'#d9d2c5',g);R_(x0,y,x1-x0,4,'#2a2622',g);R_(x0,y+4,x1-x0,2,'#efe9de',g);R_(x0,y+27,x1-x0,5,'#8b8173',g);R_(x0,y+26,x1-x0,1,'#b9b0a2',g);
  for(let k=0;k<x1-x0;k+=4)R_(x0+k,y+30,1,2,'#7a7064',g);
  if(portrait){
    if(R.y0>0 && R.doorX && R.x1-R.x0<12){
      const dx=R.doorX-14;
      R_(dx,y,28,32,'#1a1816',g);R_(dx+2,y+6,24,26,'#2c2a27',g);R_(dx-2,y+2,2,30,'#5b5248',g);R_(dx+28,y+2,2,30,'#5b5248',g);
    }
    return;
  }
  if(!R.top){const dx=(R.x0+1)*T;R_(dx,y,32,32,'#000',g);R_(dx+2,y+4,28,28,'#2c2a27',g);R_(dx-2,y+2,2,30,'#5b5248',g);R_(dx+32,y+2,2,30,'#5b5248',g);}
}
function windowAt(x,y,w){R_(x-2,y-2,w+4,18,'#5b544b',g);const gr=g.createLinearGradient(0,y,0,y+14);gr.addColorStop(0,'#a9cbd9');gr.addColorStop(1,'#dbe9ea');g.fillStyle=gr;g.fillRect(x,y,w,14);R_(x+w/2-1,y,2,14,'#5b544b',g);R_(x+3,y+3,4,2,'#f4fbfb',g);R_(x+w/2+3,y+6,3,2,'#f4fbfb',g);R_(x-3,y+15,w+6,3,'#efe9de',g);}
function plant(x,y,big){R_(x-5,y-8,10,8,'#9a5b3c',g);R_(x-6,y-9,12,2,'#b06a47',g);const L=['#3f6b47','#4f8257','#2f5638'];const r=rng(x*31+y);for(let i=0;i<(big?16:10);i++){const a=r()*Math.PI,d=3+r()*(big?10:7);R_(x+Math.cos(a)*d*1.2-2,y-10-Math.sin(a)*d,4,3,L[i%3],g);}}
function shelf(x,y){R_(x,y,30,22,'#4b3a2c',g);for(let k=0;k<3;k++){R_(x+2,y+2+k*7,26,5,'#2e241b',g);for(let b=0;b<6;b++)R_(x+3+b*4,y+3+k*7,3,4,['#c47a6a','#8faa96','#c8b89a','#a09ab8','#f0ede8','#6b8296'][(b+k)%6],g);}}
function rack(x,y){R_(x,y,14,28,'#1d1f22',g);R_(x+1,y+1,12,26,'#2b2e33',g);for(let k=0;k<6;k++){R_(x+2,y+3+k*4,10,2,'#15171a',g);}}
function board(x,y,w){R_(x,y,w,16,'#f7f5f0',g);R_(x-1,y-1,w+2,1,'#8b8173',g);R_(x-1,y+16,w+2,2,'#8b8173',g);for(let k=0;k<4;k++)R_(x+3,y+3+k*3,(w-8)*(0.4+((k*37)%50)/100),1,['#3b5bab','#c0473a','#2d7a46','#3b3b3b'][k],g);}
function screenWall(x,y,w){R_(x,y,w,17,'#111417',g);R_(x+1,y+1,w-2,15,'#1b2a33',g);const r=rng(x);for(let i=0;i<14;i++)R_(x+3+r()*(w-6),y+3+r()*11,2,1,['#8fd3ff','#c8b89a','#8faa96'][i%3],g);R_(x+4,y+12,w-8,1,'#355466',g);}
function poster(x,y,col){R_(x,y,14,18,'#2a2622',g);R_(x+1,y+1,12,16,col,g);R_(x+3,y+4,8,3,'#f0ede8',g);R_(x+3,y+9,6,1,'#f0ede8',g);}
function rug(x,y,w,h,a,b){R_(x,y,w,h,a,g);R_(x+2,y+2,w-4,h-4,b,g);R_(x+4,y+4,w-8,h-8,a,g);}
function sofa(x,y){R_(x,y,40,10,'#6a3f34',g);R_(x,y+6,40,10,'#7d4c3f',g);R_(x-3,y+4,4,12,'#5e382e',g);R_(x+39,y+4,4,12,'#5e382e',g);}
function cooler(x,y){R_(x-4,y-20,8,8,'#bfe0f0',g);R_(x-5,y-12,10,12,'#e8e4dc',g);R_(x-5,y-1,10,1,'#8b8173',g);R_(x-2,y-9,2,2,'#c47a6a',g);R_(x+1,y-9,2,2,'#3b6fb5',g);}
function laneStrip(y){
  for(let x=0;x<W;x+=T){R_(x,y,T,T*2,'#b9b2a6',g);R_(x+1,y+1,T-2,T*2-2,((x/T)%2)?'#c2bbaf':'#bdb6aa',g);}
  R_(T,y+10,W-2*T,10,'#123D22',g);R_(T,y+10,W-2*T,1,'#7DBB91',g);R_(T,y+19,W-2*T,1,'#7DBB91',g);
}
function drawPortrait(){
  R_(0,0,W,H,'#1a1816',g);
  const ryanRoom={x0:0,x1:9,y0:0,y1:6,floor:'wood',name:'Ryan'};
  floor(ryanRoom);wall(ryanRoom);
  for(const k in ROOMS){floor(ROOMS[k]);wall(ROOMS[k]);}
  for(let y=0;y<H;y+=T){R_(10*T,y,2*T,T,'#b9b2a6',g);R_(10*T+1,y+1,2*T-2,T-2,((y/T)%2)?'#c2bbaf':'#bdb6aa',g);}
  R_(10*T+12,T,6,H-2*T,'#123D22',g);
  laneStrip(7*T);laneStrip(17*T);laneStrip(27*T);
  windowAt(16,8,40);windowAt(16*T,8,40);
  windowAt(T,9*T+8,28);windowAt(15*T,9*T+8,28);
  windowAt(T,19*T+8,28);windowAt(15*T,19*T+8,28);
  windowAt(T,29*T+8,36);windowAt(15*T,29*T+8,36);
  const rw=10*T, rh=7*T;
  rug(16,40,rw-48,28,'#123D22','#2A6B40');
  R_(16,72,36,14,'#8a6a48',g);R_(18,62,14,10,'#1a1a1a',g);R_(19,63,12,7,'#20352a',g);
  R_(rw-28,rh-34,4,16,'#2a2622',g);R_(rw-31,rh-38,10,4,'#7DBB91',g);
  plant(rw-18,rh-14,false);
  sofa(17*T,5*T);plant(20*T+4,6*T,false);
}
function drawBG(){
  if(portrait){drawPortrait();return;}
  R_(0,0,W,H,'#1a1816',g);
  // corridor
  for(let x=0;x<W;x+=T)for(let y=11*T;y<13*T;y+=T){R_(x,y,T,T,'#b9b2a6',g);R_(x+1,y+1,T-2,T-2,((x/T+y/T)%2)?'#c2bbaf':'#bdb6aa',g);}
  R_(2*T,11*T+9,37*T,14,'#123D22',g);R_(2*T,11*T+9,37*T,1,'#c8b89a',g);R_(2*T,11*T+22,37*T,1,'#c8b89a',g);
  for(const k in ROOMS){const R=ROOMS[k];floor(R);wall(R);}
  // walls between rooms + railings
  for(const k in ROOMS){const R=ROOMS[k];const x=(R.x1+1)*T;if(R.x1<41){R_(x-2,R.y0*T,4,(R.y1-R.y0+1)*T,'#2a2622',g);R_(x-2,R.y0*T+32,4,(R.y1-R.y0-1)*T,'#3a352f',g);}
    if(R.top){R_(R.x0*T,11*T-4,(R.x1-R.x0+1)*T,4,'#2a2622',g);R_(R.x0*T,11*T-5,(R.x1-R.x0+1)*T,1,'#5b5248',g);R_((R.x0+1)*T,11*T-5,32,5,'#b9b2a6',g);}}
  R_(0,24*T+10,W,6,'#2a2622',g);
  // decor per room (north walls)
  windowAt(7*T,10,26);windowAt(10*T+8,10,26);screenWall(20*T,8,62);windowAt(25*T+8,10,26);windowAt(28*T,10,20);windowAt(35*T,10,26);windowAt(38*T+4,10,26);
  board(9*T,13*T+8,46);board(13*T+4,13*T+8,46);poster(27*T,13*T+7,'#c47a6a');poster(28*T+4,13*T+7,'#3b6fb5');poster(29*T+8,13*T+7,'#c8b89a');
  for(let i=0;i<4;i++){R_(37*T+i*14,13*T+8,10,14,'#22262b',g);R_(35*T+i*14+2,13*T+11,2,2,i%2?'#8faa96':'#c8b89a',g);R_(35*T+i*14+6,13*T+15,2,2,'#c47a6a',g);}
  // executive lounge (row 8-10) + rug
  rug(18*T,8*T+4,8*T,2*T+6,'#3c2a22','#5a3d2f');sofa(19*T+6,8*T+10);sofa(23*T+6,8*T+10);R_(22*T+4,9*T,22,10,'#2e241b',g);R_(22*T+6,9*T+2,6,4,'#f0ede8',g);
  plant(15*T+4,10*T+12,true);plant(28*T+8,10*T+12,true);
  shelf(36*T,8*T+4);shelf(38*T+6,8*T+4);plant(40*T+10,4*T,true);
  plant(1*T+8,3*T,false);plant(12*T+10,10*T+12,false);
  rack(36*T,21*T+4);rack(37*T+4,21*T+4);rack(38*T+8,21*T+4);rack(39*T+12,21*T+4);
  plant(17*T+8,23*T+12,true);plant(20*T+6,17*T,false);plant(30*T+8,23*T+12,false);
  cooler(4*T,12*T+12);cooler(30*T,12*T+12);
  // Ryan's office, a real room at the east end of the courier lane
  const rx=35*T, ry=10*T+6, rw=7*T, rh=3*T;
  for(let yy=ry+4;yy<ry+rh;yy+=4)R_(rx+4,yy,rw-8,4,(yy/4)%2?'#7a5b40':'#6e5138',g);
  R_(rx,ry,4,rh,'#2a2622',g);R_(rx,ry,rw,5,'#2a2622',g);R_(rx+rw-4,ry,4,rh,'#2a2622',g);R_(rx,ry+rh-4,rw,4,'#2a2622',g);
  R_(rx+6,ry+1,rw-12,3,'#efe9de',g);
  windowAt(rx+18,ry+8,30);
  rug(rx+14,ry+22,46,16,'#123D22','#2A6B40');
  R_(rx+rw-52,ry+rh-30,40,16,'#8a6a48',g);R_(rx+rw-50,ry+rh-40,16,12,'#1a1a1a',g);R_(rx+rw-49,ry+rh-39,14,8,'#20352a',g);
  R_(rx+10,ry+rh-22,4,14,'#2a2622',g);R_(rx+7,ry+rh-26,10,4,'#7DBB91',g);
  plant(rx+rw-16,ry+rh-8,false);
  R_(rx+22,ry+8,36,8,'#f7f4ee',g);
  // elevator west end
  R_(0,11*T,6,2*T,'#2a2622',g);
}
/* ---------- sprites ---------- */
function desk(b,t){const x=b.sx*T+8,y=(b.sy+1)*T;const lead=b.lead;c.globalAlpha=b.status==='Paused'?0.38:1;
  R_(x-1,y-1,lead?36:34,13,'#2a2018');R_(x,y,lead?34:32,10,lead?'#8a6a48':'#9b7a57');R_(x,y,lead?34:32,2,lead?'#a3825c':'#b39370');R_(x,y+10,lead?34:32,5,lead?'#5e4630':'#6b5238');R_(x+2,y+15,3,2,'#2a2018');R_(x+(lead?29:27),y+15,3,2,'#2a2018');
  // monitor (left)
  const on=b.status!=='Paused';R_(x+2,y-9,13,10,'#1a1a1a');R_(x+3,y-8,11,7,on?(b.status==='Working'?'#1d3a2c':'#262b2e'):'#111');
  if(on&&b.status==='Working'){const glow=reduce?0.35:0.25+0.45*Math.abs(Math.sin((t+b.h)/280));c.globalAlpha=glow;R_(x+3,y-8,11,7,'#7DBB91');c.globalAlpha=b.status==='Paused'?0.38:1;const f=Math.floor(t/140+b.h)%6;for(let k=0;k<3;k++)R_(x+4,y-7+k*2,((k*5+f*3)%8)+2,1,'#e7f3eb');}
  if(on&&b.status==='Needs Ryan'){if(Math.floor(t/500)%2)R_(x+8,y-6,1,3,'#c8b89a');}
  R_(x+7,y+1,3,2,'#1a1a1a');
  // mug / papers
  R_(x+24,y+2,4,4,['#c47a6a','#f0ede8','#3b6fb5','#c8b89a'][b.h%4]);
  for(let k=0;k<Math.min(b.stack,4);k++)R_(x+17,y+5-k*2,7,2,k%2?'#f0ede8':'#ddd6c8');
  // status lamp
  R_(x+(lead?30:28),y-3,3,3,STAT[b.status]||'#777');
  c.globalAlpha=1;
}
function chair(b){const x=b.hx,y=b.hy;R_(x-7,y-12,14,10,'#1f1d1b');R_(x-6,y-11,12,8,'#34302c');}
function bot(x,y,b,s,t){
  x=Math.round(x);y=Math.round(y);
  const fade=b.status==='Paused'?0.38:1;
  const [bc,bd]=BODY[b.room],ey=EYE[b.room],v=b.h%3,ev=(b.h>>3)%3;
  const walking=s&&s.walking,fr=walking?Math.floor(t/140)%2:0;const bob=walking?(fr?-1:0):(!reduce&&(b.status==='Working'||b.status==='Idle')?Math.round(Math.sin((t+b.h)/260)):0);
  c.globalAlpha=.25*fade;R_(x-6,y-1,12,3,'#000');c.globalAlpha=fade;
  // legs
  if(walking){R_(x-4,y-5+(fr?0:1),3,5-(fr?0:1),'#2a2622');R_(x+1,y-5+(fr?1:0),3,5-(fr?1:0),'#2a2622');}else{R_(x-4,y-4,3,4,'#2a2622');R_(x+1,y-4,3,4,'#2a2622');}
  const by=y-11+bob;
  // body
  R_(x-6,by-1,12,8,'#161514');R_(x-5,by,10,6,bc);R_(x-5,by+4,10,2,bd);R_(x-1,by+1,2,2,STAT[b.status]||'#777');
  if(b.room==='executive'){R_(x-1,by,2,5,'#c47a6a');}
  // arms
  if(s&&s.carry){R_(x-8,by+1,3,3,bd);R_(x+5,by+1,3,3,bd);const kc=KINDC[s.carry]||'#fff';R_(x-5,by+2,10,6,'#161514');R_(x-4,by+3,8,4,kc);R_(x-4,by+3,8,1,'#fff');}
  else{const ty=(b.status==='Working'&&!walking&&Math.floor(t/150+b.h)%2)?1:0;R_(x-8,by+1+ty,3,5,bd);R_(x+5,by+1+(1-ty)*(b.status==='Working'&&!walking?1:0),3,5,bd);}
  // head
  const hw=v===2?14:12,hh=v===1?10:9,hx=x-hw/2,hy=by-hh-1;
  R_(hx-1,hy-1,hw+2,hh+2,'#161514');R_(hx,hy,hw,hh,'#e9e5dd');R_(hx,hy+hh-2,hw,2,'#c3bcae');if(v===1){R_(hx-1,hy-1,1,1,'#1a1816');R_(hx+hw,hy-1,1,1,'#1a1816');}
  R_(hx+2,hy+2,hw-4,hh-5,'#1c2420');
  const blink=(Math.floor(t/90+b.h)%40)===0, sleep=b.status==='Idle';
  const eyY=hy+3+(v===1?1:0);
  if(sleep||blink){R_(hx+3,eyY+1,3,1,ey);R_(hx+hw-6,eyY+1,3,1,ey);}
  else if(ev===0){R_(hx+3,eyY,2,2,ey);R_(hx+hw-5,eyY,2,2,ey);}
  else if(ev===1){R_(hx+3,eyY+1,hw-6,1,ey);R_(hx+3+((Math.floor(t/300+b.h)%(hw-7))),eyY,2,2,'#fff');}
  else{R_(hx+3,eyY,1,1,ey);R_(hx+4,eyY-1,1,1,ey);R_(hx+5,eyY,1,1,ey);R_(hx+hw-6,eyY,1,1,ey);R_(hx+hw-5,eyY-1,1,1,ey);R_(hx+hw-4,eyY,1,1,ey);}
  // antenna / team accessory
  const lamp=STAT[b.status]||'#777',on=b.status==='Needs Ryan'?Math.floor(t/400)%2:1;
  if(b.room==='intelligence'){R_(x,hy-4,1,4,'#161514');R_(x-3,hy-6,7,2,'#9fb3c4');R_(x-2,hy-7,5,1,'#cfdce6');R_(x,hy-8,1,1,lamp);}
  else if(b.room==='growth'){R_(hx-1,hy-3,hw+2,4,'#161514');R_(hx,hy-2,hw,3,'#c8b89a');R_(hx+hw-2,hy,5,2,'#a5844f');R_(x,hy-5,2,2,on?lamp:'#555');}
  else if(b.room==='firm_os'){R_(hx-1,hy-4,hw+2,5,'#161514');R_(hx,hy-3,hw,4,'#e0b43c');R_(hx+2,hy-4,hw-4,1,'#f1cd6a');R_(x-1,hy-6,2,2,on?lamp:'#555');}
  else{R_(x,hy-4,1,4,'#161514');R_(x-1,hy-6,3,3,on?lamp:'#555');if(b.lead){R_(x-2,hy-7,5,1,'#161514');}}
  if(b.room==='network'){R_(hx-2,hy+2,2,5,'#161514');R_(hx+hw,hy+2,2,5,'#161514');R_(hx-1,hy-2,hw+2,1,'#161514');R_(hx+hw,hy+7,1,2,'#161514');R_(hx+hw-3,hy+8,3,1,'#161514');}
  if(b.room==='investment'){R_(hx+2,eyY-1,4,4,'rgba(255,255,255,.0)');c.strokeStyle='#d8c27a';c.lineWidth=1;c.strokeRect(hx+2.5,eyY-1.5,3,3);c.strokeRect(hx+hw-5.5,eyY-1.5,3,3);}
  if(b.lead){R_(x+3,by+1,2,2,'#f0ede8');}
  if(sleep){const z=Math.floor(t/600+b.h)%3;c.fillStyle='#d9d3ff';c.font='bold 7px monospace';c.fillText('z',x+6+z,hy-2-z*2);if(z>0)c.fillText('z',x+9,hy-6);}
  if(b.status==='Paused'){R_(x-5,hy-16,3,7,'#A6A6A6');R_(x+2,hy-16,3,7,'#A6A6A6');}
  if(b.status==='Needs Ryan'&&!walking){const yy=hy-18+(reduce?0:Math.round(Math.sin(t/170)*3));R_(x-1,yy,3,8,'#c8b89a');R_(x-1,yy+10,3,3,'#c8b89a');}
  if(s&&s.sel){c.strokeStyle='#f0ede8';c.lineWidth=1;c.beginPath();c.ellipse(x+.5,y+.5,9,3.5,0,0,Math.PI*2);c.stroke();}
  c.globalAlpha=1;
}
/* ---------- movement ---------- */
const RYAN=portrait
  ?{x:34,y:78,x0:0,x1:9,y0:0,y1:6,name:'Ryan',key:'ryan',laneY:7*T+14,doorX:9*T+6}
  :{x:38*T+4,y:12*T,x0:35,x1:41,y0:10,y1:13,name:'Ryan',key:'ryan'};
function frontOf(b){
  const y=(b.sy+2)*T+10;
  if(!portrait) return{x:b.hx,y};
  const R=ROOMS[b.room];
  return{x:b.hx,y:Math.min(y,(R.y1+1)*T-8)};
}
function exitPts(b){const R=ROOMS[b.room],side=b.sx*T+1,wy=(b.sy+2)*T+10;return[{x:side,y:b.hy-2},{x:side,y:wy},{x:R.aisle,y:wy}]}
function route(from,to){
  const a=bySlug[from],R=ROOMS[a.room];
  if(portrait){
    const spine=11*T-4;
    const start={x:a.hx,y:a.hy};
    const dest=to==='ryan'
      ?{laneY:RYAN.laneY,doorX:RYAN.doorX,x:RYAN.x,y:RYAN.y}
      :(()=>{const b=bySlug[to],R2=ROOMS[b.room];return R2===R?null:{laneY:R2.laneY,doorX:R2.doorX,x:b.hx,y:frontOf(b).y};})();
    if(!dest){const b=bySlug[to],f=frontOf(b);return[start,{x:R.aisle,y:a.hy},{x:R.aisle,y:f.y},{x:f.x,y:f.y}];}
    return[start,{x:R.doorX,y:a.hy},{x:R.doorX,y:R.laneY},{x:spine,y:R.laneY},{x:spine,y:dest.laneY},{x:dest.doorX,y:dest.laneY},{x:dest.doorX,y:dest.y},{x:dest.x,y:dest.y}];
  }
  let p=exitPts(a);
  if(to==='ryan'){const lane=LANE_R;p.push({x:R.aisle,y:lane},{x:RYAN.x,y:lane},{x:RYAN.x,y:RYAN.y});return p;}
  const b=bySlug[to],R2=ROOMS[b.room],f=frontOf(b);
  if(R2===R){p.push({x:R.aisle,y:f.y},{x:f.x,y:f.y});return p;}
  const lane=R2.aisle>R.aisle?LANE_R:LANE_L;
  p.push({x:R.aisle,y:lane},{x:R2.aisle,y:lane},{x:R2.aisle,y:f.y},{x:f.x,y:f.y});return p;
}
const flyers=[];
const bursts=[];
let speed=1,paused=reduce,windowName='today',playIndex=0,fired=0,scrubbing=false;
let hover=null;
const pointers=new Map();
function esc(s){return String(s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function snippet(s){const t=String(s||'').trim(); const max=coarse?22:42; return t.length>max?t.slice(0,max-1).replace(/\s\S*$/,'')+'…':t}
function who(s){return s==='ryan'?'Ryan':(bySlug[s]?bySlug[s].name:s)}
function eventList(){
  return D.events.filter(e=>inFlowWindow(Date.parse(e.ts), windowName, clockNow));
}
let current=eventList();
function pickWindow(){
  if(D.events.some(e=>inFlowWindow(Date.parse(e.ts),'today',clockNow))) return 'today';
  if(D.events.some(e=>inFlowWindow(Date.parse(e.ts),'week',clockNow))) return 'week';
  return 'all';
}
windowName=pickWindow();
current=eventList();
function todayCount(key){
  let n=0;
  for(const e of D.events){
    if(!inFlowWindow(Date.parse(e.ts),'today',clockNow)) continue;
    const a=bySlug[e.f], b=e.t==='ryan'?null:bySlug[e.t];
    if((a&&a.room===key)||(b&&b.room===key)||(key==='ryan'&&e.t==='ryan')) n++;
  }
  return n;
}
function tintFor(ms){
  const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'numeric',hourCycle:'h23'}).format(new Date(ms)));
  if(hour>=20||hour<6) return 'rgba(6,12,18,0.42)';
  if(hour<8||hour>=17) return 'rgba(8,16,14,0.2)';
  return null;
}
const nightTint=tintFor(clockNow);
const night=Boolean(nightTint && nightTint.includes('0.42'));
const WINDOWS=[[7*T,10,26],[10*T+8,10,26],[25*T+8,10,26],[28*T,10,20],[35*T,10,26],[38*T+4,10,26]];
function viewW(){return stage.clientWidth||1}
function viewH(){return stage.clientHeight||1}
function clampCam(){
  const vw=viewW(), vh=viewH();
  cam.z=Math.max(viewW()<760?0.32:0.9, Math.min(3.3, cam.z));
  const maxX=W-vw/cam.z, maxY=H-vh/cam.z;
  cam.x=Math.max(Math.min(0,maxX)-24, Math.min(Math.max(0,maxX)+24, cam.x));
  cam.y=Math.max(Math.min(0,maxY)-24, Math.min(Math.max(0,maxY)+24, cam.y));
}
let didFit=false;
function fitInitial(){
  const vw=viewW(), vh=viewH();
  if(vw<40||vh<40||didFit) return;
  didFit=true;
  if(portrait){
    cam.z=Math.min(vw/W, vh/H);
    cam.x=(W-vw/cam.z)/2;
    cam.y=Math.max(0,(H-vh/cam.z)/2);
  }else if(vw<760){
    cam.z=Math.min(vw/W, vh/H);
    cam.x=(W-vw/cam.z)/2;
    cam.y=0;
  }else{
    cam.z=Math.max(1.05, Math.min(vw/W, vh/H));
    cam.x=(W-vw/cam.z)/2;
    cam.y=(H-vh/cam.z)/2;
  }
  clampCam();
}
function toView(x,y){return{left:(x-cam.x)*cam.z, top:(y-cam.y)*cam.z}}
function placeBubble(el,x,y){
  const p=toView(x,y);
  const vw=viewW();
  const margin=6;
  const width=el.offsetWidth||(coarse?140:180);
  const half=width/2;
  const flip=p.left<half+margin;
  el.classList.toggle('is-left', flip);
  const left=flip?Math.max(margin, Math.min(vw-width-margin, p.left-12)):Math.max(half+margin, Math.min(vw-half-margin, p.left));
  el.style.left=left+'px';
  el.style.top=Math.max(margin, Math.min(viewH()-8, p.top))+'px';
}
function worldAt(ev){
  const r=cv.getBoundingClientRect();
  return{x:(ev.clientX-r.left)/cam.z+cam.x, y:(ev.clientY-r.top)/cam.z+cam.y};
}
function focusRoom(R){
  const vw=viewW(), vh=viewH();
  const z=vw<760?2.35:2.2;
  const cx=((R.x0+R.x1+1)/2)*T, cy=((R.y0+R.y1+1)/2)*T;
  aim={z, x:cx-vw/(2*z), y:cy-vh/(2*z)};
}
const signs=[];
for(const k in ROOMS){const R=ROOMS[k];const el=document.createElement('div');el.className='sign';layer.appendChild(el);signs.push([el,R]);}
const ryanSign=document.createElement('div');ryanSign.className='sign';layer.appendChild(ryanSign);
function placeSigns(){
  const narrow=viewW()<520;
  signs.forEach(([el,R])=>{
    const py=portrait?(R.y0*T+4):(R.top?(R.y1*T-6):(R.y0*T+36));
    const p=toView((R.x0+(portrait?0.2:0.55))*T, py);
    const today=todayCount(R.key);
    const n=R.bots.length;
    const line=(portrait||narrow)?`${n===1?'1 bot':n+' bots'} · ${today} today`:`${n} · ${today} today`;
    el.className='sign'+(today>=8?' hot':'');
    el.innerHTML=`<b>${narrow?(SHORT[R.key]||R.name):R.name}</b><span>${line}</span>`;
    el.style.left='0px';
    const width=el.offsetWidth||90;
    el.style.left=Math.max(2, Math.min(viewW()-width-2, p.left))+'px';
    el.style.top=Math.max(2, Math.min(viewH()-30, p.top))+'px';
  });
  const p=toView(RYAN.x0*T+8, RYAN.y0*T+8);
  const waiting=flyers.filter(f=>f.hold&&f.wait).length;
  ryanSign.className='sign'+(waiting?' hot':'');
  ryanSign.innerHTML=`<b>Ryan</b><span>${waiting?waiting+' waiting':'office'}</span>`;
  ryanSign.style.left=p.left+'px'; ryanSign.style.top=p.top+'px';
}
const tags=new Map();
function tagFor(b){let el=tags.get(b);if(!el){el=document.createElement('div');el.className='tag-n';el.textContent=b.name;layer.appendChild(el);tags.set(b,el);}return el}
function courierColor(kind){return kind==='result'?'#7DBB91':kind==='message'?'#A6A6A6':kind==='amendment'?'#2A6B40':kind==='ask'?'#f4efe4':'#f7f4ee'}
function drawCourier(f,t){
  const x=Math.round(f.x), y=Math.round(f.y), step=Math.floor(t/110)%2;
  c.globalAlpha=.3;R_(x-6,y+1,14,3,'#000');c.globalAlpha=1;
  if(!f.wait){R_(x-5,y-3+(step?0:1),3,4,'#2a2622');R_(x+2,y-3+(step?1:0),3,4,'#2a2622');}
  const col=courierColor(f.kind);
  R_(x-8,y-16,16,11,col);R_(x-8,y-16,16,3,'#123D22');
  c.strokeStyle='#123D22';c.lineWidth=1;c.beginPath();c.moveTo(x-8,y-13);c.lineTo(x,y-8);c.lineTo(x+8,y-13);c.stroke();
  if(f.kind==='result')R_(x-3,y-12,6,2,'#123D22');
  if(f.wait||f.kind==='ask'){const yy=y-28+(reduce?0:Math.round(Math.sin(t/160)*3));R_(x-1,yy,3,8,'#c8b89a');R_(x-1,yy+10,3,3,'#c8b89a');}
}
function attachBubble(f){
  if(reduce) return;
  const el=document.createElement('div');
  el.className='bub '+(f.kind==='result'?'res':f.kind==='ask'?'ask':'');
  el.innerHTML=coarse?esc(snippet(f.title)):`<span class="w">${f.kind==='ask'?'Needs you':(KINDL[f.kind]||f.kind)}</span>${esc(snippet(f.title))}`;
  layer.appendChild(el);
  f.bubble=el;
}
function launchCourier(e, hold){
  if(!bySlug[e.f]) return;
  if(e.t!=='ryan' && !bySlug[e.t]) return;
  let path; try{ path=route(e.f, e.t); }catch(_err){ return; }
  if(!path||!path.length) return;
  const f={path,i:reduce&&!hold?path.length:0,x:path[0].x,y:path[0].y,kind:e.kind,title:e.title||'',hold:!!hold,wait:false,from:e.f,to:e.t,href:e.href||null,slug:e.slug||e.f,slot:hold?flyers.filter(x=>x.hold).length:0};
  if(reduce && hold){f.wait=true;f.x=RYAN.x+((f.slot%4)*16)-18;f.y=RYAN.y+Math.floor(f.slot/4)*10;}
  else if(!reduce) attachBubble(f);
  const sender=bySlug[e.f]; if(sender) sender.pulse=performance.now();
  flyers.push(f);
  const moving=flyers.filter(x=>!x.hold);
  if(moving.length>12){const old=flyers.find(x=>!x.hold&&!x.wait); if(old){old.bubble&&old.bubble.remove(); flyers.splice(flyers.indexOf(old),1);}}
}
function arriveCourier(f){
  if(f.hold){
    f.wait=true;
    f.x=RYAN.x+((f.slot%4)*16)-18;
    f.y=RYAN.y+Math.floor(f.slot/4)*10;
    return;
  }
  const recv=f.to==='ryan'?null:bySlug[f.to];
  if(recv){recv.pulse=performance.now(); bursts.push({x:recv.hx,y:recv.hy-16,t:performance.now()});}
  else bursts.push({x:f.x,y:f.y,t:performance.now()});
  f.done=true;
  if(f.bubble){f.bubble.style.opacity='0'; const node=f.bubble; setTimeout(()=>node.remove(),220);}
}
function stepCourier(f,dt){
  if(f.wait||f.done) return;
  if(!Number.isFinite(f.x)||!Number.isFinite(f.y)){const p0=f.path[0]||{x:0,y:0}; f.x=p0.x; f.y=p0.y;}
  const tgt=f.path[f.i];
  if(!tgt){arriveCourier(f);return;}
  const dx=tgt.x-f.x, dy=tgt.y-f.y, d=Math.hypot(dx,dy), v=(f.hold?260:170)*dt*Math.max(1,speed*0.85);
  if(d<=v){f.x=tgt.x;f.y=tgt.y;f.i++; if(f.i>=f.path.length) arriveCourier(f);}
  else{f.x+=dx/d*v; f.y+=dy/d*v;}
}
const ticker=root.querySelector('.ofc-ticker'), clock=root.querySelector('.ct'), range=root.querySelector('.ofc-scrub input'), playBtn=root.querySelector('.pp');
function setWindow(name){
  windowName=name;
  current=eventList();
  playIndex=0; fired=0;
  for(let i=flyers.length-1;i>=0;i--){ if(flyers[i].hold) continue; flyers[i].bubble&&flyers[i].bubble.remove(); flyers.splice(i,1); }
  range.max=String(Math.max(0,current.length-1));
  range.value='0';
  root.querySelectorAll('.ofc-win button').forEach(b=>b.classList.toggle('on', b.dataset.w===name));
  const sel=root.querySelector('.ofc-win-select'); if(sel) sel.value=name;
  if(current[0]) clock.textContent=current[0].at;
  else clock.textContent='No handoffs';
  if(!current.length){paused=true; playBtn.textContent='Play';}
}
function showTicker(e){
  ticker.hidden=false;
  ticker.textContent=`${who(e.f)} -> ${who(e.t)}: ${snippet(e.full||e.title)}`;
}
function paintClock(e){
  if(!e) return;
  clock.textContent=e.at;
  range.setAttribute('aria-valuetext', e.at);
}
root.querySelectorAll('.ofc-win button').forEach(b=>b.onclick=()=>setWindow(b.dataset.w));
const winSel=root.querySelector('.ofc-win-select'); if(winSel) winSel.onchange=()=>setWindow(winSel.value);
function paintSpeed(){ root.querySelectorAll('.sp').forEach(x=>x.classList.toggle('on', +x.dataset.s===speed)); const cycle=root.querySelector('.sp-cycle'); if(cycle) cycle.textContent=speed+'x'; }
const cycleBtn=root.querySelector('.sp-cycle'); if(cycleBtn) cycleBtn.onclick=()=>{ const seq=[1,4,16]; speed=seq[(seq.indexOf(speed)+1)%3]; paintSpeed(); };
playBtn.onclick=()=>{
  if(!current.length||reduce) return;
  if(!paused && fired>=current.length){ playIndex=0; fired=0; range.value='0'; }
  paused=!paused;
  if(paused===false && fired>=current.length){ playIndex=0; fired=0; }
  playBtn.textContent=paused?'Play':'Pause';
  playBtn.classList.toggle('on', paused);
};
root.querySelectorAll('.sp').forEach(bn=>bn.onclick=()=>{speed=+bn.dataset.s; paintSpeed();});
range.max=String(Math.max(0,current.length-1));
range.addEventListener('pointerdown',()=>{scrubbing=true;});
range.addEventListener('pointerup',()=>{scrubbing=false;});
range.addEventListener('input',()=>{
  playIndex=Number(range.value);
  fired=Math.min(current.length, Math.ceil(playIndex-1e-6));
  paintClock(current[Math.min(current.length-1, Math.max(0, Math.floor(playIndex)))]);
});
setWindow(windowName);
(opts.needs||[]).forEach(item=>{
  if(!bySlug[item.slug]) return;
  launchCourier({f:item.slug,t:'ryan',kind:'ask',title:item.name,href:item.href,slug:item.slug}, true);
});
function pickBot(p){
  let best=null,bd=22;
  bots.forEach(b=>{const d=Math.hypot(b.hx-p.x,(b.hy-8)-p.y); if(d<bd){bd=d;best=b;}});
  return best;
}
function pickWaiter(p){
  let best=null,bd=18;
  flyers.forEach(f=>{ if(!f.wait) return; const d=Math.hypot(f.x-p.x,f.y-p.y); if(d<bd){bd=d;best=f;} });
  return best;
}
function pickRoom(p){
  if(p.x>=RYAN.x0*T && p.x<=(RYAN.x1+1)*T && p.y>=RYAN.y0*T && p.y<=(RYAN.y1+1)*T) return RYAN;
  for(const k in ROOMS){const R=ROOMS[k]; if(p.x>=R.x0*T && p.x<=(R.x1+1)*T && p.y>=R.y0*T && p.y<=(R.y1+1)*T) return R;}
  return null;
}
let lastTap={t:0,key:''};
function onTap(ev){
  const p=worldAt(ev);
  const waiter=pickWaiter(p);
  if(waiter){ if(waiter.href) window.location.assign(waiter.href); else onOpen(waiter.slug); return; }
  const bot=pickBot(p);
  if(bot){ hover=bot; onOpen(bot.slug); return; }
  const room=pickRoom(p);
  if(!room) return;
  const now=performance.now();
  if(!coarse || (lastTap.key===room.key && now-lastTap.t<360)) focusRoom(room);
  lastTap={t:now, key:room.key};
}
let pinch=null;
stage.addEventListener('pointerdown',ev=>{
  try{stage.setPointerCapture(ev.pointerId);}catch(_err){}
  pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(pointers.size===2){const [a,b]=[...pointers.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:cam.z}; dragging=true; pointers.forEach(p=>{p.moved=true;}); return;}
  pinch=null;
  pointers.get(ev.pointerId).ox=cam.x; pointers.get(ev.pointerId).oy=cam.y; pointers.get(ev.pointerId).sx=ev.clientX; pointers.get(ev.pointerId).sy=ev.clientY; pointers.get(ev.pointerId).moved=false;
});
stage.addEventListener('pointermove',ev=>{
  const rec=pointers.get(ev.pointerId); if(!rec) return;
  rec.x=ev.clientX; rec.y=ev.clientY;
  if(pointers.size>=2 && pinch){
    const [a,b]=[...pointers.values()];
    const d=Math.hypot(a.x-b.x,a.y-b.y)||1;
    const before=worldAt(ev);
    cam.z=Math.max(portrait?0.45:0.9, Math.min(3.3, pinch.z*(d/pinch.d)));
    const after=worldAt(ev);
    cam.x+=before.x-after.x; cam.y+=before.y-after.y;
    clampCam(); aim=null; return;
  }
  if(Math.hypot(ev.clientX-rec.sx, ev.clientY-rec.sy)>7) rec.moved=true;
  if(rec.moved){ dragging=true; aim=null; cam.x=rec.ox-(ev.clientX-rec.sx)/cam.z; cam.y=rec.oy-(ev.clientY-rec.sy)/cam.z; clampCam(); }
  else { const p=worldAt(ev); hover=pickBot(p); cv.style.cursor=hover?'pointer':'grab'; }
});
function endPointer(ev){
  const rec=pointers.get(ev.pointerId);
  pointers.delete(ev.pointerId);
  if(pointers.size<2) pinch=null;
  if(rec && !rec.moved && pointers.size===0) onTap(ev);
  if(pointers.size===0) dragging=false;
}
stage.addEventListener('pointerup', endPointer);
stage.addEventListener('pointercancel', endPointer);
stage.addEventListener('wheel', ev=>{
  ev.preventDefault();
  const before=worldAt(ev);
  cam.z=Math.max(portrait?0.45:0.9, Math.min(3.3, cam.z*(ev.deltaY<0?1.1:0.9)));
  const after=worldAt(ev);
  cam.x+=before.x-after.x; cam.y+=before.y-after.y;
  clampCam(); aim=null;
}, {passive:false});
function blit(){
  const dpr=Math.min(2, window.devicePixelRatio||1);
  const vw=viewW(), vh=viewH();
  const pw=Math.max(1,Math.round(vw*dpr)), ph=Math.max(1,Math.round(vh*dpr));
  if(cv.width!==pw||cv.height!==ph){cv.width=pw; cv.height=ph; cv.style.width=vw+'px'; cv.style.height=vh+'px'; layer.style.width=vw+'px'; layer.style.height=vh+'px';}
  ctx.setTransform(dpr*cam.z,0,0,dpr*cam.z,-cam.x*cam.z*dpr,-cam.y*cam.z*dpr);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(buf,0,0);
  if(nightTint){ctx.setTransform(dpr,0,0,dpr,0,0); ctx.fillStyle=nightTint; ctx.fillRect(0,0,vw,vh);}
}
drawBG();
const ro=new ResizeObserver(()=>{ if(viewW()>40) fitInitial(); });
ro.observe(stage);
window.addEventListener('resize', fitInitial);
fitInitial();
let last=performance.now(), raf=0;
function frame(now){
  if(!isActive()){raf=0; return;}
  const dt=Math.min(0.05,(now-last)/1000); last=now;
  if(aim && !dragging){
    cam.z+=(aim.z-cam.z)*0.16; cam.x+=(aim.x-cam.x)*0.16; cam.y+=(aim.y-cam.y)*0.16;
    if(Math.abs(aim.z-cam.z)<0.02) aim=null;
    clampCam();
  }
  if(!paused && !reduce && current.length){
    playIndex=Math.min(current.length-1, playIndex + (dt*1000)/(900/speed));
    while(fired<current.length && playIndex+1e-6>=fired){
      const e=current[fired];
      if(e){ launchCourier(e,false); showTicker(e); paintClock(e); }
      fired++;
    }
    if(fired>=current.length){ paused=true; playBtn.textContent='Play'; playBtn.classList.toggle('on', true); playIndex=current.length-1; }
  }
  if(!reduce) flyers.forEach(f=>stepCourier(f,dt));
  for(let i=flyers.length-1;i>=0;i--) if(flyers[i].done) flyers.splice(i,1);
  c.setTransform(1,0,0,1,0,0);
  c.clearRect(0,0,W,H);
  c.drawImage(bg,0,0);
  if(night && !portrait){c.globalAlpha=.55; WINDOWS.forEach(([x,y,w])=>R_(x,y,w,12,'#d5e6d4')); c.globalAlpha=1; R_(RYAN.x0*T+20, RYAN.y0*T+10, 28, 10, '#d5e6d4');}
  const items=[];
  bots.forEach(b=>{items.push({y:(b.sy+1)*T+16,f:()=>{if(b.status==='Paused')c.globalAlpha=.38;chair(b);c.globalAlpha=1;bot(b.x,b.y,b,{sel:hover===b},now);desk(b,now)}});});
  items.sort((a,b)=>a.y-b.y).forEach(i=>i.f());
  bots.forEach(b=>{if(now-b.pulse<900){const a=1-(now-b.pulse)/900;c.globalAlpha=a;c.strokeStyle='#7DBB91';c.lineWidth=2;c.strokeRect(b.sx*T+4,(b.sy+1)*T-8,42,28);c.globalAlpha=1;}});
  bursts.forEach(b=>{const age=now-b.t; if(age>460) return; c.globalAlpha=1-age/460; c.strokeStyle='#7DBB91'; c.strokeRect(b.x-10-age/30,b.y-10-age/30,20+age/15,20+age/15); c.globalAlpha=1;});
  for(let i=bursts.length-1;i>=0;i--) if(now-bursts[i].t>480) bursts.splice(i,1);
  flyers.forEach(f=>drawCourier(f,now));
  blit();
  placeSigns();
  const moving=flyers.filter(f=>f.bubble&&!f.wait);
  moving.forEach((f,idx)=>{ const show=!coarse||idx>=moving.length-2; f.bubble.style.visibility=show?'visible':'hidden'; if(show) placeBubble(f.bubble,f.x,f.y-18); });
  flyers.forEach(f=>{ if(!f.bubble||!f.wait) return; f.bubble.style.visibility=coarse?'hidden':'visible'; if(!coarse) placeBubble(f.bubble,f.x,f.y-18); });
  bots.forEach(b=>{
    const show=b===hover;
    const el=tags.get(b);
    if(show){const t=tagFor(b); const p=toView(b.hx,(b.sy+2)*T); t.style.display='block'; t.style.left=p.left+'px'; t.style.top=p.top+'px';}
    else if(el) el.style.display='none';
  });
  if(!scrubbing && current.length) range.value=String(playIndex);
  raf=requestAnimationFrame(frame);
}
function poke(){ if(!raf && isActive()){ last=performance.now(); if(viewW()<40) fitInitial(); raf=requestAnimationFrame(frame);} }
poke();
return { destroy(){ cancelAnimationFrame(raf); raf=0; window.removeEventListener('resize', fitInitial); ro.disconnect(); }, poke };
}
