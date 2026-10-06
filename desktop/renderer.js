const orb = document.getElementById('orb');
const panel = document.getElementById('panel');
const goal = document.getElementById('goal');
const wanderOption = document.getElementById('wander');
try { wanderOption.checked = localStorage.getItem('omyla-wander') !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { wanderOption.checked = true; }
window.omyla.setWander(wanderOption.checked);
wanderOption.onchange = () => { try { localStorage.setItem('omyla-wander', wanderOption.checked ? 'on' : 'off'); } catch {} window.omyla.setWander(wanderOption.checked); };
window.omyla.onWalking(walking => orb.classList.toggle('walking', walking));
function show(open) { if (!open && micState) stopMic(false); panel.hidden = !open; orb.setAttribute('aria-expanded', String(open)); orb.setAttribute('aria-label', open ? 'OMYLAを閉じる' : 'OMYLAを開く'); if (open) goal.focus(); }
let grab;
let reactionTimer;
function react(message) {
  const bubble = document.getElementById('reaction');
  bubble.textContent = message;
  clearTimeout(reactionTimer);
  reactionTimer = setTimeout(() => { bubble.textContent = ''; }, 1800);
}
orb.addEventListener('pointerdown', async event => {
  if (event.button !== 0 || !panel.hidden) return;
  grab = { id: event.pointerId, x: event.screenX, y: event.screenY, moved: false };
  orb.setPointerCapture(event.pointerId);
  await window.omyla.dragStart();
});
orb.addEventListener('pointermove', event => {
  if (!grab || grab.id !== event.pointerId) return;
  if (Math.hypot(event.screenX - grab.x, event.screenY - grab.y) > 6) grab.moved = true;
  if (grab.moved) { orb.classList.add('carrying'); react('わっ！'); window.omyla.dragMove({ x: event.screenX, y: event.screenY }); }
});
async function release(event) {
  if (!grab || grab.id !== event.pointerId) return;
  const moved = grab.moved;
  grab = undefined;
  orb.classList.remove('carrying');
  await window.omyla.dragEnd();
  if (moved) { orb.classList.add('landing'); setTimeout(() => orb.classList.remove('landing'), 750); react(['ふう。', '服、乱れちゃった。', 'ここでいい？', '次は優しくね！'][Math.floor(Math.random() * 4)]); }
  else { react('なあに？'); show(await window.omyla.toggle()); }
}
orb.addEventListener('pointerup', release);
orb.addEventListener('pointercancel', async event => { if (grab?.id === event.pointerId) { grab = undefined; orb.classList.remove('carrying'); await window.omyla.dragEnd(); } });
document.getElementById('close').onclick = async () => { await window.omyla.close(); show(false); };
document.getElementById('send').onclick = async () => { if (!goal.value.trim()) { goal.focus(); return; } const sent = await window.omyla.openGoal(goal.value); if (sent) { goal.value = ''; const image = document.getElementById('screen-preview'); image.hidden = true; image.removeAttribute('src'); show(false); } };
document.getElementById('quit').onclick = () => window.omyla.quit();
window.omyla.getLogin().then(settings => { if (!settings?.available) return; const option = document.getElementById('login-option'), checkbox = document.getElementById('login'); option.hidden = false; checkbox.checked = settings.enabled; checkbox.onchange = async () => { if (!await window.omyla.setLogin(checkbox.checked)) checkbox.checked = !checkbox.checked; }; });
document.addEventListener('keydown', async event => { if (event.key === 'Escape' && !panel.hidden) { await window.omyla.close(); show(false); orb.focus(); } });

async function refreshDisplays() { const state = await window.omyla.displays(); if (!state) return; const select = document.getElementById('display'); select.replaceChildren(...state.displays.map((display, index) => { const option = document.createElement('option'); option.value = display.id; option.textContent = `画面${index + 1} · ${display.bounds.width}×${display.bounds.height}`; return option; })); select.value = state.selected; }
document.getElementById('display').onchange = async event => { if (!await window.omyla.selectDisplay(event.target.value)) await refreshDisplays(); else { document.getElementById('marks-status').textContent = '線や指示なし'; const image = document.getElementById('screen-preview'); image.hidden = true; image.removeAttribute('src'); } };
document.getElementById('draw-screen').onclick = () => window.omyla.draw();
window.omyla.onMarksUpdated(count => { document.getElementById('marks-status').textContent = `${count}件の画面指示`; });
refreshDisplays();
document.getElementById('preview-screen').onclick = async () => { const image = document.getElementById('screen-preview'); image.hidden = true; image.removeAttribute('src'); try { const result = await window.omyla.previewScreen(); if (result?.image) { image.src = result.image; image.hidden = false; } else document.getElementById('marks-status').textContent = '画面を取得できない'; } catch { document.getElementById('marks-status').textContent = '画面の取得が許可されていない'; } };

document.getElementById('move-cursor').onclick = async () => { const status = document.getElementById('marks-status'); status.textContent = await window.omyla.moveCursor() ? 'カーソルを移動しました' : '位置を描いてからWindowsで操作してください'; };

const guideButton = document.getElementById('guide'), guideStatus = document.getElementById('guide-status');
const nextGuide = document.getElementById('next-guide'), stopGuide = document.getElementById('stop-guide');
const executeGuide = document.getElementById('execute-guide');
guideButton.onclick = async () => {
  if (!goal.value.trim()) { goal.focus(); return; }
  guideButton.disabled = true;
  guideStatus.textContent = '画面を確認しています…';
  try {
    const result = await window.omyla.guide(goal.value);
    if (result?.count) {
      guideStatus.textContent = `${result.count}件の案内 · ${result.current}`;
      nextGuide.hidden = false; stopGuide.hidden = false; executeGuide.hidden = false;
    } else guideStatus.textContent = result?.message || ({ capture_failed: '画面を取得できませんでした', network_error: '通信できませんでした', display_changed: '画面構成が変わりました', image_too_large: '画像が大きすぎます' }[result?.error] || '案内を作成できませんでした');
  } catch { guideStatus.textContent = '画面案内を開始できませんでした'; }
  finally { guideButton.disabled = false; }
};
nextGuide.onclick = async () => { const result = await window.omyla.nextGuide(); if (!result?.remaining) { nextGuide.hidden = true; stopGuide.hidden = true; executeGuide.hidden = true; guideStatus.textContent = '案内は終了しました'; } else guideStatus.textContent = `残り${result.remaining}件 · ${result.current}`; };
stopGuide.onclick = async () => { await window.omyla.stopGuide(); nextGuide.hidden = true; stopGuide.hidden = true; executeGuide.hidden = true; guideStatus.textContent = '案内を消しました'; };

executeGuide.onclick = async () => {
  executeGuide.disabled = true;
  guideStatus.textContent = '対象の画面と位置を再確認しています…';
  try {
    const result = await window.omyla.executeGuideClick();
    if (result.clicked) {
      guideStatus.textContent = '一度クリックしました。次の画面を見せるには再度「画面を見て教える」を押してください。';
      nextGuide.hidden = true; stopGuide.hidden = true; executeGuide.hidden = true;
    } else {
      guideStatus.textContent = ({
        stale: '画面案内から60秒以上経過しました。撮影し直してください。',
        screen_changed: '対象の表示が変わりました。撮影し直してください。',
        display_changed: 'モニター構成が変わりました。',
        click_failed: 'Windowsがクリックを受け付けませんでした。',
        capture_failed: '画面の再取得に失敗しました。'
      })[result.error] || '実行できませんでした。';
      if (['stale', 'screen_changed', 'display_changed', 'click_failed'].includes(result.error)) {
        nextGuide.hidden = true; stopGuide.hidden = true; executeGuide.hidden = true;
      }
    }
  } catch { guideStatus.textContent = '実行できませんでした。'; }
  finally { executeGuide.disabled = false; }
};

const micButton = document.getElementById('mic'), micStatus = document.getElementById('mic-status');
const askButton = document.getElementById('ask'), answerBox = document.getElementById('answer');
let asking = false;
async function askCrew() {
  const text = goal.value.trim();
  if (!text || asking) return;
  asking = true; askButton.disabled = true; answerBox.hidden = false;
  answerBox.textContent = '考えてるよ…';
  try {
    const result = document.getElementById('screen-context').checked
      ? await window.omyla.observe(text) : await window.omyla.ask(text);
    answerBox.textContent = result?.answer || result?.message || ({
      daily_limit: '今日の利用枠に達したよ。', capture_failed: '画面を取得できなかった。',
      network_error: '通信できなかった。', display_changed: '画面構成が変わったので、もう一度聞いてね。'
    })[result?.error] || '答えを取得できなかった。';
    if (result?.answer && 'speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(result.answer);
      utterance.lang = 'ja-JP'; utterance.rate = .98;
      speechSynthesis.speak(utterance);
    }
  } catch { answerBox.textContent = '通信できなかった。'; }
  finally { asking = false; askButton.disabled = false; }
}
askButton.onclick = askCrew;
goal.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); askCrew(); } });
let micState;
function wave(samples, sampleRate) {
  const length = Math.min(240000, Math.round(samples.length * 16000 / sampleRate));
  const bytes = new Uint8Array(44 + length * 2), view = new DataView(bytes.buffer);
  const tag = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  tag(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); tag(8, 'WAVE'); tag(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  tag(36, 'data'); view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++) {
    const position = i * sampleRate / 16000, low = Math.floor(position), blend = position - low;
    const sample = (samples[low] || 0) * (1 - blend) + (samples[low + 1] || 0) * blend;
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), true);
  }
  return bytes;
}
async function stopMic(upload = true) {
  const state = micState;
  if (!state) return;
  micState = undefined; clearTimeout(state.timer);
  state.processor.disconnect(); state.source.disconnect();
  state.stream.getTracks().forEach(track => track.stop());
  await state.context.close();
  micButton.setAttribute('aria-pressed', 'false'); micButton.textContent = '🎙 話す';
  if (!upload) { micStatus.textContent = '録音を破棄しました'; return; }
  const size = state.parts.reduce((n, part) => n + part.length, 0);
  if (size < state.context.sampleRate / 4) { micStatus.textContent = 'もう少し長く話してね'; return; }
  const samples = new Float32Array(size);
  let offset = 0;
  for (const part of state.parts) { samples.set(part, offset); offset += part.length; }
  micStatus.textContent = '音声を文字にしています…';
  const result = await window.omyla.transcribe(wave(samples, state.context.sampleRate));
  if (result.text) {
    goal.value = [goal.value.trim(), result.text].filter(Boolean).join(' ').slice(0, 1500);
    micStatus.textContent = '聞き取ったよ。答えるね…';
    await askCrew();
  } else micStatus.textContent = result.message || '音声を文字にできませんでした';
}
micButton.onclick = async () => {
  if (micState) { await stopMic(); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) { micStatus.textContent = 'この端末では録音できません'; return; }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    if (panel.hidden) { stream.getTracks().forEach(track => track.stop()); return; }
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const state = { stream, context, source, processor, parts: [], timer: null, samples: 0 };
    processor.onaudioprocess = event => {
      if (micState !== state) return;
      const input = event.inputBuffer.getChannelData(0);
      state.parts.push(new Float32Array(input));
      state.samples += input.length;
      if (state.samples >= context.sampleRate * 15) stopMic();
    };
    source.connect(processor); processor.connect(context.destination);
    micState = state;
    state.timer = setTimeout(() => stopMic(), 15500);
    micButton.setAttribute('aria-pressed', 'true'); micButton.textContent = '■ 録音を止める';
    micStatus.textContent = '録音中 · 最大15秒';
  } catch { stream?.getTracks().forEach(track => track.stop()); micStatus.textContent = 'マイクを使えませんでした。Windowsのマイク設定を確認してね。'; }
};

const runTaskButton=document.getElementById('run-task');
window.omyla.onTaskCollapse(()=>show(false));
window.omyla.onFacing(direction=>orb.dataset.facing=direction);
window.omyla.onTaskState(value=>{document.getElementById('task-result').textContent=value.summary||value.state;orb.classList.toggle('working',value.state==='acting');if(value.state==='walking')react('行ってくるね');if(value.state==='done')react('できたよ');});
runTaskButton.onclick=async()=>{
 if(!goal.value.trim()){goal.focus();return;}
 if(!document.getElementById('task-consent').checked){document.getElementById('task-result').textContent='この作業の画面共有と操作をチェックしてね';return;}
 runTaskButton.disabled=true;
 try{const result=await window.omyla.startTask(goal.value.trim());document.getElementById('task-result').textContent=result.summary||({windows_required:'Windows版で使ってね',daily_limit:'今日の利用枠に達したよ',action_blocked:'この操作は自動実行できないよ',user_intervened:'マウス操作を検知して止まったよ',target_changed:'対象が変わったので止まったよ'}[result.error]||result.error||result.state);}
 catch{document.getElementById('task-result').textContent='作業を開始できなかったよ';}
 finally{runTaskButton.disabled=false;document.getElementById('task-consent').checked=false;}
};
