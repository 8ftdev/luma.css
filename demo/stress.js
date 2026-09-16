import { createLuma } from '../dist/luma.js';
const $ = id => document.getElementById(id);
const grid = $('grid'), arena = $('arena');
let controller, loop = 0, running = false, busy = false, cancelled = false;
let geometry, origin = 0, intensity = 12, z = 1400;
const measurements = [];
const longTasks = [];
let longTaskSupport = PerformanceObserver.supportedEntryTypes.includes('longtask');
if (longTaskSupport) new PerformanceObserver(list => longTasks.push(...list.getEntries().map(e=>e.startTime))).observe({type:'longtask'});

function measure() { const r=arena.getBoundingClientRect(); geometry={left:r.left+scrollX,top:r.top+scrollY,width:r.width,height:r.height}; controller?.refresh(); }
function point(time) {
  const x=geometry.width*(.5+.4*Math.sin(time/1400));
  const y=geometry.height*(.5+.38*Math.sin(time/970));
  controller?.setLight({x:geometry.left+x,y:geometry.top+y,z,intensity});
  $('marker').style.transform=`translate(${x-6}px,${y-6}px)`;
}
function renderer(mode) {
  grid.classList.toggle('paint-reference',mode==='paint');
  controller?.destroy();
  controller=mode==='off'?null:createLuma({root:grid,light:{x:0,y:0,z,intensity}});
  measure();point(0);
}
function populate() {
  controller?.destroy();
  grid.replaceChildren();
  for(let i=0;i<+$('count').value;i++) {
    const el=document.createElement('div');el.className='cell';el.dataset.luma=i%4;
    const id=document.createElement('span');id.textContent=String(i+1).padStart(3,'0');
    const level=document.createElement('small');level.textContent='L'+i%4;el.append(id,level);grid.append(el);
  }
  arena.setAttribute('aria-label',`${$('count').value} surfaces connected to Luma`);
  grid.style.gridTemplateRows=`repeat(${Math.ceil(+$('count').value/10)}, minmax(20px, 1fr))`;
  renderer($('renderer').value);
}
function tick(time) {point(time-origin);loop=requestAnimationFrame(tick)}
function animate(enable) {
  running=enable;cancelAnimationFrame(loop);
  if(enable){measure();origin=performance.now();loop=requestAnimationFrame(tick)}
  $('animate').textContent=enable?'Pause light':'Animate light';$('animate').setAttribute('aria-pressed',enable);
  $('live-status').textContent=enable?'Light moving · frame-coalesced updates':'Static light · no animation loop';
}
const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
const percentile=(values,p)=>values[Math.min(values.length-1,Math.floor(values.length*p))];
async function sample(mode) {
  $('live-status').textContent = 'Measuring · animated light';
  renderer(mode);measure();
  const warmup=performance.now();
  for(let i=0;i<30;i++){const t=await frame();point(t-warmup);if(cancelled)throw Error('Cancelled: keep this page visible.');}
  const visibleElements=[...grid.children].filter(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth}).length;
  const samples=[];let start=await frame(),last=start;
  while(last-start<5000) {
    const t=await frame();if(cancelled)throw Error('Cancelled: keep this page visible.');
    point(t-start);samples.push(t-last);last=t;
  }
  const ordered=[...samples].sort((a,b)=>a-b);
  return {renderer:mode,elements:+$('count').value,visibleElements,intensity,z,durationMs:last-start,frames:samples.length,fps:samples.length*1000/(last-start),medianMs:percentile(ordered,.5),p95Ms:percentile(ordered,.95),worstMs:ordered.at(-1),over20Ms:samples.filter(x=>x>20).length,longTasks:longTaskSupport?longTasks.filter(x=>x>=start&&x<=last).length:null,intervalsMs:samples};
}
function results() {
  $('results').replaceChildren();
  for(const r of measurements) {
    const row=document.createElement('tr');
    const cells=[{off:'No lighting',hybrid:'Hybrid',paint:'Painted gradients'}[r.renderer],r.elements,r.fps.toFixed(1),r.medianMs.toFixed(1)+' ms',r.p95Ms.toFixed(1)+' ms',r.worstMs.toFixed(1)+' ms',`${r.over20Ms} / ${r.frames}`,r.longTasks??'Unavailable'];
    cells.forEach(v=>{const td=document.createElement('td');td.textContent=v;row.append(td)});$('results').append(row);
  }
  $('raw').textContent=JSON.stringify({userAgent:navigator.userAgent,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},timestamp:new Date().toISOString(),measurements},null,2);
}
$('benchmark').addEventListener('click',async()=>{
  if(busy)return;busy=true;cancelled=false;animate(false);measurements.length=0;
  const mode=$('renderer').value;
  document.querySelectorAll('.toolbar input,.toolbar select,.toolbar button').forEach(e=>e.disabled=true);
  try {
    for(const m of ['off','hybrid','paint']) {
      $('progress').textContent=`Measuring ${{off:'baseline',hybrid:'hybrid',paint:'painted gradients'}[m]}… 5 seconds + warm-up`;
      measurements.push(await sample(m));results();
    }
    $('progress').textContent='Comparison complete. Repeat to check consistency.';
  } catch(e) { $('progress').textContent=e.message; }
  finally {renderer(mode);animate(false);busy=false;document.querySelectorAll('.toolbar input,.toolbar select,.toolbar button').forEach(e=>e.disabled=false);}
});
$('animate').addEventListener('click',()=>animate(!running));
$('count').addEventListener('change',populate);
$('renderer').addEventListener('change',e=>renderer(e.target.value));
$('height').addEventListener('input',e=>{z=+e.target.value;$('height-value').value=z+' px';if(!running)point(0)});
$('intensity').addEventListener('input',e=>{intensity=+e.target.value;$('intensity-value').value=intensity+'×';if(!running)point(0)});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelled=true;animate(false)}});
window.addEventListener('resize',()=>{if(busy)cancelled=true;measure();if(!running)point(0)});
window.addEventListener('scroll',()=>{if(busy)cancelled=true},true);
$('marker').style.left='0';$('marker').style.top='0';
fetch('dist/size.json').then(r=>r.json()).then(s=>$('bytes').textContent=`${(s.total.gzip/1000).toFixed(2)} kB gzip · production bundle`).catch(()=>{});
populate();
