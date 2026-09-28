import { classifyStroke } from './gesture.js';

const $ = id => document.getElementById(id);
const modal = $('camera-mode'), frame = $('camera-frame'), video = $('camera-video'), photo = $('camera-photo');
const ink = $('camera-ink'), context = ink.getContext('2d');
const backdropVideo = $('camera-backdrop-video'), backdropPhoto = $('camera-backdrop-photo');
let stream = null, image = '', sourceKind = 'camera', strokes = [], stroke = null, steps = [], answer = '', index = -1, generation = 0, micState = null, watch = null;
const status = message => { $('camera-status').textContent = message; };
const clamp = n => Math.max(0, Math.min(1, n));

function stopWatch(message = '') {
  if (!watch) return;
  clearInterval(watch.timer);
  watch = null;
  $('camera-watch').textContent = '◉ 見続ける';
  $('camera-watch').setAttribute('aria-pressed', 'false');
  if (message && !modal.hidden) status(message);
}
function frameSignature() {
  const canvas = document.createElement('canvas');
  canvas.width = 24; canvas.height = 18;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, 24, 18);
  const pixels = ctx.getImageData(0, 0, 24, 18).data;
  const signature = new Uint8Array(24 * 18);
  for (let i = 0; i < signature.length; i++)
    signature[i] = Math.round((pixels[4*i] * .3 + pixels[4*i+1] * .59 + pixels[4*i+2] * .11) / 16);
  return signature;
}
function changed(a, b) {
  if (!a) return true;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference += Math.abs(a[i] - b[i]);
  return difference / a.length >= 2.3;
}
async function watchFrame(session) {
  if (watch !== session || session.busy || !stream || video.hidden || !video.videoWidth || document.hidden) return;
  const signature = frameSignature();
  if (!changed(session.last, signature) || Date.now() - session.lastSent < 12000) return;
  const frameImage = encodeSnapshot(video, video.videoWidth, video.videoHeight);
  if (!frameImage) return;
  session.last = signature; session.lastSent = Date.now(); session.sent++; session.busy = true;
  $('camera-watch').textContent = '■ 停止 · ' + session.sent + '/3';
  status('映像の変化を読み取っているよ · ' + session.sent + '/3');
  try {
    const response = await fetch('/api/observe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: session.goal, image: frameImage, marks: [], surface: 'camera' }),
      signal: AbortSignal.timeout(45000)
    });
    const result = await response.json();
    if (watch !== session || modal.hidden) return;
    if (!response.ok) { stopWatch(result.message || '映像を読み取れなかった。'); return; }
    if (typeof result.answer === 'string' && result.answer.trim()) {
      answer = result.answer.trim(); steps = []; index = -1;
      showObservation();
    }
    status('映像を見守っているよ · ' + session.sent + '/3回送信');
  } catch {
    if (watch === session) stopWatch('接続が切れたので見守りを止めたよ。');
  } finally {
    session.busy = false;
    if (watch === session && session.sent >= 3) stopWatch('3回読み取ったので停止したよ。必要ならもう一度開始できる。');
  }
}
function stopStream() {
  stopWatch();
  stream?.getTracks().forEach(track => track.stop());
  stream = null; video.pause(); video.srcObject = null;
  backdropVideo.pause(); backdropVideo.srcObject = null; backdropVideo.hidden = true;
}
function clearGuide() {
  steps = []; answer = ''; index = -1; $('camera-guidance').hidden = true; $('camera-ring').hidden = true;
  $('camera-next').textContent = '次へ →';
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
function closeCamera() {
  ++generation; void stopMic(false); stopStream(); clearGuide(); image = ''; photo.removeAttribute('src');
  backdropPhoto.hidden = true; backdropPhoto.removeAttribute('src');
  ink.hidden = true; photo.hidden = true; video.hidden = false;
  strokes = []; stroke = null; modal.hidden = true;
}
async function openCamera() {
  const token = ++generation;
  void stopMic(false);
  stopStream(); clearGuide(); image = ''; strokes = []; stroke = null;
  backdropPhoto.hidden = true; backdropPhoto.removeAttribute('src');
  photo.hidden = true; photo.removeAttribute('src'); ink.hidden = true; video.hidden = false;
  $('camera-capture').hidden = true; $('camera-retake').hidden = true;
  $('camera-clear').hidden = true; $('camera-ask').hidden = true; $('camera-watch').hidden = true;
  modal.hidden = false; status('カメラの許可を確認しているよ…');
  if (!navigator.mediaDevices?.getUserMedia) { status('このブラウザはカメラに対応していないよ。'); return; }
  try {
    const opened = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    if (token !== generation || modal.hidden) { opened.getTracks().forEach(track => track.stop()); return; }
    stream = opened; video.srcObject = opened; backdropVideo.srcObject = opened;
    backdropVideo.hidden = false; backdropVideo.play().catch(() => { backdropVideo.hidden = true; });
    await video.play();
    if (token !== generation || modal.hidden) return;
    frame.style.setProperty('--camera-ratio', String(video.videoWidth / video.videoHeight || 1.333));
    $('camera-capture').hidden = false; $('camera-ask').hidden = false; $('camera-watch').hidden = false;
    status('ライブ映像を見ながら質問できるよ。聞いた瞬間の1枚だけAIへ送る。');
  } catch { if (token === generation) status('カメラを使えなかった。ブラウザの権限設定を確認してね。'); }
}
function encodeSnapshot(source, sourceWidth, sourceHeight) {
  let width = Math.min(1024, sourceWidth);
  let data = '';
  while (width >= 320) {
    const snapshot = document.createElement('canvas');
    snapshot.width = width; snapshot.height = Math.max(1, Math.round(width * sourceHeight / sourceWidth));
    snapshot.getContext('2d').drawImage(source, 0, 0, snapshot.width, snapshot.height);
    data = snapshot.toDataURL('image/jpeg', .68);
    if (data.length < 900000) return data;
    width = Math.floor(width * .75);
  }
  return data.length < 980000 ? data : '';
}
function showSnapshot(data, ratio, kind) {
  sourceKind = kind;
  image = data; stopStream(); clearGuide(); strokes = []; stroke = null;
  backdropPhoto.src = data; backdropPhoto.hidden = false;
  frame.style.setProperty('--camera-ratio', String(ratio));
  video.hidden = true; photo.src = image; photo.hidden = false;
  $('camera-capture').hidden = true; $('camera-retake').hidden = false;
  $('camera-clear').hidden = false; $('camera-ask').hidden = false; $('camera-watch').hidden = true;
  ink.hidden = false; requestAnimationFrame(resizeInk);
}
function openImport() {
  ++generation; void stopMic(false); stopStream(); clearGuide();
  image = ''; strokes = []; stroke = null;
  backdropPhoto.hidden = true; backdropPhoto.removeAttribute('src');
  video.hidden = true; photo.hidden = true; photo.removeAttribute('src');
  ink.hidden = true; $('camera-capture').hidden = true; $('camera-retake').hidden = true; $('camera-watch').hidden = true;
  $('camera-clear').hidden = true; $('camera-ask').hidden = true;
  modal.hidden = false;
  status('選んだ画像を確認し、指すか描いてからAIへ送れるよ。');
  $('screen-file').click();
}
$('screen-open').onclick = openImport;
$('screen-pick').onclick = () => $('screen-file').click();
$('screen-file').onchange = async event => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8000000) {
    status('JPEG・PNG・WebPの画像を8MB以内で選んでね。'); return;
  }
  const token = ++generation;
  stopStream(); status('画像を準備しているよ…');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    if (token !== generation || modal.hidden) return;
    if (bitmap.width * bitmap.height > 64000000) { status('画像の解像度が高すぎるよ。'); return; }
    const data = encodeSnapshot(bitmap, bitmap.width, bitmap.height);
    if (!data) { status('画像を小さくできなかった。別の画像を選んでね。'); return; }
    showSnapshot(data, bitmap.width / bitmap.height, 'screen-upload');
    status('画像を確認してね。タップで指すか、指で丸や線を描いて質問できる。');
  } catch { if (token === generation) status('画像を読み込めなかった。別の画像を選んでね。'); }
  finally { bitmap?.close?.(); }
};
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
function speak(message) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  if (!$('camera-read').checked || !('SpeechSynthesisUtterance' in window)) return;
  const voice = new SpeechSynthesisUtterance(message);
  voice.lang = 'ja-JP'; voice.rate = .95;
  speechSynthesis.speak(voice);
}
function showObservation() {
  $('camera-guidance').hidden = false;
  $('camera-step-count').textContent = 'OMYLA';
  $('camera-step-text').textContent = answer;
  $('camera-next').textContent = steps.length ? '場所を見る →' : '閉じる';
  $('camera-ring').hidden = true;
  speak(answer);
}
function showStep() {
  const step = steps[index]; if (!step) return clearGuide();
  $('camera-guidance').hidden = false;
  $('camera-step-count').textContent = '画面の位置 · ' + (index + 1) + '/' + steps.length;
  $('camera-step-text').textContent = step.text;
  $('camera-next').textContent = index === steps.length - 1 ? '完了' : '次へ →';
  $('camera-ring').style.left = (clamp(step.x) * 100) + '%';
  $('camera-ring').style.top = (clamp(step.y) * 100) + '%';
  $('camera-ring').hidden = false;
  speak(step.text);
}
$('camera-read').onchange = () => { if (!$('camera-read').checked && 'speechSynthesis' in window) speechSynthesis.cancel(); };
$('camera-open').onclick = openCamera;
$('camera-close').onclick = closeCamera;
$('camera-retake').onclick = openCamera;
$('camera-clear').onclick = () => { strokes = []; stroke = null; clearGuide(); drawInk(); };
$('camera-capture').onclick = () => {
  if (!stream || !video.videoWidth) return;
  const data = encodeSnapshot(video, video.videoWidth, video.videoHeight);
  if (!data) { status('画像を小さくできなかった。撮り直してね。'); return; }
  showSnapshot(data, video.videoWidth / video.videoHeight, 'camera');
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
$('camera-watch').onclick = () => {
  if (watch) { stopWatch('見守りを止めたよ。'); return; }
  if (!stream || !video.videoWidth || modal.hidden) return;
  const goal = $('camera-goal').value.trim();
  if (!goal) { status('まず何を見守るか入力してね。'); $('camera-goal').focus(); return; }
  if (micState) { status('録音を止めてから始めてね。'); return; }
  clearGuide();
  const session = { goal, sent: 0, busy: false, last: null, lastSent: 0, timer: null };
  watch = session;
  $('camera-watch').setAttribute('aria-pressed', 'true');
  $('camera-watch').textContent = '■ 停止 · 0/3';
  session.timer = setInterval(() => void watchFrame(session), 2000);
  void watchFrame(session);
};
$('camera-ask').onclick = async () => {
  if (watch) stopWatch();
  if (micState) { status('録音を止めてから質問してね。'); return; }
  const goal = $('camera-goal').value.trim();
  if (!goal) { $('camera-goal').focus(); return; }
  const live = !!stream && !video.hidden && video.videoWidth > 0;
  const frameImage = live ? encodeSnapshot(video, video.videoWidth, video.videoHeight) : image;
  if (!frameImage) { status('画像を準備できなかった。もう一度試してね。'); return; }
  if (frameImage.length > 980000) { status('画像が大きすぎるよ。撮り直してね。'); return; }
  const button = $('camera-ask'), token = generation;
  button.disabled = true; clearGuide(); status('画像を見て答えを考えているよ…');
  try {
    const response = await fetch('/api/observe', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, image: frameImage, marks: live ? [] : marks(), surface: live ? 'camera' : sourceKind }), signal: AbortSignal.timeout(60000) });
    const result = await response.json();
    if (token !== generation || modal.hidden || (live && !stream)) return;
    if (!response.ok) { status(result.message || '画面を読み取れなかった。'); return; }
    if (typeof result.answer !== 'string' || !result.answer.trim()) {
      status('答えを読み取れなかった。もう一度聞いてね。'); return;
    }
    answer = result.answer.trim();
    steps = !live && Array.isArray(result.steps) ? result.steps.filter(step =>
      typeof step?.text === 'string' && Number.isFinite(step.x) && Number.isFinite(step.y) &&
      step.x >= 0 && step.x <= 1 && step.y >= 0 && step.y <= 1) : [];
    index = -1; showObservation();
    status(live ? '映像を見ながら続けて聞けるよ。移動中の映像には位置の印を固定しない。' : '答えを表示したよ。場所があれば画像上にも示せる。');
  } catch { if (token === generation && !modal.hidden) status('接続できなかった。少し待って再試行してね。'); }
  finally { button.disabled = false; }
};
$('camera-next').onclick = () => { if (++index >= steps.length) clearGuide(); else showStep(); };
function wave(samples, sampleRate) {
  const length = Math.min(224000, Math.round(samples.length * 16000 / sampleRate));
  const bytes = new Uint8Array(44 + length * 2), view = new DataView(bytes.buffer);
  const tag = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  tag(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); tag(8, 'WAVE'); tag(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  tag(36, 'data'); view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) {
    const position = i * sampleRate / 16000, low = Math.floor(position), ratio = position - low;
    const sample = (samples[low] || 0) * (1 - ratio) + (samples[low + 1] || 0) * ratio;
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), true);
  }
  return bytes;
}
async function stopMic(submit = true) {
  const state = micState; if (!state) return;
  micState = null; clearTimeout(state.timer);
  state.processor.disconnect(); state.source.disconnect();
  state.stream.getTracks().forEach(track => track.stop());
  try { await state.context.close(); } catch {}
  $('camera-talk').textContent = '🎙 押して話す'; $('camera-talk').setAttribute('aria-pressed', 'false');
  if (!submit || modal.hidden) return;
  const length = state.parts.reduce((n, part) => n + part.length, 0);
  if (length < state.context.sampleRate / 4) { status('もう少し長く話してね。'); return; }
  const samples = new Float32Array(length);
  let offset = 0;
  for (const part of state.parts) { samples.set(part, offset); offset += part.length; }
  const bytes = wave(samples, state.context.sampleRate);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const token = generation;
  $('camera-talk').disabled = true; status('音声を文字にしているよ…');
  try {
    const response = await fetch('/api/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: btoa(binary) }), signal: AbortSignal.timeout(45000) });
    const result = await response.json();
    if (token !== generation || modal.hidden) return;
    if (!response.ok || !result.text) { status(result.message || '音声を認識できなかった。'); return; }
    $('camera-goal').value = [$('camera-goal').value.trim(), result.text].filter(Boolean).join(' ').slice(0, 800);
    status('言葉を入力したよ。内容を確認してからAIに聞いてね。');
  } catch { if (token === generation && !modal.hidden) status('音声の接続に失敗した。'); }
  finally { $('camera-talk').disabled = false; }
}
$('camera-talk').onclick = async () => {
  if (micState) { await stopMic(); return; }
  if (watch) stopWatch('音声入力中は見守りを止めたよ。');
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) { status('このブラウザでは音声入力を使えないよ。'); return; }
  let audio;
  const token = generation;
  try {
    audio = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    if (modal.hidden || token !== generation) { audio.getTracks().forEach(track => track.stop()); return; }
    const audioContext = new AudioContext(), source = audioContext.createMediaStreamSource(audio);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const state = { stream: audio, context: audioContext, source, processor, parts: [], timer: null };
    processor.onaudioprocess = event => {
      if (micState !== state) return;
      state.parts.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };
    source.connect(processor); processor.connect(audioContext.destination);
    micState = state; state.timer = setTimeout(() => void stopMic(), 12500);
    $('camera-talk').textContent = '■ 録音を止める'; $('camera-talk').setAttribute('aria-pressed', 'true');
    status('録音中 · 最大12秒。止めると文字にするよ。');
  } catch { audio?.getTracks().forEach(track => track.stop()); status('マイクを使えなかった。端末の設定を確認してね。'); }
};
document.addEventListener('visibilitychange', () => { if (document.hidden && !modal.hidden) closeCamera(); });
addEventListener('resize', () => { if (!ink.hidden) resizeInk(); });
