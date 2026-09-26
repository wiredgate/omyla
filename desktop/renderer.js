const orb = document.getElementById('orb');
const panel = document.getElementById('panel');
const goal = document.getElementById('goal');
function show(open) { panel.hidden = !open; orb.setAttribute('aria-expanded', String(open)); orb.setAttribute('aria-label', open ? 'OMYLAを閉じる' : 'OMYLAを開く'); if (open) goal.focus(); }
orb.onclick = async () => show(await window.omyla.toggle());
document.getElementById('close').onclick = async () => { await window.omyla.close(); show(false); };
document.getElementById('send').onclick = async () => { if (!goal.value.trim()) { goal.focus(); return; } const sent = await window.omyla.openGoal(goal.value); if (sent) { goal.value = ''; show(false); } };
document.getElementById('quit').onclick = () => window.omyla.quit();
document.addEventListener('keydown', async event => { if (event.key === 'Escape' && !panel.hidden) { await window.omyla.close(); show(false); orb.focus(); } });
