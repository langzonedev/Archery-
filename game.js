const canvas = document.querySelector('#field');
const ctx = canvas.getContext('2d');
const ui = Object.fromEntries(['sound','reset','score','arrows','best','result','draw','round'].map(id => [id, document.getElementById(id)]));
const clamp = (x, min, max) => Math.min(max, Math.max(min, x));
const gravity = 9.8;
const launchHeight = 1.6;
const targets = [
  { x:-3.7, z:12, y:1.65, radius:.8, kind:'rings', label:'12 m', marks:[] },
  { x:2.9, z:19, y:1.6, radius:1, kind:'rings', label:'19 m', marks:[] },
  { x:-.5, z:28, y:1.8, radius:1.15, kind:'wood', label:'28 m', marks:[] },
  { x:10, z:36, y:2.1, radius:1.5, kind:'rings', label:'36 m', marks:[] }
];
let width, height, focal, horizon, scenery;
let aim = 0, draw = 0, remaining = 8, score = 0, best = 0, shot, drag, impact, audio;
try { best = Number(localStorage.getItem('archery-best')) || 0; } catch {}
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const arrowScores = Array.from({length:8}, (_, index) => {
  const item=document.createElement('li');
  item.setAttribute('aria-label','Arrow '+(index+1)+' pending');
  item.textContent='·';
  ui.round.append(item);
  return item;
});
let seed = 41;
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
function project(x,y,z) {
  return [width/2 + x*focal/z, horizon + (launchHeight-y)*focal/z];
}
function ellipse(x,y,rx,ry,colour) {
  ctx.fillStyle=colour;
  ctx.beginPath();
  ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
  ctx.fill();
}
function line(points, colour, weight) {
  ctx.strokeStyle=colour;
  ctx.lineWidth=weight;
  ctx.beginPath();
  points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
  ctx.stroke();
}
function landscape() {
  const sky=ctx.createLinearGradient(0,0,0,horizon+60);
  sky.addColorStop(0,'#559fbb'); sky.addColorStop(1,'#d4ebd3');
  ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  ellipse(width*.79,height*.18,26,26,'#fff2bf');
  for (const [x,y,s] of [[.14,.22,1],[.49,.15,.7],[.88,.31,.64]]) {
    for(let i=0;i<5;i++) ellipse(width*x+i*21*s,height*y-Math.sin(i)*8*s,24*s,8*s,'#f9f6e3b8');
  }
  for (const [i,colour] of ['#8caea4','#648d78','#416955'].entries()) {
    ctx.fillStyle=colour;
    ctx.beginPath();ctx.moveTo(0,height);
    for(let x=0;x<=width+8;x+=8) {
      ctx.lineTo(x,horizon-24+i*8+Math.sin(x*.014+i)*13+Math.cos(x*.032+i)*6);
    }
    ctx.lineTo(width,height);ctx.fill();
  }
  seed=77;
  for(let i=0;i<75;i++) {
    const x=random()*width, size=3+random()*12;
    const base=horizon+8;
    const tint=i%3 ? '#365c49' : '#47745b';
    line([[x,base],[x+size*.16,base-size*1.8]],'#4c5440',size*.12);
    ellipse(x,base-size*1.5,size*.45,size*.53,tint);
    ellipse(x+size*.33,base-size*1.15,size*.4,size*.41,tint);
  }
  const grass=ctx.createLinearGradient(0,horizon+7,0,height);
  grass.addColorStop(0,'#8d9d62');grass.addColorStop(1,'#436343');
  ctx.fillStyle=grass;ctx.fillRect(0,horizon+8,width,height);
  ctx.fillStyle='#bca776';ctx.beginPath();
  ctx.moveTo(width*.47,horizon+8);ctx.lineTo(width*.55,horizon+8);
  ctx.lineTo(width*.75,height);ctx.lineTo(width*.26,height);ctx.fill();
  seed=41;
  for(let i=0;i<1500;i++) {
    const x=random()*width;
    const depth=random()**2;
    const y=horizon+9+depth*(height-horizon-9);
    const onPath=Math.abs(x-width*.51)<width*(.04+depth*.21);
    const size=.5+depth*4;
    ctx.fillStyle=onPath ? '#5b492225' : random()>.5 ? '#dae09064' : '#203e3267';
    ctx.fillRect(x,y,size*(onPath?1.7:.44),size);
  }
  for(let i=0;i<90;i++) {
    const x=random()*width, y=horizon+12+random()*(height-horizon-12);
    const depth=(y-horizon)/(height-horizon);
    if(Math.abs(x-width*.51)<width*(.07+depth*.2)) continue;
    const stem=2+depth*9;
    line([[x,y],[x+stem*.16,y-stem]],'#395441',1);
    ellipse(x+stem*.16,y-stem,1+depth,1+depth,i%3 ? '#e0bf73' : '#e6dbc2');
  }
  for(const side of [-1,1]) {
    const posts=[];
    for(let z=9;z<=39;z+=4) {
      const x=side*(6+z*.21);
      const top=project(x,.9,z);
      posts.push(top);
      line([project(x,0,z),top],'#68533d',Math.max(1,focal/z*.12));
    }
    line(posts,'#847151',2);
  }
}
function resize() {
  const rect=canvas.getBoundingClientRect();
  if(drag && (width!==rect.width || height!==rect.height)) cancel();
  width=rect.width;height=rect.height;
  const scale=Math.min(devicePixelRatio,2);
  canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  ctx.setTransform(scale,0,0,scale,0,0);
  focal=width*.99; horizon=height*.52;
  landscape();
  scenery=document.createElement('canvas');
  scenery.width=canvas.width;scenery.height=canvas.height;
  scenery.getContext('2d').drawImage(canvas,0,0);
}
function target(t) {
  const [x,y]=project(t.x,t.y,t.z);
  const r=t.radius*focal/t.z;
  const base=project(t.x,0,t.z)[1];
  ellipse(x,base+2,r*1.3,r*.18,'#22382148');
  line([[x-r*.7,base],[x,y],[x+r*.7,base]],'#57412c',Math.max(2,r*.12));
  const palette=t.kind==='wood' ? ['#69472f','#af8152','#d2a36a','#6b4930','#f2d88c'] : ['#ede5cb','#303d43','#5085a0','#a74736','#efc257'];
  palette.forEach((colour,i)=>ellipse(x,y,r*(1-i*.18),r*(1-i*.18),colour));
  for(const mark of t.marks) {
    const [mx,my]=project(mark.x,mark.y,t.z);
    line([[mx,my],[mx-6,my+4]],'#241d16',2);
    ellipse(mx-6,my+4,2,1,'#fff0c0');
  }
  ctx.fillStyle='#fef5dc';ctx.font='600 11px system-ui';ctx.textAlign='center';
  ctx.fillText(t.label,x,base+14);
}
function bow() {
  const s=Math.min(clamp(width*.24,78,155),height*.27);
  const x=width*.53+aim*width*.61;
  const y=height*.74;
  const bend=draw*s*.15;
  const grip=[x+s*.15,y];
  const top=[x+s*.08-bend,y-s*.94];
  const bottom=[x+s*.02-bend,y+s*.82];
  const nock=[x-s*(.14+draw*.26),y+s*(.49+draw*.16)];
  const front=[x+s*.11,y-s*.12];
  ctx.lineCap='round';ctx.lineJoin='round';
  line([[width*.65,height+s*.14],grip],'#263b35',s*.28);
  line([[width*.65,height+s*.14],grip],'#466153',s*.19);
  line([top,nock,bottom],'#eee3ba',1.4);
  ctx.beginPath();ctx.moveTo(...top);
  ctx.bezierCurveTo(x+s*.48,y-s*.67,x+s*.03,y-s*.25,...grip);
  ctx.bezierCurveTo(x+s*.04,y+s*.28,x+s*.37,y+s*.56,...bottom);
  ctx.strokeStyle='#392a1e';ctx.lineWidth=s*.08;ctx.stroke();
  ctx.strokeStyle='#be8655';ctx.lineWidth=s*.047;ctx.stroke();
  ellipse(grip[0],grip[1],s*.095,s*.13,'#b88966');
  line([[grip[0]-s*.065,y-s*.035],[grip[0]+s*.06,y-s*.035]],'#d2a482',s*.035);
  if(remaining && !shot) {
    line([nock,front],'#31271f',2.5);
    line([nock,[nock[0]+(front[0]-nock[0])*.17,nock[1]+(front[1]-nock[1])*.17]],'#f2d79b',4);
    if(draw>0) {
      line([[width*.32,height+s*.13],nock],'#334b41',s*.2);
      ellipse(nock[0],nock[1],s*.075,s*.064,'#bd906e');
    }
  }
  ctx.lineCap='butt';
  const guide=targets.reduce((nearest,target) =>
    Math.abs(target.x/target.z-aim)<Math.abs(nearest.x/nearest.z-aim) ? target : nearest);
  const guideHeight=draw>=.12 ? arrowHeight(draw,guide.z) : guide.y;
  const [guideX,guideY]=project(aim*guide.z,guideHeight,guide.z);
  if(guideY>horizon+height*.36 || guideY<height*.18) return;
  ctx.beginPath();ctx.arc(guideX,guideY,5,0,Math.PI*2);
  ctx.strokeStyle='#233126';ctx.lineWidth=3;ctx.stroke();
  ctx.strokeStyle='#fff4ce';ctx.lineWidth=1.5;ctx.stroke();
}
function sound(kind) {
  if(ui.sound.getAttribute('aria-pressed')!=='true') return;
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(()=>{});
    const oscillator=audio.createOscillator(), gain=audio.createGain(), now=audio.currentTime;
    oscillator.type=kind==='release' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(kind==='gold'?690:kind==='hit'?380:130,now);
    oscillator.frequency.exponentialRampToValueAtTime(kind==='gold'?920:90,now+.17);
    gain.gain.setValueAtTime(.075,now);gain.gain.exponentialRampToValueAtTime(.001,now+.21);
    oscillator.connect(gain).connect(audio.destination);oscillator.start();oscillator.stop(now+.22);
  } catch {}
}
function sync() {
  ui.score.textContent=score;ui.arrows.textContent=remaining;ui.best.textContent=best;ui.draw.value=draw;
}
function arrowSpeed(power) { return 10+power*34; }
function arrowSlope(power) { return .045+power*.055; }
function arrowHeight(power,z) {
  return launchHeight+arrowSlope(power)*z-gravity*(z/arrowSpeed(power))**2/2;
}
function release() {
  if(shot || !remaining || draw<.12) return;
  shot={t:0, aim, power:draw, speed:arrowSpeed(draw)};
  remaining--; draw=0;
  ui.result.textContent='Arrow away';
  sound('release');sync();
}
function finish(t,x,y,radius) {
  const points=!t ? 0 : radius<.28 ? 50 : radius<.58 ? 30 : 15;
  const index=arrowScores.length-remaining-1;
  const entry=arrowScores[index];
  entry.textContent=points || '×';
  entry.dataset.score=points;
  entry.setAttribute('aria-label','Arrow '+(index+1)+': '+(points ? points+' points' : 'miss'));
  if(t) {
    score+=points;
    t.marks.push({x,y});impact={x,y,z:t.z,life:.55,points};
    ui.result.textContent=points===50 ? 'Bullseye · +50' : 'On target · +'+points;
    sound(points===50?'gold':'hit');
    if(score>best) {
      best=score;
      try { localStorage.setItem('archery-best',String(best)); } catch {}
    }
  } else {
    ui.result.textContent='Miss · Adjust aim or draw';
  }
  if(!remaining) ui.result.textContent+=' · Round complete';
  shot=null;sync();
}
function advance(dt) {
  if(!shot) return;
  const prev=shot.t*shot.speed;
  shot.t+=dt;
  const z=shot.t*shot.speed;
  for(const t of targets) {
    if(prev>=t.z || z<t.z) continue;
    const x=shot.aim*t.z, y=arrowHeight(shot.power,t.z);
    const radius=Math.hypot(x-t.x,y-t.y)/t.radius;
    if(radius<=1) { finish(t,x,y,radius);return; }
  }
  if(arrowHeight(shot.power,z)<0 || z>80) finish();
}
function restart() {
  drag=shot=impact=null;aim=draw=score=0;remaining=8;
  targets.forEach(t=>t.marks.length=0);
  arrowScores.forEach((item,index)=>{
    item.textContent='·';
    delete item.dataset.score;
    item.setAttribute('aria-label','Arrow '+(index+1)+' pending');
  });
  ui.result.textContent='Pick a target';sync();
}
canvas.addEventListener('pointerdown',e=>{
  if(drag || shot || !remaining || e.button!==0) return;
  canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,aim};
  draw=0;sync();
});
canvas.addEventListener('pointermove',e=>{
  if(drag?.id!==e.pointerId) return;
  aim=clamp(drag.aim+(e.clientX-drag.x)/width*.98,-.52,.52);
  draw=clamp((e.clientY-drag.y)/Math.min(height*.3,145),0,1);sync();
});
canvas.addEventListener('pointerup',e=>{
  if(drag?.id!==e.pointerId) return;
  drag=null;release();draw=0;sync();
});
function cancel() {
  const pointerId=drag?.id;
  drag=null;
  if(pointerId!==undefined && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
  draw=0;sync();
}
function cancelPointer(e) { if(drag?.id===e.pointerId) cancel(); }
canvas.addEventListener('pointercancel',cancelPointer);
canvas.addEventListener('lostpointercapture',cancelPointer);
canvas.addEventListener('blur',cancel);
window.addEventListener('blur',cancel);
canvas.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Escape'].includes(e.code)) return;
  e.preventDefault();
  if(e.code==='Escape') { cancel();return; }
  if(shot || !remaining || drag) return;
  if(e.code==='ArrowLeft') aim=clamp(aim-.018,-.52,.52);
  if(e.code==='ArrowRight') aim=clamp(aim+.018,-.52,.52);
  if(e.code==='ArrowUp') draw=clamp(draw+.08,0,1);
  if(e.code==='ArrowDown') draw=clamp(draw-.08,0,1);
  if(e.code==='Space'&&!e.repeat) release();
  sync();
});
ui.reset.addEventListener('click',()=>{restart();canvas.focus();});
ui.sound.addEventListener('click',()=>{
  const enabled=ui.sound.getAttribute('aria-pressed')!=='true';
  ui.sound.setAttribute('aria-pressed',String(enabled));ui.sound.textContent=enabled?'Sound on':'Sound off';
  if(enabled) sound('hit');
});
new ResizeObserver(resize).observe(canvas);
sync();
let previous=performance.now();
function frame(now) {
  const dt=Math.min(.035,(now-previous)/1000);previous=now;
  if(scenery) {
    advance(dt);
    ctx.drawImage(scenery,0,0,width,height);
    [...targets].reverse().forEach(target);
    if(shot && shot.t>.035) {
      const z=shot.t*shot.speed;
      const [x,y]=project(shot.aim*z,arrowHeight(shot.power,z),z);
      line([[x,y],[x-8,y+5]],'#fff2be',2);
    }
    if(impact) {
      if(!motion.matches) {
        const [x,y]=project(impact.x,impact.y,impact.z);
        ctx.fillStyle='#fff7d6';ctx.font='bold 17px system-ui';ctx.textAlign='center';
        ctx.fillText('+'+impact.points,x,y-18-(.55-impact.life)*30);
      }
      impact.life-=dt;
      if(impact.life<=0) impact=null;
    }
    bow();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
