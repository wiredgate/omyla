const orb = document.getElementById('orb');
const panel = document.getElementById('panel');
const goal = document.getElementById('goal');
function show(open) { panel.hidden = !open; orb.setAttribute('aria-expanded', String(open)); orb.setAttribute('aria-label', open ? 'OMYLAを閉じる' : 'OMYLAを開く'); if (open) goal.focus(); }
orb.onclick = async () => show(await window.omyla.toggle());
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
guideButton.onclick = async () => {
  if (!goal.value.trim()) { goal.focus(); return; }
  guideButton.disabled = true;
  guideStatus.textContent = '画面を確認しています…';
  try {
    const result = await window.omyla.guide(goal.value);
    if (result?.count) {
      guideStatus.textContent = `${result.count}件の案内を実画面に表示中`;
      nextGuide.hidden = false; stopGuide.hidden = false;
    } else guideStatus.textContent = result?.message || ({ capture_failed: '画面を取得できませんでした', network_error: '通信できませんでした', display_changed: '画面構成が変わりました', image_too_large: '画像が大きすぎます' }[result?.error] || '案内を作成できませんでした');
  } catch { guideStatus.textContent = '画面案内を開始できませんでした'; }
  finally { guideButton.disabled = false; }
};
nextGuide.onclick = async () => { const result = await window.omyla.nextGuide(); if (!result?.remaining) { nextGuide.hidden = true; stopGuide.hidden = true; guideStatus.textContent = '案内は終了しました'; } else guideStatus.textContent = `残り${result.remaining}件`; };
stopGuide.onclick = async () => { await window.omyla.stopGuide(); nextGuide.hidden = true; stopGuide.hidden = true; guideStatus.textContent = '案内を消しました'; };
