(() => {
  const canvas = document.getElementById('demo-ink');
  const frame = document.getElementById('demo-canvas');
  const target = document.getElementById('demo-target');
  const hint = document.getElementById('demo-hint');
  const answer = document.getElementById('demo-answer');
  const answerText = document.getElementById('demo-answer-text');
  const question = document.getElementById('demo-question');
  const speak = document.getElementById('demo-speak');
  const screen = document.getElementById('demo-screen');
  const camera = document.getElementById('demo-camera');
  const screenScene = document.getElementById('demo-screen-scene');
  const cameraScene = document.getElementById('demo-camera-scene');
  const context = canvas.getContext('2d');
  let mode = 'screen', stroke = null, pointerId = null, spoken = '';

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    };
  }
  function draw() {
    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);
    if (!stroke || stroke.length < 2) return;
    context.beginPath();
    stroke.forEach((p, i) => i ? context.lineTo(p.x * rect.width, p.y * rect.height) : context.moveTo(p.x * rect.width, p.y * rect.height));
    context.strokeStyle = '#d2ffa9'; context.lineWidth = 4; context.lineCap = 'round'; context.lineJoin = 'round';
    context.shadowColor = '#d2ffa9'; context.shadowBlur = 15; context.stroke(); context.shadowBlur = 0;
  }
  function respond(p) {
    const type = mode === 'camera'
      ? p.x < .45 ? 'leaf' : p.y > .55 ? 'cup' : 'book'
      : p.x < .26 ? 'menu' : p.y < .47 ? 'title' : p.x > .63 ? 'action' : 'task';
    const lines = {
      leaf: ['「この葉は何？」', '葉の形と色を見ながら説明するね。詳しく知りたい部分を指して聞いて。'],
      cup: ['「ここは何？」', '指した対象について、見えている範囲から答えるよ。'],
      book: ['「この本は？」', '表紙の文字や見た目を手がかりに説明するよ。'],
      menu: ['「このメニューは？」', '左側のメニューを指しているね。目的に合わせて次の場所を案内できるよ。'],
      title: ['「ここを教えて」', '上部の見出しを指しているね。画面の内容に沿って説明するよ。'],
      action: ['「次はどこ？」', '右側の確認ボタンを指しているね。必要な手順を順番に案内するよ。'],
      task: ['「これ、どうすればいい？」', 'このタスクを指しているね。まず内容を確認して、次の手順を考えよう。']
    };
    const [q, a] = lines[type];
    target.style.left = (p.x * 100) + '%';
    target.style.top = (p.y * 100) + '%';
    target.hidden = false;
    hint.hidden = true;
    question.textContent = q; answerText.textContent = a; spoken = a;
    answer.classList.remove('answer-visible');
    requestAnimationFrame(() => answer.classList.add('answer-visible'));
    speak.hidden = !('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
  }
  function setMode(next) {
    mode = next;
    screen.classList.toggle('active', next === 'screen');
    camera.classList.toggle('active', next === 'camera');
    screen.setAttribute('aria-pressed', String(next === 'screen'));
    camera.setAttribute('aria-pressed', String(next === 'camera'));
    screenScene.hidden = next !== 'screen';
    cameraScene.hidden = next !== 'camera';
    target.hidden = true; hint.hidden = false; speak.hidden = true;
    stroke = null; draw();
    question.textContent = '「ここ、どうすればいい？」';
    answerText.textContent = '画面を指すと、ここに案内が現れる。';
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    resize();
  }
  canvas.addEventListener('pointerdown', event => {
    event.preventDefault();
    pointerId = event.pointerId;
    stroke = [point(event)];
    target.hidden = true;
    canvas.setPointerCapture(pointerId);
    draw();
  });
  canvas.addEventListener('pointermove', event => {
    if (pointerId !== event.pointerId || !stroke) return;
    event.preventDefault();
    const p = point(event), last = stroke.at(-1);
    if (Math.hypot((p.x - last.x) * canvas.clientWidth, (p.y - last.y) * canvas.clientHeight) > 3) {
      stroke.push(p); draw();
    }
  });
  canvas.addEventListener('pointerup', event => {
    if (pointerId !== event.pointerId || !stroke) return;
    event.preventDefault();
    const p = point(event);
    if (stroke.length > 1) { stroke.push(p); draw(); }
    respond(stroke.length > 3 ? stroke[0] : p);
    pointerId = null;
  });
  canvas.addEventListener('pointercancel', () => { pointerId = null; stroke = null; draw(); });
  canvas.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); respond({x:.66,y:.62}); }
  });
  screen.onclick = () => setMode('screen');
  camera.onclick = () => setMode('camera');
  speak.onclick = () => {
    if (!spoken || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = 'ja-JP'; utterance.rate = .96;
    speechSynthesis.speak(utterance);
  };
  addEventListener('resize', resize);
  resize();
})();