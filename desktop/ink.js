const canvas = document.getElementById('ink'), ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
let mode = 'point', active = false, stroke = [], marks = [], paths = [];
const clamp = value => Math.max(0, Math.min(1, value));
const point = event => ({ x: clamp(event.clientX / innerWidth), y: clamp(event.clientY / innerHeight) });
function paint() {
  const scale = devicePixelRatio || 1;
  canvas.width = Math.round(innerWidth * scale); canvas.height = Math.round(innerHeight * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.strokeStyle = '#d6fc91'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const path of [...paths, stroke]) {
    if (!path.length) continue;
    ctx.beginPath(); path.forEach((p, index) => index ? ctx.lineTo(p.x * innerWidth, p.y * innerHeight) : ctx.moveTo(p.x * innerWidth, p.y * innerHeight)); ctx.stroke();
  }
  for (const mark of marks.filter(mark => mark.kind === 'point')) {
    ctx.beginPath(); ctx.arc(mark.tip.x * innerWidth, mark.tip.y * innerHeight, 12, 0, Math.PI * 2); ctx.stroke();
  }
}
function classify(points) {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const box = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  const first = points[0], tip = points.at(-1);
  const diagonal = Math.hypot(box.width * innerWidth, box.height * innerHeight);
  const close = Math.hypot((first.x - tip.x) * innerWidth, (first.y - tip.y) * innerHeight);
  return { kind: points.length > 6 && diagonal > 30 && close < Math.max(24, diagonal * .2) ? 'circle' : 'line', tip, box };
}
canvas.addEventListener('pointerdown', event => {
  canvas.setPointerCapture(event.pointerId);
  if (mode === 'point') { if (marks.length < 12) marks.push({ kind: 'point', tip: point(event) }); paint(); return; }
  active = true; stroke = [point(event)]; paint();
});
canvas.addEventListener('pointermove', event => { if (active) { stroke.push(point(event)); paint(); } });
canvas.addEventListener('pointerup', event => {
  if (!active) return;
  active = false; stroke.push(point(event));
  if (marks.length < 12) { marks.push(classify(stroke)); paths.push(stroke); }
  stroke = []; paint();
});
$('point').classList.add('active');
for (const id of ['point', 'draw']) $(id).onclick = () => { mode = id; $('point').classList.toggle('active', id === 'point'); $('draw').classList.toggle('active', id === 'draw'); };
$('undo').onclick = () => { const last = marks.pop(); if (last?.kind !== 'point') paths.pop(); paint(); };
$('cancel').onclick = () => window.omylaInk.finish(null);
$('finish').onclick = () => window.omylaInk.finish(marks);
document.addEventListener('keydown', event => { if (event.key === 'Escape') window.omylaInk.finish(null); });
addEventListener('resize', paint); paint();
