const canvas = document.getElementById('drawing'), ctx = canvas.getContext('2d');
let drawing = { paths: [], marks: [] };
function paint() {
  const scale = devicePixelRatio || 1;
  canvas.width = Math.round(innerWidth * scale); canvas.height = Math.round(innerHeight * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#ef89b9';
  for (const path of drawing.paths) {
    if (!path?.length) continue;
    ctx.beginPath();
    path.forEach((p, i) => i ? ctx.lineTo(p.x * innerWidth, p.y * innerHeight) : ctx.moveTo(p.x * innerWidth, p.y * innerHeight));
    ctx.stroke();
  }
  for (const mark of drawing.marks) if (mark.kind === 'point') {
    ctx.beginPath(); ctx.arc(mark.tip.x * innerWidth, mark.tip.y * innerHeight, 13, 0, Math.PI * 2); ctx.stroke();
  }
}
window.omylaPassive.onDrawing(value => { drawing = value; paint(); });
addEventListener('resize', paint);
