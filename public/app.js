const $ = id => document.getElementById(id);
const stage = $('stage'), canvas = $('ink'), ctx = canvas.getContext('2d');
const crew = ['Kai', 'Mia', 'Emma'];
let drawing = false, strokes = [], pointer = null, files = [];
const clamp = n => Math.max(0, Math.min(1, n));
function bounds() { return stage.getBoundingClientRect(); }
function resize() { const box = bounds(), scale = devicePixelRatio || 1; canvas.width = box.width * scale; canvas.height = box.height * scale; ctx.setTransform(scale, 0, 0, scale, 0, 0); renderInk(); }
function renderInk() { const box = bounds(); ctx.clearRect(0, 0, box.width, box.height); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#e8f7a4'; for (const stroke of strokes) { ctx.beginPath(); stroke.forEach((p, i) => i ? ctx.lineTo(p.x * box.width, p.y * box.height) : ctx.moveTo(p.x * box.width, p.y * box.height)); ctx.stroke(); } if (pointer) { ctx.beginPath(); ctx.arc(pointer.x * box.width, pointer.y * box.height, 10, 0, Math.PI * 2); ctx.stroke(); } }
function point(event) { const box = bounds(); return { x: clamp((event.clientX - box.left) / box.width), y: clamp((event.clientY - box.top) / box.height) }; }
function targetAt(p) { const box = bounds(); canvas.style.pointerEvents = 'none'; const node = document.elementFromPoint(box.left + p.x * box.width, box.top + p.y * box.height); canvas.style.pointerEvents = ''; return node?.closest('.demo-page h1, .demo-page p, .demo-card, .eyebrow')?.textContent.trim().replace(/\s+/g, ' ').slice(0, 180) || ''; }
function context() { const marks = []; if (pointer) marks.push({ kind: 'point', target: targetAt(pointer) }); for (const stroke of strokes.slice(0, 10)) { if (!stroke.length) continue; const minX = Math.min(...stroke.map(p => p.x)), maxX = Math.max(...stroke.map(p => p.x)), minY = Math.min(...stroke.map(p => p.y)), maxY = Math.max(...stroke.map(p => p.y)); marks.push({ kind: stroke.length > 12 && Math.hypot(maxX - minX, maxY - minY) > .1 ? 'drawn region' : 'drawn line', target: targetAt({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 }) }); } return { targets: [...new Set(marks.map(x => x.target).filter(Boolean))], marks, files }; }
$('draw').onclick = () => { const on = canvas.classList.toggle('active'); $('draw').setAttribute('aria-pressed', String(on)); $('hint').textContent = on ? '画面上に丸や矢印を描ける' : 'クリックして指すこともできる'; };
$('clear').onclick = () => { strokes = []; pointer = null; renderInk(); };
canvas.addEventListener('pointerdown', event => { drawing = true; canvas.setPointerCapture(event.pointerId); strokes.push([point(event)]); renderInk(); });
canvas.addEventListener('pointermove', event => { if (drawing) { strokes.at(-1).push(point(event)); renderInk(); } });
canvas.addEventListener('pointerup', () => { drawing = false; });
stage.addEventListener('click', event => { if (canvas.classList.contains('active')) return; pointer = point(event); renderInk(); });
for (const name of ['dragenter', 'dragover']) $('drop').addEventListener(name, event => { event.preventDefault(); $('drop').classList.add('dropping'); });
$('drop').addEventListener('dragleave', () => $('drop').classList.remove('dropping'));
$('drop').addEventListener('drop', event => { event.preventDefault(); $('drop').classList.remove('dropping'); files = [...event.dataTransfer.files].slice(0, 5).map(({ name, type }) => ({ name, type })); $('drop').textContent = files.length ? `添付情報: ${files.map(f => f.name).join('、')}（内容は送信しない）` : 'ファイルをドロップしてね'; });
$('goal-form').onsubmit = async event => {
  event.preventDefault(); const goal = $('instruction').value.trim(); if (!goal) return;
  const submit = $('goal-form button[type=submit]'); submit.disabled = true;
  $('team-list').replaceChildren(...crew.map(name => card(name, '作業中', '画面指示を確認している…')));
  $('approval-list').replaceChildren(); $('summary').textContent = '';
  try {
    const response = await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal, context: context() }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.message || `依頼を処理できなかった (${response.status})`);
    $('team-list').replaceChildren(...result.steps.map(step => card(step.name, step.state === 'done' ? '提案' : 'エラー', step.text)));
    $('summary').textContent = `Manager · ${result.steps.filter(x => x.state === 'done').length}件の提案が届いた。画面指示: ${result.context.targets.join(' / ') || '指定なし'}`;
  } catch (error) { $('team-list').replaceChildren(); $('summary').textContent = error.message; }
  finally { submit.disabled = false; }
};
function card(name, status, detail) { const el = document.createElement('div'); el.className = 'agent'; const title = document.createElement('b'), small = document.createElement('small'), p = document.createElement('p'); title.textContent = name; small.textContent = status; p.textContent = detail; el.append(title, small, p); return el; }
$('voice').onclick = () => { const Speech = window.SpeechRecognition || window.webkitSpeechRecognition; if (!Speech) return alert('このブラウザは音声入力に対応していない。テキストで依頼できるよ。'); const recognition = new Speech(); recognition.lang = 'ja-JP'; recognition.onresult = event => { $('instruction').value = event.results[0][0].transcript; }; recognition.onerror = () => alert('音声を取得できなかった。テキストで入力してね。'); recognition.start(); };
new ResizeObserver(resize).observe(stage);
