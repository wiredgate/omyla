const orb = document.getElementById('orb');
const panel = document.getElementById('panel');
const goal = document.getElementById('goal');
function show(open) { panel.hidden = !open; orb.setAttribute('aria-expanded', String(open)); orb.setAttribute('aria-label', open ? 'OMYLAを閉じる' : 'OMYLAを開く'); if (open) goal.focus(); }
orb.onclick = async () => show(await window.omyla.toggle());
document.getElementById('close').onclick = async () => { await window.omyla.close(); show(false); };
document.getElementById('send').onclick = async () => { if (!goal.value.trim()) { goal.focus(); return; } const sent = await window.omyla.openGoal(goal.value); if (sent) { goal.value = ''; show(false); } };
document.getElementById('quit').onclick = () => window.omyla.quit();
window.omyla.getLogin().then(settings => { if (!settings?.available) return; const option = document.getElementById('login-option'), checkbox = document.getElementById('login'); option.hidden = false; checkbox.checked = settings.enabled; checkbox.onchange = async () => { if (!await window.omyla.setLogin(checkbox.checked)) checkbox.checked = !checkbox.checked; }; });
document.addEventListener('keydown', async event => { if (event.key === 'Escape' && !panel.hidden) { await window.omyla.close(); show(false); orb.focus(); } });

async function refreshDisplays() { const state = await window.omyla.displays(); if (!state) return; const select = document.getElementById('display'); select.replaceChildren(...state.displays.map((display, index) => { const option = document.createElement('option'); option.value = display.id; option.textContent = `画面${index + 1} · ${display.bounds.width}×${display.bounds.height}`; return option; })); select.value = state.selected; }
document.getElementById('display').onchange = async event => { if (!await window.omyla.selectDisplay(event.target.value)) await refreshDisplays(); else document.getElementById('marks-status').textContent = '線や指示なし'; };
document.getElementById('draw-screen').onclick = () => window.omyla.draw();
window.omyla.onMarksUpdated(count => { document.getElementById('marks-status').textContent = `${count}件の画面指示`; });
refreshDisplays();
