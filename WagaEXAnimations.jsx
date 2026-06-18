import { useState, useEffect, useRef } from "react";

// ─── Canvas hook ─────────────────────────────────────────────────────────────
function useCanvasBg(canvasRef, activeBg) {
  const S = useRef({});
  const raf = useRef();

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const s = S.current;
    s.bg = activeBg;

    function resize() {
      cv.width = cv.offsetWidth;
      cv.height = cv.offsetHeight;
      boot();
    }

    function boot() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      const fn = INITS[s.bg];
      if (fn) fn(ctx, cv, s);
    }

    function loop(ts) {
      const fn = RENDERS[s.bg];
      if (fn) fn(ctx, cv, s, ts);
      else ctx.clearRect(0, 0, cv.width, cv.height);
      raf.current = requestAnimationFrame(loop);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    loop(0);
    return () => { cancelAnimationFrame(raf.current); ro.disconnect(); };
  }, [activeBg]);
}

// ─── BG: Hex ─────────────────────────────────────────────────────────────────
function initHex(ctx, cv, s) {
  const HS = 28; s.HS = HS; s.hexCells = [];
  const cols = Math.ceil(cv.width / (HS * 1.5)) + 2;
  const rows = Math.ceil(cv.height / (HS * Math.sqrt(3))) + 2;
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++)
      s.hexCells.push({ x: c*HS*1.5, y: r*HS*Math.sqrt(3)+(c%2)*HS*Math.sqrt(3)/2, base:.04+Math.random()*.05, ph:Math.random()*Math.PI*2, sp:.003+Math.random()*.008, glowing:Math.random()<.03, gt:Math.random()*Math.PI });
}
function renderHex(ctx, cv, s) {
  ctx.clearRect(0,0,cv.width,cv.height);
  const HS = s.HS||28;
  (s.hexCells||[]).forEach(c => {
    c.ph+=c.sp; let a=c.base+Math.sin(c.ph)*.02;
    if(c.glowing){c.gt+=.012;a=.05+Math.sin(c.gt)*.35;if(c.gt>Math.PI){c.glowing=false;c.gt=0;}}
    else if(Math.random()<.0003){c.glowing=true;c.gt=0;}
    ctx.beginPath();
    for(let i=0;i<6;i++){const ag=(Math.PI/3)*i-Math.PI/6;i===0?ctx.moveTo(c.x+HS*Math.cos(ag),c.y+HS*Math.sin(ag)):ctx.lineTo(c.x+HS*Math.cos(ag),c.y+HS*Math.sin(ag));}
    ctx.closePath();ctx.strokeStyle=`rgba(0,191,165,${Math.max(0,a)})`;ctx.lineWidth=.8;ctx.stroke();
  });
}

// ─── BG: Particles ───────────────────────────────────────────────────────────
function initParticles(ctx,cv,s){s.parts=Array.from({length:80},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,r:1.5+Math.random()*1.5}));}
function renderParticles(ctx,cv,s){
  ctx.clearRect(0,0,cv.width,cv.height);
  (s.parts||[]).forEach(p=>{p.x=(p.x+p.vx+cv.width)%cv.width;p.y=(p.y+p.vy+cv.height)%cv.height;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle="rgba(0,191,165,.5)";ctx.fill();});
  const ps=s.parts||[];
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const d=Math.hypot(ps[i].x-ps[j].x,ps[i].y-ps[j].y);if(d<110){ctx.beginPath();ctx.moveTo(ps[i].x,ps[i].y);ctx.lineTo(ps[j].x,ps[j].y);ctx.strokeStyle=`rgba(0,191,165,${.18*(1-d/110)})`;ctx.lineWidth=.8;ctx.stroke();}}
}

// ─── BG: Stars ───────────────────────────────────────────────────────────────
function initStars(ctx,cv,s){s.stars=Array.from({length:160},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height,r:.4+Math.random()*1.3,tw:Math.random()*Math.PI*2,sp:.01+Math.random()*.03,teal:Math.random()<.12}));}
function renderStars(ctx,cv,s){ctx.clearRect(0,0,cv.width,cv.height);(s.stars||[]).forEach(st=>{st.tw+=st.sp;const a=.2+Math.sin(st.tw)*.18;ctx.beginPath();ctx.arc(st.x,st.y,st.r,0,Math.PI*2);ctx.fillStyle=st.teal?`rgba(0,191,165,${a+.2})`:`rgba(200,220,255,${a})`;ctx.fill();});}

// ─── BG: Rain ────────────────────────────────────────────────────────────────
const RC="01アウエ∑⬡∇∆⊕";
function initRain(ctx,cv,s){const cols=Math.floor(cv.width/18);s.drops=Array.from({length:cols},(_,i)=>({x:i*18+9,y:Math.random()*-cv.height,sp:.8+Math.random()*1.4,len:6+Math.floor(Math.random()*10),chars:Array.from({length:16},()=>RC[Math.floor(Math.random()*RC.length)]),rf:0}));}
function renderRain(ctx,cv,s){
  ctx.fillStyle="rgba(15,17,23,.18)";ctx.fillRect(0,0,cv.width,cv.height);ctx.font="13px monospace";
  (s.drops||[]).forEach(d=>{d.y+=d.sp;d.rf++;if(d.rf>8){d.chars[Math.floor(Math.random()*d.chars.length)]=RC[Math.floor(Math.random()*RC.length)];d.rf=0;}
    for(let i=0;i<d.len;i++){const cy=d.y-i*16;if(cy<0||cy>cv.height)continue;ctx.fillStyle=i===0?`rgba(180,255,240,${1-i/d.len})`:`rgba(0,191,165,${(1-i/d.len)*.55})`;ctx.fillText(d.chars[i%d.chars.length],d.x-5,cy);}
    if(d.y-d.len*16>cv.height)d.y=-20;});
}

// ─── BG: Vortex ──────────────────────────────────────────────────────────────
function initVortex(ctx,cv,s){s.vLines=Array.from({length:120},()=>({angle:Math.random()*Math.PI*2,r:20+Math.random()*Math.min(cv.width,cv.height)*.45,sp:(.005+Math.random()*.015)*(Math.random()<.5?1:-1),len:.3+Math.random()*.8,alpha:.1+Math.random()*.25}));}
function renderVortex(ctx,cv,s){
  ctx.clearRect(0,0,cv.width,cv.height);const cx=cv.width/2,cy=cv.height/2;
  (s.vLines||[]).forEach(v=>{v.angle+=v.sp;const x1=cx+Math.cos(v.angle)*v.r*.8,y1=cy+Math.sin(v.angle)*v.r*.8,x2=cx+Math.cos(v.angle+v.len)*v.r,y2=cy+Math.sin(v.angle+v.len)*v.r;const g=ctx.createLinearGradient(x1,y1,x2,y2);g.addColorStop(0,`rgba(0,191,165,${v.alpha})`);g.addColorStop(1,"rgba(0,191,165,0)");ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=g;ctx.lineWidth=1.2;ctx.stroke();});
}

// ─── BG: Warp ────────────────────────────────────────────────────────────────
function initWarp(ctx,cv,s){s.warpLines=Array.from({length:80},()=>{const a=Math.random()*Math.PI*2;return{angle:a,dist:20+Math.random()*30,speed:1.5+Math.random()*4,alpha:.6+Math.random()*.4};});}
function renderWarp(ctx,cv,s){
  ctx.fillStyle="rgba(15,17,23,.25)";ctx.fillRect(0,0,cv.width,cv.height);const cx=cv.width/2,cy=cv.height/2,maxD=Math.hypot(cv.width,cv.height)/2;
  (s.warpLines||[]).forEach(w=>{w.dist+=w.speed;const len=Math.min(w.dist*.15,30);if(w.dist>maxD)w.dist=20;const x1=cx+Math.cos(w.angle)*(w.dist-len),y1=cy+Math.sin(w.angle)*(w.dist-len),x2=cx+Math.cos(w.angle)*w.dist,y2=cy+Math.sin(w.angle)*w.dist,prog=w.dist/maxD;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=`rgba(0,191,165,${w.alpha*(1-prog*.5)})`;ctx.lineWidth=.5+prog*1.5;ctx.stroke();});
}

// ─── BG: Lightning ───────────────────────────────────────────────────────────
function initLightning(ctx,cv,s){s.bolts=[];s.boltTimer=0;}
function renderLightning(ctx,cv,s){
  ctx.clearRect(0,0,cv.width,cv.height);s.boltTimer=(s.boltTimer||0)+1;
  if(s.boltTimer>45+Math.random()*55){
    const x=Math.random()*cv.width,segs=[{x,y:0}];let cy=0,cx2=x;
    while(cy<cv.height){cy+=15+Math.random()*25;cx2+=(Math.random()-.5)*60;segs.push({x:cx2,y:cy});}
    const bolt={segs,life:1,branches:[]};
    const bi=Math.floor(segs.length*.3+Math.random()*segs.length*.4);
    const bsegs=[segs[bi]];let bx=segs[bi].x,by=segs[bi].y;
    for(let i=0;i<4;i++){by+=15+Math.random()*20;bx+=(Math.random()-.5)*40;bsegs.push({x:bx,y:by});}
    bolt.branches.push(bsegs);s.bolts.push(bolt);s.boltTimer=0;
  }
  s.bolts=(s.bolts||[]).filter(b=>b.life>0);
  s.bolts.forEach(b=>{b.life-=.04;const draw=(segs,w,a)=>{ctx.beginPath();segs.forEach((sg,i)=>i===0?ctx.moveTo(sg.x,sg.y):ctx.lineTo(sg.x,sg.y));ctx.strokeStyle=`rgba(0,255,191,${a*b.life})`;ctx.lineWidth=w;ctx.shadowColor="rgba(0,191,165,.8)";ctx.shadowBlur=12;ctx.stroke();ctx.shadowBlur=0;};draw(b.segs,2,1);draw(b.segs,.8,.5);b.branches.forEach(br=>draw(br,1,.6));});
}

// ─── BG: Lava ────────────────────────────────────────────────────────────────
function initLava(ctx,cv,s){s.lavaBlobs=Array.from({length:12},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:50+Math.random()*90,ph:Math.random()*Math.PI*2,sp:.005+Math.random()*.01}));}
function renderLava(ctx,cv,s){
  ctx.clearRect(0,0,cv.width,cv.height);
  (s.lavaBlobs||[]).forEach(b=>{b.x+=b.vx;b.y+=b.vy;b.ph+=b.sp;if(b.x<-b.r)b.x=cv.width+b.r;if(b.x>cv.width+b.r)b.x=-b.r;if(b.y<-b.r)b.y=cv.height+b.r;if(b.y>cv.height+b.r)b.y=-b.r;const r2=b.r*(1+Math.sin(b.ph)*.2);const g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,r2);g.addColorStop(0,"rgba(0,255,180,.2)");g.addColorStop(.5,"rgba(0,191,165,.08)");g.addColorStop(1,"rgba(0,0,0,0)");ctx.beginPath();ctx.arc(b.x,b.y,r2,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();});
}

// ─── BG: Fireflies ───────────────────────────────────────────────────────────
function initFireflies(ctx,cv,s){s.flies=Array.from({length:55},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height,vx:(Math.random()-.5)*.6,vy:(Math.random()-.5)*.6,ph:Math.random()*Math.PI*2,sp:.02+Math.random()*.04,r:2+Math.random()*3,trail:[]}));}
function renderFireflies(ctx,cv,s){
  ctx.fillStyle="rgba(15,17,23,.12)";ctx.fillRect(0,0,cv.width,cv.height);
  (s.flies||[]).forEach(f=>{
    f.ph+=f.sp;f.vx+=(Math.random()-.5)*.05;f.vy+=(Math.random()-.5)*.05;f.vx=Math.max(-1.2,Math.min(1.2,f.vx));f.vy=Math.max(-1.2,Math.min(1.2,f.vy));
    f.x=(f.x+f.vx+cv.width)%cv.width;f.y=(f.y+f.vy+cv.height)%cv.height;
    f.trail.push({x:f.x,y:f.y});if(f.trail.length>18)f.trail.shift();
    const a=.4+Math.sin(f.ph)*.4;
    f.trail.forEach((p,i)=>{const ta=(i/f.trail.length)*a*.5;ctx.beginPath();ctx.arc(p.x,p.y,f.r*.4,0,Math.PI*2);ctx.fillStyle=`rgba(0,255,180,${ta})`;ctx.fill();});
    const g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r*3);g.addColorStop(0,`rgba(0,255,180,${a})`);g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.beginPath();ctx.arc(f.x,f.y,f.r*3,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
    ctx.beginPath();ctx.arc(f.x,f.y,f.r*.8,0,Math.PI*2);ctx.fillStyle=`rgba(220,255,240,${a})`;ctx.fill();
  });
}

// ─── BG: Grid pulse ──────────────────────────────────────────────────────────
function initGridpulse(ctx,cv,s){s.gpTime=0;}
function renderGridpulse(ctx,cv,s){
  ctx.clearRect(0,0,cv.width,cv.height);s.gpTime+=.018;
  const step=40,cx=cv.width/2,cy=cv.height/2;
  for(let x=0;x<cv.width;x+=step){const d=Math.abs(x-cx)/cv.width;const a=.04+.1*Math.max(0,Math.sin(s.gpTime-d*6));ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,cv.height);ctx.strokeStyle=`rgba(0,191,165,${a})`;ctx.lineWidth=.7;ctx.stroke();}
  for(let y=0;y<cv.height;y+=step){const d=Math.abs(y-cy)/cv.height;const a=.04+.1*Math.max(0,Math.sin(s.gpTime-d*6));ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(cv.width,y);ctx.strokeStyle=`rgba(0,191,165,${a})`;ctx.lineWidth=.7;ctx.stroke();}
  for(let x=0;x<cv.width;x+=step)for(let y=0;y<cv.height;y+=step){const d=Math.hypot(x-cx,y-cy)/(Math.hypot(cv.width,cv.height)/2);const a=.1+.4*Math.max(0,Math.sin(s.gpTime*2-d*8));if(a>.15){ctx.beginPath();ctx.arc(x,y,1.2,0,Math.PI*2);ctx.fillStyle=`rgba(0,191,165,${a})`;ctx.fill();}}
}

// ─── BG: Waves ───────────────────────────────────────────────────────────────
function initWaves(ctx,cv,s){s.wt=0;}
function renderWaves(ctx,cv,s){
  ctx.clearRect(0,0,cv.width,cv.height);s.wt+=.012;
  for(let l=0;l<8;l++){
    const yBase=cv.height*.2+l*(cv.height*.65/8),amp=18+l*6,freq=.008-l*.0005,phase=s.wt+l*.6;
    ctx.beginPath();
    for(let x=0;x<=cv.width;x+=3){const y=yBase+Math.sin(x*freq+phase)*amp+Math.sin(x*freq*2.3+phase*1.4)*amp*.4;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
    ctx.strokeStyle=`rgba(0,191,165,${.06+.1*(1-l/8)})`;ctx.lineWidth=1.2;ctx.stroke();
  }
}

// ─── BG: DNA ─────────────────────────────────────────────────────────────────
function initDna(ctx,cv,s){s.dnaT=0;}
function renderDna(ctx,cv,s){
  ctx.clearRect(0,0,cv.width,cv.height);s.dnaT+=.025;
  const cx=cv.width/2,freq=.018,amp=cv.width*.18;
  for(let y=0;y<cv.height;y+=4){
    const t=s.dnaT+y*freq;
    const x1=cx+Math.sin(t)*amp,x2=cx+Math.sin(t+Math.PI)*amp;
    ctx.beginPath();ctx.arc(x1,y,2.5,0,Math.PI*2);ctx.fillStyle=`rgba(0,191,165,${.5+Math.sin(t)*.3})`;ctx.fill();
    ctx.beginPath();ctx.arc(x2,y,2.5,0,Math.PI*2);ctx.fillStyle=`rgba(0,220,180,${.5+Math.sin(t+Math.PI)*.3})`;ctx.fill();
    if(y%20<4){ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.strokeStyle=`rgba(0,191,165,${.15+Math.abs(Math.sin(t))*.2})`;ctx.lineWidth=1;ctx.stroke();}
  }
}

// ─── BG: Shockwave ───────────────────────────────────────────────────────────
function initShockwave(ctx,cv,s){s.swaves=[];s.swTimer=0;}
function renderShockwave(ctx,cv,s){
  ctx.clearRect(0,0,cv.width,cv.height);s.swTimer=(s.swTimer||0)+1;
  if(s.swTimer>70){s.swaves.push({x:cv.width/2,y:cv.height/2,r:0,life:1});s.swTimer=0;}
  s.swaves=(s.swaves||[]).filter(w=>w.life>0);
  s.swaves.forEach(w=>{w.r+=3;w.life-=.008;const a=w.life*.6;ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,Math.PI*2);ctx.strokeStyle=`rgba(0,191,165,${a})`;ctx.lineWidth=2-w.life;ctx.stroke();ctx.beginPath();ctx.arc(w.x,w.y,w.r*1.04,0,Math.PI*2);ctx.strokeStyle=`rgba(0,255,191,${a*.3})`;ctx.lineWidth=.8;ctx.stroke();});
}

// ─── BG: Constellation ───────────────────────────────────────────────────────
function initConstellation(ctx,cv,s){
  s.cstars=Array.from({length:60},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height,r:.8+Math.random()*2.2,tw:Math.random()*Math.PI*2,sp:.008+Math.random()*.02}));
  s.cEdges=[];for(let i=0;i<s.cstars.length;i++)for(let j=i+1;j<s.cstars.length;j++){const d=Math.hypot(s.cstars[i].x-s.cstars[j].x,s.cstars[i].y-s.cstars[j].y);if(d<cv.width*.18&&Math.random()<.35)s.cEdges.push([i,j,d]);}
}
function renderConstellation(ctx,cv,s){
  ctx.clearRect(0,0,cv.width,cv.height);
  (s.cEdges||[]).forEach(([i,j,d])=>{const a=.05+.08*(1-d/(cv.width*.18));ctx.beginPath();ctx.moveTo(s.cstars[i].x,s.cstars[i].y);ctx.lineTo(s.cstars[j].x,s.cstars[j].y);ctx.strokeStyle=`rgba(0,191,165,${a})`;ctx.lineWidth=.6;ctx.stroke();});
  (s.cstars||[]).forEach(st=>{st.tw+=st.sp;const a=.5+Math.sin(st.tw)*.4;ctx.beginPath();ctx.arc(st.x,st.y,st.r,0,Math.PI*2);ctx.fillStyle=`rgba(180,240,255,${a})`;ctx.fill();const g=ctx.createRadialGradient(st.x,st.y,0,st.x,st.y,st.r*4);g.addColorStop(0,`rgba(0,191,165,${a*.4})`);g.addColorStop(1,"rgba(0,0,0,0)");ctx.beginPath();ctx.arc(st.x,st.y,st.r*4,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();});
}

const INITS={hex:initHex,particles:initParticles,stars:initStars,rain:initRain,vortex:initVortex,warp:initWarp,lightning:initLightning,lava:initLava,fireflies:initFireflies,gridpulse:initGridpulse,waves:initWaves,dna:initDna,shockwave:initShockwave,constellation:initConstellation};
const RENDERS={hex:renderHex,particles:renderParticles,stars:renderStars,rain:renderRain,vortex:renderVortex,warp:renderWarp,lightning:renderLightning,lava:renderLava,fireflies:renderFireflies,gridpulse:renderGridpulse,waves:renderWaves,dna:renderDna,shockwave:renderShockwave,constellation:renderConstellation};
const CSS_BG_SET=new Set(["aurora","scanlines","fluid","dotgrid"]);

const BG_BTNS=[
  ["hex","⬡ Hex"],["particles","◦ Cząstki"],["aurora","∿ Aurora"],["scanlines","≡ Scan"],
  ["stars","✦ Gwiazdy"],["fluid","〜 Fluid"],["dotgrid","· Dots"],["rain","| Rain"],
  ["vortex","⊛ Vortex"],["warp","≋ Warp"],["lightning","⚡ Lightning"],["lava","🌋 Lava"],
  ["fireflies","✺ Fireflies"],["gridpulse","▦ Grid Pulse"],["waves","〰 Fale"],
  ["dna","⌬ DNA"],["shockwave","◎ Shockwave"],["constellation","★ Konstelacja"],
];
const LOGO_BTNS=[
  ["glow","◉ Glow"],["ring","⟳ Ring"],["ripple","◎ Ripple"],["radar","◈ Radar"],
  ["morph","❋ Morph"],["orbit","○ Orbit"],["glitch","▓ Glitch"],["starburst","✦ Starburst"],
  ["nova","💥 Nova"],["holo","📡 Holo"],["plasma","⚡ Plasma"],["shatter","💎 Shatter"],
  ["levitate","↑ Lewitacja"],["magnetism","⊕ Magnetyzm"],["fracture","⌧ Fracture"],
  ["chronos","⧗ Chronos"],["singularity","◉ Singularity"],["corona","☀ Corona"],
];

const KF=`
@keyframes glowPulse{0%,100%{filter:drop-shadow(0 0 6px rgba(0,191,165,.5)) drop-shadow(0 0 18px rgba(0,191,165,.2))}50%{filter:drop-shadow(0 0 22px rgba(0,191,165,1)) drop-shadow(0 0 50px rgba(0,191,165,.6))}}
@keyframes spinRing{to{transform:rotate(360deg)}}
@keyframes rippleOut{0%{transform:scale(1);opacity:.7}100%{transform:scale(3.8);opacity:0}}
@keyframes radarSpin{to{transform:rotate(360deg)}}
@keyframes morphBreath{0%,100%{transform:scale(1) rotate(0deg);filter:drop-shadow(0 0 6px rgba(0,191,165,.5))}33%{transform:scale(1.1) rotate(4deg);filter:drop-shadow(0 0 20px rgba(0,191,165,.9))}66%{transform:scale(.94) rotate(-3deg);filter:drop-shadow(0 0 4px rgba(0,191,165,.3))}}
@keyframes orbitSpin{to{transform:rotate(360deg)}}
@keyframes glitchBase{0%,90%,100%{filter:drop-shadow(0 0 6px rgba(0,191,165,.5));transform:translate(0,0)}91%{filter:drop-shadow(-5px 0 0 rgba(0,191,165,1)) drop-shadow(5px 0 0 rgba(180,0,255,.7));transform:translate(-3px,1px)}92%{filter:drop-shadow(5px 0 0 rgba(0,191,165,1)) drop-shadow(-5px 0 0 rgba(255,50,0,.6));transform:translate(3px,-1px)}93%{filter:drop-shadow(0 0 6px rgba(0,191,165,.5));transform:translate(0,0)}94%{filter:drop-shadow(-3px 0 0 rgba(0,191,165,.8));transform:translate(-2px,0)}95%{filter:drop-shadow(0 0 6px rgba(0,191,165,.5));transform:translate(0,0)}}
@keyframes novaBurst{0%{transform:scale(1);filter:drop-shadow(0 0 4px rgba(0,191,165,.3))}58%{transform:scale(.82);filter:drop-shadow(0 0 2px rgba(0,191,165,.1))}74%{transform:scale(1.22);filter:drop-shadow(0 0 40px rgba(0,191,165,1)) drop-shadow(0 0 80px rgba(0,191,165,.7)) drop-shadow(0 0 130px rgba(0,255,200,.4))}84%{transform:scale(.98);filter:drop-shadow(0 0 12px rgba(0,191,165,.6))}100%{transform:scale(1);filter:drop-shadow(0 0 4px rgba(0,191,165,.3))}}
@keyframes novaRing{0%,57%{transform:scale(1);opacity:0}74%{transform:scale(1);opacity:.9}100%{transform:scale(6);opacity:0}}
@keyframes holoFlicker{0%,100%{transform:rotateY(0deg) scale(1);filter:drop-shadow(0 0 10px rgba(0,191,165,.9)) drop-shadow(5px 0 0 rgba(0,100,255,.3));opacity:1}20%{transform:rotateY(10deg) scale(1.02);opacity:.9}40%{transform:rotateY(-8deg) scale(.99);opacity:.95}50%{opacity:.2}51%{opacity:1}80%{transform:rotateY(-12deg) scale(.98);opacity:.85}85%{opacity:.15}86%{opacity:1}}
@keyframes holoScan{to{transform:translateY(100%)}}
@keyframes plasmaCore{0%,100%{filter:drop-shadow(0 0 10px rgba(0,191,165,1)) drop-shadow(0 0 30px rgba(0,191,165,.6))}50%{filter:drop-shadow(0 0 18px rgba(0,255,180,1)) drop-shadow(0 0 50px rgba(0,191,165,.9)) drop-shadow(0 0 90px rgba(120,255,200,.5))}}
@keyframes plasmaArc{to{transform:rotate(360deg)}}
@keyframes shatterPulse{0%,38%,100%{transform:scale(1);filter:drop-shadow(0 0 8px rgba(0,191,165,.5));opacity:1}46%{transform:scale(1.15);filter:drop-shadow(0 0 35px rgba(0,191,165,1));opacity:.9}50%{transform:scale(.3) rotate(25deg);filter:none;opacity:0}53%{transform:scale(.3) rotate(-18deg);opacity:0}58%{transform:scale(1.1) rotate(3deg);filter:drop-shadow(0 0 28px rgba(0,191,165,.9));opacity:1}65%{transform:scale(1)}}
@keyframes levitate{0%,100%{transform:translateY(0px) scale(1);filter:drop-shadow(0 12px 24px rgba(0,191,165,.5))}50%{transform:translateY(-20px) scale(1.06);filter:drop-shadow(0 32px 40px rgba(0,191,165,.25))}}
@keyframes magnetPulse{0%,100%{filter:drop-shadow(0 0 8px rgba(0,191,165,.6))}50%{filter:drop-shadow(0 0 22px rgba(0,191,165,1)) drop-shadow(0 0 50px rgba(0,191,165,.5))}}
@keyframes magnetOrbit{to{transform:rotate(360deg)}}
@keyframes fractureSpin{0%,76%,100%{transform:rotate(0deg) scale(1);filter:drop-shadow(0 0 8px rgba(0,191,165,.5));opacity:1}80%{transform:rotate(40deg) scale(1.12);opacity:.8}84%{transform:rotate(-12deg) scale(.4);opacity:0}87%{transform:rotate(8deg) scale(.4);opacity:0}92%{transform:rotate(-3deg) scale(1.1);filter:drop-shadow(0 0 32px rgba(0,191,165,1));opacity:1}96%{transform:rotate(0deg) scale(1)}}
@keyframes chronosRing1{to{transform:rotate(360deg)}}
@keyframes chronosRing2{to{transform:rotate(-360deg)}}
@keyframes singularityPull{0%,100%{transform:scale(1);filter:drop-shadow(0 0 8px rgba(0,191,165,.5))}50%{transform:scale(.65);filter:drop-shadow(0 0 45px rgba(0,191,165,1)) drop-shadow(0 0 90px rgba(0,255,191,.7))}}
@keyframes singRipple{0%{transform:scale(.65);opacity:.8}100%{transform:scale(5.5);opacity:0}}
@keyframes coronaRay{0%,100%{transform:scaleY(1);opacity:.55}50%{transform:scaleY(1.6);opacity:1}}
@keyframes auroraBg{0%{background-position:0% 50%,100% 0%,50% 100%}100%{background-position:100% 50%,0% 100%,50% 0%}}
@keyframes fluidAnim{0%{transform:scaleX(1) scaleY(1)}50%{transform:scaleX(1.1) scaleY(.95)}100%{transform:scaleX(.92) scaleY(1.08)}}
@keyframes dotPan{to{background-position:28px 28px}}
@keyframes scanSlide{to{background-position:0 100px}}
`;

function LogoDecorations({anim}){
  return <>
    {anim==="ripple"&&[0,.7,1.4].map((d,i)=><div key={i} style={{position:"absolute",inset:0,borderRadius:"50%",border:"1.5px solid #00bfa5",opacity:0,animation:`rippleOut 2.4s ${d}s ease-out infinite`}}/>)}
    {anim==="ring"&&<><div style={{position:"absolute",inset:-8,borderRadius:"50%",border:"1.5px solid rgba(0,191,165,.3)",animation:"spinRing 18s linear infinite"}}/><div style={{position:"absolute",inset:4,borderRadius:"50%",border:"1px dashed rgba(0,191,165,.15)",animation:"spinRing 10s linear infinite reverse"}}/></>}
    {anim==="radar"&&<div style={{position:"absolute",inset:-6,borderRadius:"50%",overflow:"hidden"}}><div style={{position:"absolute",top:"50%",left:"50%",width:"50%",height:"50%",background:"conic-gradient(from 0deg,transparent,rgba(0,191,165,.7) 30deg,transparent 30deg)",transformOrigin:"0 0",animation:"radarSpin 3s linear infinite"}}/></div>}
    {anim==="orbit"&&[0,-1.5].map((d,i)=><div key={i} style={{position:"absolute",width:6,height:6,borderRadius:"50%",background:"#00bfa5",top:"calc(50% - 3px)",left:"calc(50% - 3px)",transformOrigin:"-40px 3px",boxShadow:"0 0 8px rgba(0,191,165,.7)",opacity:i?.5:1,animation:`orbitSpin 3s ${d}s linear infinite`}}/>)}
    {anim==="nova"&&<div style={{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid rgba(0,191,165,.9)",animation:"novaRing 3s ease-out infinite"}}/>}
    {anim==="holo"&&<div style={{position:"absolute",inset:-4,overflow:"hidden",borderRadius:4}}><div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(0deg,transparent,transparent 4px,rgba(0,191,165,.08) 4px,rgba(0,191,165,.08) 5px)",animation:"holoScan 2s linear infinite"}}/></div>}
    {anim==="plasma"&&<div style={{position:"absolute",inset:-14}}><div style={{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid transparent",borderTopColor:"rgba(0,191,165,1)",borderRightColor:"rgba(0,191,165,.4)",boxShadow:"0 0 16px rgba(0,191,165,.7)",animation:"plasmaArc 1.2s linear infinite"}}/><div style={{position:"absolute",inset:5,borderRadius:"50%",border:"2px solid transparent",borderBottomColor:"rgba(0,255,191,.9)",borderLeftColor:"rgba(0,255,191,.3)",boxShadow:"0 0 10px rgba(0,255,191,.5)",animation:"plasmaArc .8s linear infinite reverse"}}/></div>}
    {anim==="magnetism"&&[0,90,180,270].map((deg,i)=><div key={i} style={{position:"absolute",width:5,height:5,borderRadius:"50%",background:"#00bfa5",top:"calc(50% - 2.5px)",left:"calc(50% - 2.5px)",boxShadow:"0 0 8px rgba(0,191,165,.9)",transformOrigin:"-42px 2.5px",animation:`magnetOrbit ${2.5+i*.35}s ${i*.18}s linear infinite`,transform:`rotate(${deg}deg)`}}/>)}
    {anim==="chronos"&&<>
      <div style={{position:"absolute",inset:-10,borderRadius:"50%",border:"1px solid rgba(0,191,165,.35)",animation:"chronosRing1 8s linear infinite"}}><div style={{position:"absolute",top:-3,left:"50%",width:6,height:6,borderRadius:"50%",background:"rgba(0,191,165,.9)",transform:"translateX(-50%)"}}/></div>
      <div style={{position:"absolute",inset:-20,borderRadius:"50%",border:"1px dashed rgba(0,191,165,.18)",animation:"chronosRing2 20s linear infinite"}}><div style={{position:"absolute",top:-3,left:"50%",width:5,height:5,borderRadius:"50%",background:"rgba(0,191,165,.45)",transform:"translateX(-50%)"}}/></div>
    </>}
    {anim==="singularity"&&[0,.8,1.6].map((d,i)=><div key={i} style={{position:"absolute",inset:0,borderRadius:"50%",border:"1px solid rgba(0,191,165,.6)",opacity:0,animation:`singRipple 2.4s ${d}s ease-out infinite`}}/>)}
    {anim==="corona"&&Array.from({length:12},(_,i)=><div key={i} style={{position:"absolute",bottom:"50%",left:"calc(50% - 1px)",width:2,height:22,background:"linear-gradient(to top,rgba(0,191,165,.85),transparent)",transformOrigin:"50% 100%",transform:`rotate(${i*30}deg)`,animation:`coronaRay 2s ${i*.14}s ease-in-out infinite`}}/>)}
  </>;
}

const ICON_STYLE={
  glow:{animation:"glowPulse 2.5s ease-in-out infinite"},
  ring:{filter:"drop-shadow(0 0 8px rgba(0,191,165,.5))"},
  ripple:{filter:"drop-shadow(0 0 8px rgba(0,191,165,.5))"},
  radar:{filter:"drop-shadow(0 0 6px rgba(0,191,165,.5))"},
  morph:{animation:"morphBreath 3s ease-in-out infinite"},
  orbit:{filter:"drop-shadow(0 0 6px rgba(0,191,165,.5))"},
  glitch:{animation:"glitchBase 4s steps(1) infinite"},
  starburst:{animation:"glowPulse 2s ease-in-out infinite",filter:"drop-shadow(0 0 14px rgba(0,191,165,.9))"},
  nova:{animation:"novaBurst 3s ease-in-out infinite"},
  holo:{animation:"holoFlicker 5s linear infinite"},
  plasma:{animation:"plasmaCore 2s ease-in-out infinite"},
  shatter:{animation:"shatterPulse 4s ease-in-out infinite"},
  levitate:{animation:"levitate 3.5s ease-in-out infinite"},
  magnetism:{animation:"magnetPulse 2s ease-in-out infinite"},
  fracture:{animation:"fractureSpin 5s ease-in-out infinite"},
  chronos:{filter:"drop-shadow(0 0 10px rgba(0,191,165,.7))"},
  singularity:{animation:"singularityPull 3s ease-in-out infinite"},
  corona:{animation:"glowPulse 2.5s ease-in-out infinite",filter:"drop-shadow(0 0 14px rgba(0,191,165,.8))"},
};

export default function WagaEXAnimations(){
  const [bg,setBg]=useState("hex");
  const [anim,setAnim]=useState("glow");
  const canvasRef=useRef(null);
  useCanvasBg(canvasRef,bg);
  const showCanvas=!CSS_BG_SET.has(bg);
  const sceneClass=CSS_BG_SET.has(bg)?`${bg}-scene`:"";

  const Btn=({id,label,active,onClick})=>(
    <button onClick={onClick} style={{padding:"3px 9px",borderRadius:5,border:`1px solid ${active?"#00bfa5":"rgba(255,255,255,.1)"}`,background:active?"rgba(0,191,165,.15)":"transparent",color:active?"#00bfa5":"#6b7280",fontSize:11,cursor:"pointer",whiteSpace:"nowrap",transition:"all .15s"}}>{label}</button>
  );

  return(
    <div style={{width:"100%",height:"100vh",background:"#0f1117",overflow:"hidden",position:"relative",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <style>{KF}{`
        .aurora-scene::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 80% 60% at 20% 40%,rgba(0,191,165,.1) 0%,transparent 60%),radial-gradient(ellipse 60% 80% at 80% 70%,rgba(0,100,180,.09) 0%,transparent 60%),radial-gradient(ellipse 50% 50% at 55% 20%,rgba(100,0,180,.07) 0%,transparent 50%);background-size:300% 300%;animation:auroraBg 12s ease-in-out infinite alternate;}
        .fluid-scene::before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 120% 40% at 50% 110%,rgba(0,191,165,.15) 0%,transparent 55%),radial-gradient(ellipse 80% 30% at 50% -10%,rgba(0,100,200,.1) 0%,transparent 50%);animation:fluidAnim 7s ease-in-out infinite alternate;}
        .dotgrid-scene::before{content:'';position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle,rgba(0,191,165,.2) 1px,transparent 1px);background-size:28px 28px;animation:dotPan 30s linear infinite;}
        .scanlines-scene::after{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,191,165,.03) 3px,rgba(0,191,165,.03) 4px);animation:scanSlide 8s linear infinite;}
      `}</style>

      <div className={sceneClass} style={{position:"absolute",inset:0,overflow:"hidden"}}>
        {showCanvas&&<canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%"}}/>}
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,userSelect:"none"}}>
            <div style={{position:"relative",width:100,height:100,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <LogoDecorations anim={anim}/>
              <div style={{fontSize:82,lineHeight:1,color:"#00bfa5",position:"relative",zIndex:2,...(ICON_STYLE[anim]||{})}}>⬡</div>
            </div>
            <div style={{fontSize:34,fontWeight:700,letterSpacing:".05em",color:"#fff"}}>WagaEX</div>
            <div style={{fontSize:13,letterSpacing:".18em",textTransform:"uppercase",color:"#6b7280"}}>Magazyn Eksportowy</div>
          </div>
        </div>
      </div>

      {/* Switcher */}
      <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:"rgba(15,17,23,.97)",backdropFilter:"blur(14px)",borderBottom:"1px solid rgba(255,255,255,.07)",padding:"6px 10px",display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:10,textTransform:"uppercase",letterSpacing:".12em",color:"#4b5563",flexShrink:0}}>TŁO:</span>
        {BG_BTNS.map(([id,label])=><Btn key={id} id={id} label={label} active={bg===id} onClick={()=>setBg(id)}/>)}
        <div style={{width:1,height:18,background:"rgba(255,255,255,.08)",margin:"0 2px",flexShrink:0}}/>
        <span style={{fontSize:10,textTransform:"uppercase",letterSpacing:".12em",color:"#4b5563",flexShrink:0}}>LOGO:</span>
        {LOGO_BTNS.map(([id,label])=><Btn key={id} id={id} label={label} active={anim===id} onClick={()=>setAnim(id)}/>)}
      </div>

      <div style={{position:"fixed",bottom:12,left:"50%",transform:"translateX(-50%)",background:"rgba(15,17,23,.9)",border:"1px solid rgba(0,191,165,.2)",borderRadius:8,padding:"6px 16px",fontSize:11,color:"#6b7280",zIndex:100,backdropFilter:"blur(8px)",whiteSpace:"nowrap"}}>
        <span style={{color:"#00bfa5"}}>18 teł</span> × <span style={{color:"#00bfa5"}}>18 animacji logo</span> — 324 kombinacje
      </div>
    </div>
  );
}
