const handle = document.getElementById('handle');
let start;
handle.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  start = { id: event.pointerId, x: event.screenX, y: event.screenY };
  handle.setPointerCapture(event.pointerId);
});
handle.addEventListener('pointermove', event => {
  if (start?.id !== event.pointerId) return;
  window.omylaHandle.move(event.screenX - start.x, event.screenY - start.y);
});
handle.addEventListener('pointerup', () => { start = undefined; window.omylaHandle.end(); });
handle.addEventListener('pointercancel', () => { start = undefined; window.omylaHandle.end(); });
handle.addEventListener('contextmenu', event => { event.preventDefault(); window.omylaHandle.remove(); });
