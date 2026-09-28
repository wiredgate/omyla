(() => {
  const world = document.getElementById('world');
  const ink = document.getElementById('world-ink');
  const ctx = ink.getContext('2d');
  const video = document.getElementById('world-video');
  const target = document.getElementById('world-target');
  const reply = document.getElementById('world-reply');
  const replyText = document.getElementById('world-reply-text');
  const hear = document.getElementById('world-hear');
  const guide = document.getElementById('world-guide-text');
  const pageButton = document.getElementById('source-page');
  const cameraButton = document.getElementById('source-camera');
  const screenButton = document.getElementById('source-screen');
  const stopButton = document.getElementById('source-stop');
  let stream = null, source = 'page', points = null, pointer = null, spoken = '', generation = 0;

  function sizeInk() {
    const box = ink.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 2);
    ink.width = Math.round(box.width * ratio);
    ink.height = Math.round(box.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    points = null;
  }
  function position(event) {
    const box = ink.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)), y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)) };
  }
  function paint() {
    const box = ink.getBoundingClientRect();
    ctx.clearRect(0, 0, box.width, box.height);
    if (!points || points.length < 2) return;
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x * box.width, p.y * box.height) : ctx.moveTo(p.x * box.width, p.y * box.height));
    ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = '#e1ffad'; ctx.shadowColor = '#c7ff93'; ctx.shadowBlur = 28; ctx.stroke(); ctx.shadowBlur = 0;
  }
  function show(p) {
    const x = Math.max(.1, Math.min(.9, p.x)), y = Math.max(.18, Math.min(.77, p.y));
    const field = ink.getBoundingClientRect(), boundary = world.getBoundingClientRect();
    const px = field.left - boundary.left + x * field.width;
    const py = field.top - boundary.top + y * field.height;
    target.style.left = px + 'px'; target.style.top = py + 'px';
    target.hidden = false;
    reply.style.left = Math.max(12, Math.min(boundary.width - Math.min(385, boundary.width * .75) - 12, px - 35)) + 'px';
    reply.style.top = Math.max(90, Math.min(boundary.height - 140, py + 45)) + 'px';
    reply.hidden = false;
    reply.classList.remove('appear'); void reply.offsetWidth; reply.classList.add('appear');
    const message = source === 'page'
      ? 'そこを指してくれたね。実際のアプリなら、見えている画面とその位置をAIに渡して説明するよ。'
      : '映像のこの位置を指してくれたね。実際のアプリでは、質問した瞬間の画像をAIが読み取るよ。';
    replyText.textContent = message; spoken = message;
    hear.hidden = !('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
    guide.textContent = '今の「ここ」が、AIへの入力になる。';
  }
  ink.addEventListener('pointerdown', event => {
    event.preventDefault();
    pointer = event.pointerId;
    points = [position(event)];
    target.hidden = true; reply.hidden = true;
    ink.setPointerCapture(pointer);
    paint();
  });
  ink.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer || !points) return;
    event.preventDefault();
    const p = position(event), last = points.at(-1);
    if (Math.hypot((p.x - last.x) * ink.clientWidth, (p.y - last.y) * ink.clientHeight) > 3) { points.push(p); paint(); }
  });
  ink.addEventListener('pointerup', event => {
    if (event.pointerId !== pointer || !points) return;
    event.preventDefault();
    const p = position(event);
    if (points.length > 1) { points.push(p); paint(); }
    show(points.length > 3 ? points[0] : p);
    pointer = null;
  });
  ink.addEventListener('pointercancel', () => { pointer = null; points = null; paint(); });
  ink.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); show({ x: .57, y: .43 }); }
  });
  hear.onclick = () => {
    if (!spoken || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = 'ja-JP'; speechSynthesis.speak(utterance);
  };
  function displaySource(kind) {
    source = kind;
    for (const [button, name] of [[pageButton,'page'],[cameraButton,'camera'],[screenButton,'screen']]) {
      button.classList.toggle('selected',name===kind);
      button.setAttribute('aria-pressed',String(name===kind));
    }
    stopButton.hidden = kind === 'page';
    world.classList.toggle('using-video',kind !== 'page');
    world.classList.toggle('screen-share',kind === 'screen');
    target.hidden = true; reply.hidden = true; points = null; paint();
    guide.textContent = kind === 'page' ? 'どこでも指すか、丸を描いてみて。' : 'あなたの映像に直接、丸を描いてみて。';
  }
  function stopStream() {
    generation++;
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null; video.pause(); video.srcObject = null; video.hidden = true;
    displaySource('page');
  }
  async function open(kind) {
    stopStream();
    const token = generation;
    if (!navigator.mediaDevices) { guide.textContent = 'このブラウザでは映像を利用できない。'; return; }
    try {
      const opened = kind === 'camera'
        ? await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      if (document.hidden || token !== generation) { opened.getTracks().forEach(track => track.stop()); return; }
      stream = opened;
      opened.getVideoTracks()[0]?.addEventListener('ended', stopStream, { once: true });
      video.srcObject = opened; video.hidden = false;
      await video.play();
      displaySource(kind);
    } catch { if (token === generation) { stopStream(); guide.textContent = '許可されなかったため、このページのキャンバスに戻したよ。'; } }
  }
  pageButton.onclick = stopStream;
  cameraButton.onclick = () => void open('camera');
  screenButton.onclick = () => void open('screen');
  stopButton.onclick = stopStream;
  document.addEventListener('visibilitychange', () => { if (document.hidden && stream) stopStream(); });
  addEventListener('pagehide', stopStream);
  addEventListener('resize', sizeInk);
  sizeInk();
})();