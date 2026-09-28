const target = document.getElementById('target');
const caption = document.getElementById('caption');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
window.omylaGuide.onStep(({ step, index, total, mute }) => {
  if (!step) { target.hidden = true; caption.hidden = true; return; }
  const x = step.x * innerWidth, y = step.y * innerHeight;
  target.style.left = `${x}px`; target.style.top = `${y}px`;
  target.dataset.kind = step.kind;
  document.getElementById('number').textContent = String(index + 1);
  caption.textContent = `${index + 1}/${total}  ${step.text}`;
  const left = clamp(x + 42, 8, Math.max(8, innerWidth - 340));
  const top = clamp(y + 40, 8, Math.max(8, innerHeight - 112));
  caption.style.left = `${left}px`; caption.style.top = `${top}px`;
  target.hidden = false; caption.hidden = false;
  if (!mute && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(step.text);
    utterance.lang = 'ja-JP'; utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }
});
