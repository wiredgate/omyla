import { classifyStroke } from './gesture.js';

const $ = id => document.getElementById(id);
const modal = $('camera-mode'), frame = $('camera-frame'), video = $('camera-video'), photo = $('camera-photo');
const ink = $('camera-ink'), context = ink.getContext('2d');
let stream = null, image = '', strokes = [], stroke = null, steps = [], index = 0, generation = 0;
const status = message => { $('camera-status').textContent = message; };
const clamp = n => Math.max(0, Math.min(1, n));

function stopStream() {
  stream?.getTracks().forEach(track => track.stop());
  stream = null; video.pause(); video.srcObject = null;
}
function clearGuide() {
  steps = []; index = 0; $('camera-guidance').hidden = true; $('camera-ring').hidden = true;
  $('camera-next').textContent = '次へ →';
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
function closeCamera() {
  ++generation; stopStream(); clearGuide(); image = ''; photo.removeAttribute('src');
  ink.hidden = true; photo.hidden = true; video.hidden = false;
  strokes = []; stroke = null; modal.hidden = true;
}
async function openCamera() {
  const token = ++generation;
  stopStream(); clearGuide(); image = ''; strokes = []; stroke = null;
  photo.hidden = true; photo.removeAttribute('src'); ink.hidden = true; video.hidden = false;
  $('camera-capture').hidden = true; $('camera-retake').hidden = true;
  $('camera-clear').hidden = true; $('camera-ask').hidden = true;
  modal.hidden = false; status('カメラの許可を確認しているよ…');
  if (!navigator.mediaDevices?.getUserMedia) { status('このブラウザはカメラに対応していないよ。'); return; }
  try {
    const opened = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    if (token !== generation || modal.hidden) { opened.getTracks().forEach(track => track.stop()); return; }
    stream = opened; video.srcObject = opened;
    await video.play();
    if (token !== generation || modal.hidden) return;
    frame.style.setProperty('--camera-ratio', String(video.videoWidth / video.videoHeight || 1.333));
    $('camera-capture').hidden = false;
    status('映像を見て撮影してね。AIに送るのは、撮影後に確認した画像だけ。');
  } catch { if (token === generation) status('カメラを使えなかった。ブラウザの権限設定を確認してね。'); }
}
function resizeInk() {
  const rect = ink.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  ink.width = Math.round(rect.width * dpr); ink.height = Math.round(rect.height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0); drawInk();
}
function drawInk() {
  const rect = ink.getBoundingClientRect();
  context.clearRect(0, 0, rect.width, rect.height);
  context.strokeStyle = '#d5f6a5'; context.lineWidth = 4; context.lineCap = 'round'; context.lineJoin = 'round';
  for (const line of [...strokes, ...(stroke ? [stroke] : [])]) {
    if (line.length === 1) {
      context.beginPath(); context.arc(line[0].x * rect.width, line[0].y * rect.height, 14, 0, Math.PI * 2); context.stroke();
    } else {
      context.beginPath();
      line.forEach((p, i) => i ? context.lineTo(p.x * rect.width, p.y * rect.height) : context.moveTo(p.x * rect.width, p.y * rect.height));
      context.stroke();
    }
  }
}
function position(event) {
  const rect = ink.getBoundingClientRect();
  return { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) };
}
function marks() {
  const rect = ink.getBoundingClientRect();
  return strokes.slice(-8).map(line => {
    if (line.length < 3 || Math.hypot((line.at(-1).x - line[0].x) * rect.width, (line.at(-1).y - line[0].y) * rect.height) < 5 && line.length < 6)
      return { kind: 'point', tip: line.at(-1), target: '' };
    const shape = classifyStroke(line, { width: rect.width, height: rect.height }, 'auto');
    return shape ? { kind: shape.kind, tip: shape.tip, box: shape.box, target: '' } : { kind: 'point', tip: line.at(-1), target: '' };
  });
}
function showStep() {
  const step = steps[index]; if (!step) return clearGuide();
  $('camera-guidance').hidden = false;
  $('camera-step-count').textContent = 'AIの画面案内 · ' + (index + 1) + '/' + steps.length;
  $('camera-step-text').textContent = step.text;
  $('camera-next').textContent = index === steps.length - 1 ? '完了' : '次へ →';
  $('camera-ring').style.left = (clamp(step.x) * 100) + '%';
  $('camera-ring').style.top = (clamp(step.y) * 100) + '%';
  $('camera-ring').hidden = false;
}
$('camera-open').onclick = openCamera;
$('camera-close').onclick = closeCamera;
$('camera-retake').onclick = openCamera;
$('camera-clear').onclick = () => { strokes = []; stroke = null; clearGuide(); drawInk(); };
$('camera-capture').onclick = () => {
  if (!stream || !video.videoWidth) return;
  const width = Math.min(1024, video.videoWidth), height = Math.round(width * video.videoHeight / video.videoWidth);
  const snapshot = document.createElement('canvas'); snapshot.width = width; snapshot.height = height;
  snapshot.getContext('2d').drawImage(video, 0, 0, width, height);
  image = snapshot.toDataURL('image/jpeg', .68);
  stopStream(); video.hidden = true; photo.src = image; photo.hidden = false;
  $('camera-capture').hidden = true; $('camera-retake').hidden = false;
  $('camera-clear').hidden = false; $('camera-ask').hidden = false;
  ink.hidden = false; requestAnimationFrame(resizeInk);
  status('画像を確認してね。タップで指すか、指で丸や線を描いて質問できる。');
};
ink.addEventListener('pointerdown', event => {
  if (!image) return;
  clearGuide(); event.preventDefault(); ink.setPointerCapture(event.pointerId);
  stroke = [position(event)]; drawInk();
});
ink.addEventListener('pointermove', event => {
  if (!stroke) return;
  event.preventDefault(); const p = position(event);
  const previous = stroke.at(-1);
  if (Math.hypot((p.x - previous.x) * ink.clientWidth, (p.y - previous.y) * ink.clientHeight) >= 3) stroke.push(p);
  drawInk();
});
ink.addEventListener('pointerup', event => {
  if (!stroke) return;
  event.preventDefault();
  strokes.push(stroke); strokes = strokes.slice(-8); stroke = null; drawInk();
});
ink.addEventListener('pointercancel', () => { stroke = null; drawInk(); });
$('camera-ask').onclick = async () => {
  const goal = $('camera-goal').value.trim();
  if (!goal) { $('camera-goal').focus(); return; }
  if (!image) return;
  if (image.length > 980000) { status('画像が大きすぎるよ。撮り直してね。'); return; }
  const button = $('camera-ask'), token = generation;
  button.disabled = true; clearGuide(); status('画像を見て案内を考えているよ…');
  try {
    const response = await fetch('/api/guide', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, image, marks: marks(), surface: 'camera' }), signal: AbortSignal.timeout(60000) });
    const result = await response.json();
    if (token !== generation || modal.hidden) return;
    if (!response.ok) { status(result.message || '画面を読み取れなかった。'); return; }
    steps = Array.isArray(result.steps) ? result.steps : [];
    if (!steps.length) { status('この画像から案内する場所を特定できなかった。'); return; }
    index = 0; showStep(); status('画像への案内を表示したよ。必要なら撮り直せる。');
  } catch { if (token === generation && !modal.hidden) status('接続できなかった。少し待って再試行してね。'); }
  finally { button.disabled = false; }
};
$('camera-next').onclick = () => { if (++index >= steps.length) clearGuide(); else showStep(); };
document.addEventListener('visibilitychange', () => { if (document.hidden && !modal.hidden) closeCamera(); });
addEventListener('resize', () => { if (!ink.hidden) resizeInk(); });
