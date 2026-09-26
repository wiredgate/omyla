import { classifyStroke } from './gesture.js';
const $ = id => document.getElementById(id);
const stage = $('stage'), canvas = $('ink'), ctx = canvas.getContext('2d');
const crew = ['Kai', 'Mia', 'Emma'];
let drawing = false, strokes = [], pointer = null, files = [], goals = [], lastOverride = 'auto', handoff = null;
const clamp = n => Math.max(0, Math.min(1, n));
function bounds() { return stage.getBoundingClientRect(); }
function resize() { const box = bounds(), scale = devicePixelRatio || 1; canvas.width = box.width * scale; canvas.height = box.height * scale; ctx.setTransform(scale, 0, 0, scale, 0, 0); renderInk(); }
function renderInk() { const box = bounds(); ctx.clearRect(0, 0, box.width, box.height); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#e8f7a4'; for (const stroke of strokes) { ctx.beginPath(); stroke.forEach((p, i) => i ? ctx.lineTo(p.x * box.width, p.y * box.height) : ctx.moveTo(p.x * box.width, p.y * box.height)); ctx.stroke(); } if (pointer) { ctx.beginPath(); ctx.arc(pointer.x * box.width, pointer.y * box.height, 10, 0, Math.PI * 2); ctx.stroke(); } }
function point(event) { const box = bounds(); return { x: clamp((event.clientX - box.left) / box.width), y: clamp((event.clientY - box.top) / box.height) }; }
function targetAt(p) { const box = bounds(); canvas.style.pointerEvents = 'none'; const node = document.elementFromPoint(box.left + p.x * box.width, box.top + p.y * box.height); canvas.style.pointerEvents = ''; return node?.closest('.demo-page h1, .demo-page p, .demo-card, .eyebrow')?.textContent.trim().replace(/\s+/g, ' ').slice(0, 180) || ''; }
function targetsInBox(region) { const box = bounds(); return [...stage.querySelectorAll('.demo-page h1, .demo-page p, .demo-card, .eyebrow')].filter(node => { const r = node.getBoundingClientRect(); const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2; return cx >= box.left + region.x * box.width && cx <= box.left + (region.x + region.width) * box.width && cy >= box.top + region.y * box.height && cy <= box.top + (region.y + region.height) * box.height; }).map(node => node.textContent.trim().replace(/\s+/g, ' ').slice(0, 180)).slice(0, 4); }
function context() { const marks = []; if (pointer) marks.push({ kind: 'point', target: targetAt(pointer), position: pointer }); const box = bounds(); for (const [i, stroke] of strokes.slice(0, 10).entries()) { const geometry = classifyStroke(stroke, { width: box.width, height: box.height }, i === strokes.length - 1 ? lastOverride : 'auto'); if (!geometry) continue; const labels = geometry.kind === 'circle' ? targetsInBox(geometry.box) : [targetAt(geometry.tip)].filter(Boolean); marks.push({ kind: geometry.kind, target: labels.join(' / '), box: geometry.box, tip: geometry.tip }); } return { targets: [...new Set(marks.map(x => x.target).filter(Boolean))], marks, files }; }
function updateSelection() { const source = handoff ? `選んだページ (${handoff.surface.host}): ` : ''; const marks = handoff?.marks || context().marks; $('selection').textContent = marks.length ? source + marks.map(x => `${{ point: '指した場所', circle: '丸で囲んだ範囲', arrow: '矢印の先', line: '線の終点' }[x.kind]}: ${x.target || '対象要素なし'}`).join('　·　') : '画面を指すか描くと、AIに渡す対象がここに表示される。'; }
$('draw').onclick = () => { const on = canvas.classList.toggle('active'); $('draw').setAttribute('aria-pressed', String(on)); $('hint').textContent = on ? '画面上に丸や矢印を描ける' : 'クリックして指すこともできる'; };
$('clear').onclick = () => { strokes = []; pointer = null; $('kind-label').hidden = true; renderInk(); updateSelection(); };
canvas.addEventListener('pointerdown', event => { drawing = true; lastOverride = 'auto'; $('mark-kind').value = 'auto'; $('kind-label').hidden = false; canvas.setPointerCapture(event.pointerId); strokes.push([point(event)]); renderInk(); });
canvas.addEventListener('pointermove', event => { if (drawing) { strokes.at(-1).push(point(event)); renderInk(); } });
canvas.addEventListener('pointerup', () => { drawing = false; updateSelection(); });
stage.addEventListener('click', event => { if (canvas.classList.contains('active')) return; pointer = point(event); renderInk(); updateSelection(); });
$('mark-kind').onchange = event => { lastOverride = event.target.value; updateSelection(); };
const releaseHandoff = document.createElement('button'); releaseHandoff.textContent = '選択を解除'; releaseHandoff.type = 'button'; releaseHandoff.hidden = true; releaseHandoff.className = 'release-handoff'; $('selection').after(releaseHandoff);
releaseHandoff.onclick = () => { handoff = null; releaseHandoff.hidden = true; updateSelection(); };
if (location.hash.startsWith('#omyla=')) {
  try { const transfer = JSON.parse(decodeURIComponent(location.hash.slice(7))); if (transfer?.context?.surface?.kind === 'browser-tab' && typeof transfer.goal === 'string' && transfer.goal.length <= 1500) { handoff = transfer.context; $('instruction').value = transfer.goal; releaseHandoff.hidden = false; updateSelection(); } } catch {}
  history.replaceState(null, '', location.pathname + location.search);
}
for (const name of ['dragenter', 'dragover']) $('drop').addEventListener(name, event => { event.preventDefault(); $('drop').classList.add('dropping'); });
$('drop').addEventListener('dragleave', () => $('drop').classList.remove('dropping'));
$('drop').addEventListener('drop', event => { event.preventDefault(); $('drop').classList.remove('dropping'); files = [...event.dataTransfer.files].slice(0, 5).map(({ name, type }) => ({ name, type })); $('drop').textContent = files.length ? `添付情報: ${files.map(f => f.name).join('、')}（内容は送信しない）` : 'ファイルをドロップしてね'; });
$('goal-form').onsubmit = async event => {
  event.preventDefault(); const goal = $('instruction').value.trim(); if (!goal) return;
  const submit = $('goal-form').querySelector('.primary'); submit.disabled = true;
  $('team-list').replaceChildren(...crew.map(name => card(name, '作業中', '画面指示を確認している…')));
  $('summary').textContent = '';
  try {
    const response = await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal, context: handoff || context() }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.message || `依頼を処理できなかった (${response.status})`);
    goals = [result, ...goals.filter(x => x.id !== result.id)].slice(0, 10); showGoal(result); showHistory();
  } catch (error) { $('team-list').replaceChildren(); $('summary').textContent = error.message; }
  finally { submit.disabled = false; }
};
function card(name, status, detail) { const el = document.createElement('div'); el.className = 'agent'; const title = document.createElement('b'), small = document.createElement('small'), p = document.createElement('p'); title.textContent = name; small.textContent = status; p.textContent = detail; el.append(title, small, p); return el; }
function showGoal(goal) { $('team-list').replaceChildren(...goal.steps.map(step => card(step.name, step.state === 'done' ? '提案' : 'エラー', step.text))); $('summary').textContent = goal.state === 'working' ? 'Manager · 作業中。ページを開き直すと最新状態を確認できる。' : `Manager · ${goal.steps.filter(x => x.state === 'done').length}件の提案が届いた。画面指示: ${goal.context.targets.join(' / ') || '指定なし'}`; }
function showHistory() { const area = $('history'); area.replaceChildren(); for (const goal of goals) { const button = document.createElement('button'); button.type = 'button'; button.textContent = goal.goal.slice(0, 60); button.onclick = () => showGoal(goal); area.append(button); } }
const clearHistory = document.createElement('button'); clearHistory.type = 'button'; clearHistory.textContent = '履歴を消す'; clearHistory.className = 'clear-history'; $('history').after(clearHistory);
clearHistory.onclick = async () => { if (!window.confirm('このブラウザの保存済み依頼とAgentの結果を消す？')) return; const response = await fetch('/api/goals', { method: 'DELETE' }); if (!response.ok) { $('summary').textContent = '履歴を削除できなかった。'; return; } goals = []; $('team-list').replaceChildren(); $('summary').textContent = '保存済みの依頼を削除した。'; showHistory(); };
async function restore() { try { const response = await fetch('/api/goals'); if (!response.ok) return; goals = (await response.json()).goals || []; showHistory(); if (goals.length) showGoal(goals[0]); } catch {} }
$('voice').onclick = () => { const Speech = window.SpeechRecognition || window.webkitSpeechRecognition; if (!Speech) return alert('このブラウザは音声入力に対応していない。テキストで依頼できるよ。'); const recognition = new Speech(); recognition.lang = 'ja-JP'; recognition.onresult = event => { $('instruction').value = event.results[0][0].transcript; }; recognition.onerror = () => alert('音声を取得できなかった。テキストで入力してね。'); recognition.start(); };
new ResizeObserver(resize).observe(stage);
restore();
