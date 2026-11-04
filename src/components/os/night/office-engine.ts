// @ts-nocheck
import type { OfficeData } from "@/lib/os/night";

export function mountOffice(root: HTMLElement, data: OfficeData): () => void {
const D = data;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/* Backfield bot office. Every bot, status, task and handoff comes from office-data.js (snapshot bots + interactions + os/packets). */
const LIGHT=root.dataset.theme==='b';
const T=16, GW=42, GH=25, W=GW*T, H=GH*T;
const ROOMS={
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
  const R=ROOMS[k];R.key=k;R.y0=R.top?0:13;R.y1=R.top?10:24;R.iy=R.top?2:15;
  const L=x=>(x.role==='Director'||x.role==='Executive')?1:0;const list=bots.filter(b=>b.room===k).sort((a,b)=>(L(b)-L(a))||a.name.localeCompare(b.name));
  R.bots=list;
  list.forEach((b,i)=>{const col=i%R.per,row=Math.floor(i/R.per);b.sx=R.x0+3+col*3;b.sy=R.iy+row*3;
    b.hx=b.sx*T+26;b.hy=(b.sy+1)*T+1;b.x=b.hx;b.y=b.hy;b.dir=1;b.walk=null;b.queue=[];b.stack=0;b.pulse=0;b.lead=(b.role==='Director'||b.role==='Executive');});
  R.aisle=(R.x0+2)*T;R.door=R.top?(11*T):(15*T);
}
const INBOX={x:40*T+8,y:12*T+2};
const LANE_R=11*T+10, LANE_L=12*T+12;

/* ---------- canvas ---------- */
root.classList.add('ofc'); if(LIGHT) root.classList.add('light');
root.innerHTML=`<div class="ofc-bar"><span class="clk"><i></i><span class="ct">Replay</span></span><span class="sp-g"><button class="pp${reduce?' on':''}">${reduce?'Play':'Pause'}</button><button class="sp on" data-s="1">1x</button><button class="sp" data-s="3">3x</button><button class="sp" data-s="8">8x</button></span></div><div class="ofc-stage"><div class="ofc-scroll"><div class="ofc-inner" style="position:relative"><canvas></canvas><div class="ofc-layer"></div></div></div>
</div>
<div class="legend"><span><i style="background:#8faa96"></i>Working</span><span><i style="background:#c8b89a"></i>Needs you</span><span><i style="background:#77736c"></i>Idle</span><span><i style="background:#a09ab8"></i>Paused</span><span style="margin-left:auto">${window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(max-width: 700px)").matches ? "Tap" : "Click"} any bot to see its work</span></div>
<div class="ofc-below"><div class="ofc-card"><div class="h"><span>Handoffs</span><span class="cnt"></span></div><div class="feed"></div></div><div class="ofc-card"><div class="h"><span>Selected bot</span><span>Live status</span></div><div class="insp"></div></div></div>`;
const cv=root.querySelector('canvas'),ctx=cv.getContext('2d'),layer=root.querySelector('.ofc-layer'),inner=root.querySelector('.ofc-inner');
const bg=document.createElement('canvas');bg.width=W;bg.height=H;const g=bg.getContext('2d');
const buf=document.createElement('canvas');buf.width=W;buf.height=H;const c=buf.getContext('2d');
let S=2;
function fit(){const w=root.querySelector('.ofc-stage').clientWidth; if(!w)return; S=w<700?Math.min(1,w/W):Math.max(1,w/W); root.classList.toggle('is-narrow',S<1); const cw=Math.round(W*S),ch=Math.round(H*S);
  const dpr=window.devicePixelRatio||1; cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);cv.style.width=cw+'px';cv.style.height=ch+'px';
  inner.style.width=cw+'px';inner.style.height=ch+'px';layer.style.width=cw+'px';layer.style.height=ch+'px';placeSigns();}
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
function drawBG(){
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
  // Ryan inbox (corridor east end)
  R_(39*T+4,11*T+4,26,22,'#2a2622',g);R_(39*T+6,11*T+6,22,18,'#f0ede8',g);R_(39*T+9,11*T+10,16,2,'#123D22',g);R_(39*T+9,11*T+14,16,7,'#cfc8bb',g);R_(39*T+11,11*T+15,12,1,'#123D22',g);
  // elevator west end
  R_(0,11*T,6,2*T,'#2a2622',g);
}
/* ---------- sprites ---------- */
function desk(b,t){const x=b.sx*T+8,y=(b.sy+1)*T;const lead=b.lead;
  R_(x-1,y-1,lead?36:34,13,'#2a2018');R_(x,y,lead?34:32,10,lead?'#8a6a48':'#9b7a57');R_(x,y,lead?34:32,2,lead?'#a3825c':'#b39370');R_(x,y+10,lead?34:32,5,lead?'#5e4630':'#6b5238');R_(x+2,y+15,3,2,'#2a2018');R_(x+(lead?29:27),y+15,3,2,'#2a2018');
  // monitor (left)
  const on=b.status!=='Paused';R_(x+2,y-9,13,10,'#1a1a1a');R_(x+3,y-8,11,7,on?(b.status==='Working'?'#20352a':'#262b2e'):'#111');
  if(on&&b.status==='Working'){const f=Math.floor(t/180+b.h)%6;for(let k=0;k<3;k++)R_(x+4,y-7+k*2,((k*5+f*3)%8)+2,1,'#8faa96');}
  if(on&&b.status==='Needs Ryan'){if(Math.floor(t/500)%2)R_(x+8,y-6,1,3,'#c8b89a');}
  R_(x+7,y+1,3,2,'#1a1a1a');
  // mug / papers
  R_(x+24,y+2,4,4,['#c47a6a','#f0ede8','#3b6fb5','#c8b89a'][b.h%4]);
  for(let k=0;k<Math.min(b.stack,4);k++)R_(x+17,y+5-k*2,7,2,k%2?'#f0ede8':'#ddd6c8');
  // status lamp
  R_(x+(lead?30:28),y-3,3,3,STAT[b.status]||'#777');
}
function chair(b){const x=b.hx,y=b.hy;R_(x-7,y-12,14,10,'#1f1d1b');R_(x-6,y-11,12,8,'#34302c');}
function bot(x,y,b,s,t){
  x=Math.round(x);y=Math.round(y);
  const [bc,bd]=BODY[b.room],ey=EYE[b.room],v=b.h%3,ev=(b.h>>3)%3;
  const walking=s&&s.walking,fr=walking?Math.floor(t/140)%2:0;const bob=walking?(fr?-1:0):(b.status==='Working'&&!s.sleep?(Math.floor(t/400+b.h)%2?0:-1):0);
  c.globalAlpha=.25;R_(x-6,y-1,12,3,'#000');c.globalAlpha=1;
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
  const blink=(Math.floor(t/90+b.h)%40)===0, sleep=b.status==='Paused';
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
  if(b.status==='Needs Ryan'&&!walking){const yy=hy-14+(Math.floor(t/300)%2);R_(x-4,yy,9,10,'#161514');R_(x-3,yy+1,7,8,'#c8b89a');R_(x,yy+2,1,4,'#161514');R_(x,yy+7,1,1,'#161514');R_(x,yy+10,1,2,'#161514');}
  if(s&&s.sel){c.strokeStyle='#f0ede8';c.lineWidth=1;c.beginPath();c.ellipse(x+.5,y+.5,9,3.5,0,0,Math.PI*2);c.stroke();}
}
/* ---------- movement ---------- */
function roomOf(slug){return slug==='ryan'?null:ROOMS[bySlug[slug].room]}
function frontOf(b){return{x:b.hx,y:(b.sy+2)*T+10}}
function exitPts(b){const R=ROOMS[b.room],side=b.sx*T+1,wy=(b.sy+2)*T+10;return[{x:side,y:b.hy-2},{x:side,y:wy},{x:R.aisle,y:wy}]}
function route(from,to){
  const a=bySlug[from],R=ROOMS[a.room];let p=exitPts(a);
  if(to==='ryan'){const lane=LANE_R;p.push({x:R.aisle,y:R.top?R.door:R.door},{x:R.aisle,y:lane},{x:INBOX.x,y:lane},{x:INBOX.x,y:INBOX.y+18});return p;}
  const b=bySlug[to],R2=ROOMS[b.room],f=frontOf(b);
  if(R2===R){p.push({x:R.aisle,y:f.y},{x:f.x,y:f.y});return p;}
  const lane=R2.aisle>R.aisle?LANE_R:LANE_L;
  p.push({x:R.aisle,y:lane},{x:R2.aisle,y:lane},{x:R2.aisle,y:f.y},{x:f.x,y:f.y});return p;
}
const walkers=new Set();
let speed=1,paused=reduce;
function startTrip(e){
  const a=bySlug[e.f];if(!a)return;
  if(a.walk){a.queue.push(e);return;}
  const path=route(e.f,e.t);a.walk={path,i:0,ev:e,phase:'go',carry:e.kind};walkers.add(a);
  bubble(a,`<span class="w">${KINDL[e.kind]||e.kind} to ${e.t==='ryan'?'Ryan':bySlug[e.t].name}</span>${esc(e.title)}`,kcls(e.kind),4200);
  pushFeed(e);
}
function kcls(k){return k==='result'?'res':k==='message'?'msg':k==='amendment'?'amd':''}
function step(b,dt){
  const w=b.walk;const tgt=w.path[w.i];const dx=tgt.x-b.x,dy=tgt.y-b.y,d=Math.hypot(dx,dy),v=46*dt*speed;
  if(Math.abs(dx)>0.5)b.dir=dx>0?1:-1;
  if(d<=v){b.x=tgt.x;b.y=tgt.y;w.i++;if(w.i>=w.path.length)arrive(b);}else{b.x+=dx/d*v;b.y+=dy/d*v;}
}
function arrive(b){
  const w=b.walk;
  if(w.phase==='go'){const e=w.ev;if(e.t!=='ryan'){const r=bySlug[e.t];r.stack++;r.pulse=performance.now();}else{inboxPulse=performance.now();inboxCount++;}
    b.walk={path:w.path.slice(0,-1).reverse().concat([{x:b.hx,y:b.hy}]),i:0,ev:e,phase:'back',carry:null,wait:0.5};}
  else{b.walk=null;walkers.delete(b);b.x=b.hx;b.y=b.hy;if(b.queue.length)startTrip(b.queue.shift());}
}
/* ---------- DOM overlay: signs, bubbles, tags ---------- */
function esc(s){return String(s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
const signs=[];
for(const k in ROOMS){const R=ROOMS[k];const el=document.createElement('div');el.className='sign';el.innerHTML=`<b>${R.name}</b> · ${R.bots.length} bots`;layer.appendChild(el);signs.push([el,R]);}
const ib=document.createElement('div');ib.className='sign';ib.innerHTML='<b>Ryan</b> · inbox';layer.appendChild(ib);
function placeSigns(){const narrow=S<1;signs.forEach(([el,R])=>{const x=(R.x0+(R.top?0.6:3.4))*T;const y=R.y0*T+9;el.style.left=(x*S)+'px';el.style.top=(y*S)+'px';
  el.innerHTML=narrow?`<b>${SHORT[R.key]||R.name}</b> · ${R.bots.length}`:`<b>${R.name}</b> · ${R.bots.length} bots`;
  el.style.maxWidth='';el.style.overflow='';el.style.fontSize=narrow?'8px':'';el.style.letterSpacing=narrow?'0.02em':'';});
  ib.innerHTML=narrow?'<b>Ryan</b>':'<b>Ryan</b> · inbox';
  const inboxLeft=(INBOX.x-(narrow?8:74))*S;
  ib.style.left=(narrow?Math.max(4, Math.min(inboxLeft, root.querySelector('.ofc-stage').clientWidth-44)):inboxLeft)+'px';
  ib.style.top=((11*T+8)*S)+'px';
  ib.style.maxWidth='';ib.style.overflow='';ib.style.fontSize=narrow?'8px':'';}
const bubbles=new Map();
function bubble(b,html,cls,ms){let o=bubbles.get(b);if(!o){o={el:document.createElement('div')};layer.appendChild(o.el);bubbles.set(b,o);}
  o.el.className='bub '+(cls||'');o.el.innerHTML=html;o.until=performance.now()+ms/Math.max(1,speed*0.6);o.el.style.opacity=1;}
const tags=new Map();let selected=null,hover=null;
function tagFor(b){let el=tags.get(b);if(!el){el=document.createElement('div');el.className='tag-n';el.textContent=b.name;layer.appendChild(el);tags.set(b,el);}return el}
/* ---------- feed + inspector ---------- */
const feed=root.querySelector('.feed'),cnt=root.querySelector('.cnt'),insp=root.querySelector('.insp'),clk=root.querySelector('.ct');
let shown=0;
function who(s){return s==='ryan'?'Ryan':(bySlug[s]?bySlug[s].name:s)}
function pushFeed(e,quiet){const d=document.createElement('div');d.className='fe';
  const tp=e.at.replace(' CT','').split(', ');d.innerHTML=`<div class="t">${esc(tp[0])}<br>${esc(tp[1]||'')} CT</div><div><div class="r"><i class="kd ${e.kind}"></i><b>${esc(who(e.f))}</b> to <b>${esc(who(e.t))}</b> · ${KINDL[e.kind]||e.kind}${e.status?` · ${esc(e.status.replace('_',' '))}`:''}</div><div class="x">${esc(e.full)}</div></div>`;
  if(quiet)d.style.animation='none';feed.prepend(d);while(feed.children.length>40)feed.lastChild.remove();shown++;cnt.textContent=`${shown} of ${D.events.length} replayed`;if(!quiet)clk.textContent='Replay · '+e.at;}
function field(label, value){if(!value)return '';return `<dt>${esc(label)}</dt><dd>${esc(value)}</dd>`}
function inspect(b){selected=b;const ev=D.events.filter(e=>e.f===b.slug||e.t===b.slug).slice(-5).reverse();
  const role=b.role==='Outside tree'?'Works outside the director tree':b.role;
  const rows=[field('Now', b.result), field('Last seen', b.last), field('Job', b.scope), b.usage!=null?`<dt>Usage</dt><dd>${b.usage}% of Backfield bot usage, last 7 days</dd>`:'', b.source?`<dt>Source</dt><dd style="font-family:var(--mono);font-size:12px">${esc(b.source)}</dd>`:''].join('');
  insp.innerHTML=`<div class="nm">${esc(b.name)}</div><div class="tm">${esc(b.team)}${role?` · ${esc(role)}`:''}</div>
  <div class="st"><i style="background:${STAT[b.status]||'#777'}"></i>${esc(b.statusLabel|| (b.status==='Needs Ryan'?'Needs you':b.status))}</div>
  ${rows?`<dl>${rows}</dl>`:''}
  ${ev.length?`<div class="rh">Recent handoffs</div>`+ev.map(e=>`<div class="ri"><span>${esc(e.at.replace(' CT',''))}</span>${e.f===b.slug?'To '+esc(who(e.t)):'From '+esc(who(e.f))}: ${esc(e.title)}</div>`).join(''):''}`;}
/* ---------- input ---------- */
function pick(ev){const r=cv.getBoundingClientRect();const x=(ev.clientX-r.left)/S,y=(ev.clientY-r.top)/S;let best=null,bd=16;bots.forEach(b=>{const d=Math.hypot(b.x-x,(b.y-10)-y);if(d<bd){bd=d;best=b;}});return best}
cv.addEventListener('click',e=>{const b=pick(e);if(b)inspect(b)});
cv.addEventListener('mousemove',e=>{hover=pick(e);cv.style.cursor=hover?'pointer':'default'});
root.querySelector('.pp').onclick=e=>{paused=!paused;e.target.textContent=paused?'Play':'Pause';e.target.classList.toggle('on',paused)};
root.querySelectorAll('.sp').forEach(bn=>bn.onclick=()=>{speed=+bn.dataset.s;root.querySelectorAll('.sp').forEach(x=>x.classList.toggle('on',x===bn))});
/* ---------- replay scheduler ---------- */
const evs=D.events;const day=(D.built||'').slice(0,10);let idx=evs.length?Math.max(0,evs.findIndex(e=>!day||e.ts.slice(0,10)>=day)):0;
for(let k=Math.max(0,idx-6);k<idx;k++)pushFeed(evs[k],true);
let nextAt=0,inboxPulse=0,inboxCount=0,lastAmb=0;
function schedule(now){if(paused||!evs.length)return;if(now>=nextAt){const e=evs[idx%evs.length];if(!e)return;idx++;if(idx%evs.length===0){feed.innerHTML='';shown=0;}startTrip(e);nextAt=now+(idx<4+Math.max(0,evs.findIndex(ev=>!day||ev.ts.slice(0,10)>=day))?900:2600)/speed;}
  if(now-lastAmb>3200/speed){lastAmb=now;const cand=bots.filter(b=>!b.walk&&(b.status==='Working'||b.status==='Needs Ryan')&&b.result&&b.result!=='unknown'&&!/^(Last )?[Ww]rote\b/.test(b.result)&&!(bubbles.get(b)&&bubbles.get(b).until>now));
    if(cand.length){const b=cand[Math.floor(Math.random()*cand.length)];const txt=b.result.split(/(?<=[.;])\s/)[0].replace(/ Last wrote .*/,'').replace(/[;,.]$/,'');bubble(b,`<span class="w">${b.status==='Needs Ryan'?'Needs you':'Working on'}</span>${esc(txt.replace(/Ryan's yes/g,'your yes').length>110?txt.slice(0,108).replace(/\s\S*$/,'')+'…':txt.replace(/Ryan's yes/g,'your yes'))}`,b.status==='Needs Ryan'?'ask':'',4200);}}}
/* ---------- frame ---------- */
drawBG();fit();window.addEventListener('resize',fit);const stageEl=root.querySelector('.ofc-stage');const ro=new ResizeObserver(()=>fit());if(stageEl)ro.observe(stageEl);inspect(bySlug['executive']||bots[0]);
let last=performance.now(), raf=0;
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;schedule(now);
  if(!paused)walkers.forEach(b=>{if(b.walk.wait>0){b.walk.wait-=dt*speed;return;}step(b,dt)});
  c.drawImage(bg,0,0);
  const items=[];bots.forEach(b=>{items.push({y:(b.sy+1)*T+15,f:()=>{chair(b);if(!b.walk)bot(b.x,b.y,b,{sel:selected===b},now);desk(b,now)}});if(b.walk)items.push({y:b.y,f:()=>bot(b.x,b.y,b,{walking:b.walk.wait>0?false:true,carry:b.walk.carry,sel:selected===b},now)});});
  items.sort((a,b)=>a.y-b.y).forEach(i=>i.f());
  // inbox glow
  if(now-inboxPulse<900){c.globalAlpha=1-(now-inboxPulse)/900;c.strokeStyle='#c8b89a';c.lineWidth=2;c.strokeRect(39*T+2,11*T+2,30,26);c.globalAlpha=1;}
  // received pulse
  bots.forEach(b=>{if(now-b.pulse<700){const a=1-(now-b.pulse)/700;c.globalAlpha=a;c.strokeStyle='#f0ede8';c.lineWidth=1;c.strokeRect(b.sx*T+6,(b.sy+1)*T-3,38,20);c.globalAlpha=1;}});
  ctx.imageSmoothingEnabled=false;ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(buf,0,0,cv.width,cv.height);
  // overlay positions
  bubbles.forEach((o,b)=>{if(now>o.until){o.el.style.opacity=0;}const yh=b.y-(b.walk?30:36);let left=b.x*S;if(S<1){const half=Math.min(90,(o.el.offsetWidth||120)/2);left=Math.max(half+4,Math.min(left,cv.clientWidth-half-4));}o.el.style.left=left+'px';o.el.style.top=(yh*S)+'px';o.el.style.zIndex=Math.round(b.y);});
  bots.forEach(b=>{const show=S>=1&&(b===selected||b===hover||(b.lead&&!b.walk));const el=tags.get(b);if(show){const t=tagFor(b);t.style.display='block';t.classList.toggle('sel',b===selected);const ty=b.walk?b.y+3:(b.sy+2)*T+1;t.style.left=(b.x*S)+'px';t.style.top=(ty*S)+'px';}else if(el)el.style.display='none';});
  raf=requestAnimationFrame(frame);}
raf=requestAnimationFrame(frame);


return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", fit); ro.disconnect(); };
}
