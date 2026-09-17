import { createLuma } from '../src/luma.js';
const $ = id => document.getElementById(id);
const stage = $('stage');
const light = createLuma({ root: stage });
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const state = { x: 220, y: 50, z: 360, intensity: 1.4 };
let following = false;

function place() {
  const rect = stage.getBoundingClientRect();
  light.setLight({ ...state, x: state.x + rect.left + scrollX, y: state.y + rect.top + scrollY });
  $('light-marker').style.left = state.x + 'px';
  $('light-marker').style.top = state.y + 'px';
  for (const key of ['x', 'y', 'z', 'intensity']) {
    $(key).value = state[key];
    $(key + '-value').value = key === 'intensity' ? state[key].toFixed(2).replace(/0$/, '') + '×' : Math.round(state[key]) + ' px';
  }
}
function setFollowing(value) {
  following = value && !motion.matches;
  $('pointer').checked = following;
  $('mode-label').textContent = following ? 'Following pointer' : 'Fixed light';
  $('hint').textContent = following ? 'Move across the cards to explore' : 'Click anywhere to place the light';
}
function reset() {
  Object.assign(state, { x: Math.round(stage.clientWidth * .35), y: 70, z: 360, intensity: 1.4 });
  setFollowing(false); place();
}
stage.addEventListener('pointermove', e => {
  if (!following || e.pointerType === 'touch') return;
  const r = stage.getBoundingClientRect();
  state.x = e.clientX - r.left; state.y = e.clientY - r.top; place();
});
stage.addEventListener('click', e => {
  const r = stage.getBoundingClientRect();
  state.x = e.clientX - r.left; state.y = e.clientY - r.top; place();
});
for (const key of ['x', 'y', 'z', 'intensity']) $(key).addEventListener('input', e => {
  if (key === 'x' || key === 'y') setFollowing(false);
  state[key] = +e.target.value; place();
});
$('pointer').addEventListener('change', e => setFollowing(e.target.checked));
motion.addEventListener('change', () => { if (motion.matches) setFollowing(false); });
$('reset').addEventListener('click', reset);
$('material').addEventListener('change', e => {
  const [surface, edge] = { satin: [.12, .65], matte: [.065, .22], polished: [.08, 1] }[e.target.value];
  for (const card of stage.querySelectorAll('[data-luma]')) {
    card.style.setProperty('--luma-surface', surface); card.style.setProperty('--luma-edge', edge);
  }
});
document.querySelectorAll('.color-chip').forEach(chip => chip.addEventListener('click', () => {
  stage.style.setProperty('--luma-color', chip.dataset.color);
  document.querySelectorAll('.color-chip').forEach(c => {c.classList.toggle('selected', c === chip); c.setAttribute('aria-pressed', c === chip)});
}));
$('renderer').addEventListener('change', e => {
  const painted = e.target.value === 'paint'; stage.classList.toggle('paint-reference', painted);
  $('renderer-note').textContent = painted ? 'Both gradient centers repaint. Use browser paint flashing to compare.' : 'The soft glow moves with a transform. The border uses a masked gradient.';
});
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('usage-code').textContent); $('copy').textContent = 'Copied'; }
  catch { $('copy').textContent = 'Select code to copy'; }
});

// Three independent, identical local points isolate elevation for comparison.
const specimens = [...document.querySelectorAll('.specimen')].map(root => ({ root, controller: createLuma({ root }) }));
function layout() {
  $('x').max = stage.clientWidth + 160;
  $('y').max = stage.clientHeight + 160;
  place();
  for (const {root, controller} of specimens) {
    const r = root.getBoundingClientRect();
    controller.setLight({ x: r.left + scrollX + r.width * .15, y: r.top + scrollY, z: 300, intensity: 1.4 });
    controller.refresh();
  }
}
new ResizeObserver(layout).observe(stage);
window.addEventListener('resize', layout);
fetch('dist/size.json').then(r=>r.json()).then(s=>{$('bundle').textContent = `${(s.total.gzip / 1000).toFixed(2)} kB gzip · zero dependencies`}).catch(()=>{});
reset(); layout();

