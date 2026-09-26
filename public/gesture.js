// Coordinates are stored relative to the stage so they survive resizing.
export function classifyStroke(points, size, override = 'auto') {
  if (!points.length) return null;
  const px = points.map(p => ({ x: p.x * size.width, y: p.y * size.height }));
  const xs = px.map(p => p.x), ys = px.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const diagonal = Math.hypot(maxX - minX, maxY - minY);
  const length = px.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - px[i].x, p.y - px[i].y), 0);
  const start = px[0], end = px.at(-1);
  const gap = Math.hypot(start.x - end.x, start.y - end.y);
  let kind = 'line', tip = end;
  if (diagonal > 30 && length > diagonal * 1.8 && gap < Math.max(25, diagonal * .2)) kind = 'circle';
  else if (points.length > 5 && diagonal > 35) {
    let farthest = 0;
    for (let i = 1; i < px.length; i++) if (Math.hypot(px[i].x - start.x, px[i].y - start.y) > Math.hypot(px[farthest].x - start.x, px[farthest].y - start.y)) farthest = i;
    const apex = px[farthest], shaft = { x: apex.x - start.x, y: apex.y - start.y }, tail = { x: end.x - apex.x, y: end.y - apex.y };
    const retreat = Math.hypot(tail.x, tail.y);
    if (farthest > px.length * .55 && farthest < px.length - 2 && retreat > 12 && retreat < diagonal * .45 && shaft.x * tail.x + shaft.y * tail.y < -diagonal * retreat * .2) { kind = 'arrow'; tip = apex; }
  }
  if (override !== 'auto') kind = override;
  return { kind, box: { x: minX / size.width, y: minY / size.height, width: (maxX - minX) / size.width, height: (maxY - minY) / size.height }, tip: { x: tip.x / size.width, y: tip.y / size.height } };
}
