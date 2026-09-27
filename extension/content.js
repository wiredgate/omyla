(() => {
  if (document.getElementById('omyla-overlay-root')) return;
  const host = document.createElement('div'); host.id = 'omyla-overlay-root';
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none';
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `<style>
    *{box-sizing:border-box}canvas{display:none;position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;touch-action:none;cursor:crosshair}:host(.open) canvas{display:block;pointer-events:auto}
    .launcher{position:fixed;right:16px;bottom:16px;width:48px;height:48px;border:1px solid #c2e9cb;border-radius:50%;background:radial-gradient(circle at 28% 22%,#edffe0,#9de2b7 48%,#346963);color:#14271e;box-shadow:0 7px 23px #0007;pointer-events:auto;font:900 19px system-ui,sans-serif;cursor:pointer}.launcher:focus-visible{outline:3px solid #fff;outline-offset:3px}
    .panel{position:fixed;right:16px;bottom:76px;width:min(370px,calc(100vw - 32px));padding:15px;border:1px solid #455953;border-radius:16px;background:#171e1eee;color:#edf4ee;box-shadow:0 12px 45px #0008;font:13px/1.5 system-ui,sans-serif;pointer-events:auto;backdrop-filter:blur(16px)}.panel[hidden]{display:none}
    .head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.head b{font-size:17px;letter-spacing:-.04em}button{cursor:pointer;border:1px solid #5a6b62;border-radius:8px;background:#29352f;color:#edf4ee;padding:7px 10px;font:inherit}button.on{background:#d4f5d9;color:#14241b}button:hover{border-color:#d4f5d9}textarea{width:100%;height:64px;resize:vertical;border:1px solid #56645d;border-radius:8px;background:#101a16;color:#fff;padding:9px;font:inherit}.row{display:flex;gap:6px;margin:8px 0}.row label{margin-left:auto;align-self:center}.row select{background:#29352f;color:#fff;border:1px solid #56645d;border-radius:6px;padding:4px}.preview{min-height:22px;color:#c9eecf;margin:8px 0;overflow-wrap:anywhere}.send{width:100%;background:#d4f5d9;color:#14241b;font-weight:700}
    .guide-ring{position:fixed;width:34px;height:34px;border:3px solid #c8f395;border-radius:50%;box-shadow:0 0 0 5px #c8f39555,0 0 18px #203f1d;transform:translate(-50%,-50%);pointer-events:none}.guide-ring[hidden],.guide-card[hidden]{display:none}.guide-card{position:fixed;width:min(330px,calc(100vw - 24px));max-height:min(310px,55vh);overflow:auto;padding:14px;border:1px solid #b5eabc;border-radius:14px;background:#19251ff5;color:#f2fff1;box-shadow:0 12px 35px #000a;font:13px/1.5 system-ui,sans-serif;pointer-events:auto}.guide-card p{white-space:pre-wrap;overflow-wrap:anywhere}.guide-actions{display:flex;gap:8px;justify-content:flex-end}.guide-actions button{background:#d4f5d9;color:#14241b}
  </style><canvas></canvas><button class="launcher" id="launcher" aria-label="OMYLAを開く" aria-expanded="false">O</button><div class="panel" id="panel" role="dialog" aria-label="OMYLAの画面指示" hidden><div class="head"><b>OMYLA<span style="color:#b7e7b8">.</span></b><button id="close" aria-label="閉じる">×</button></div><div class="row"><button id="point" class="on">指す</button><button id="draw">描く</button><button id="clear">消す</button><label>最後の線 <select id="kind" disabled><option value="auto">自動</option><option value="circle">丸</option><option value="arrow">矢印</option><option value="line">線</option></select></label></div><div class="preview" id="preview">ページ上をクリックするか、描いて対象を選んでね。</div><textarea id="goal" maxlength="1500" placeholder="ここをどうしたい？"></textarea><button id="send" class="send">このページで教えて</button><button id="handoff" style="margin-top:8px;width:100%">詳細を開く ↗</button></div><div id="guide-ring" class="guide-ring" hidden></div><div id="guide-card" class="guide-card" role="status" hidden><b id="guide-heading"></b><p id="guide-text"></p><div class="guide-actions"><button id="guide-speak" aria-label="この手順を読み上げる">🔊</button><button id="guide-prev">戻る</button><button id="guide-next">次へ</button><button id="guide-stop">閉じる</button></div></div>`;
  document.documentElement.append(host);
  const $ = selector => shadow.querySelector(selector);
  const canvas = $('canvas'), ctx = canvas.getContext('2d');
  let mode = 'point', marks = [], strokes = [], active = false, stroke = [], override = 'auto';
  let guide = [], guideIndex = 0, guideMarks = [], requestId = 0;
  function setOpen(open) { host.classList.toggle('open', open); $('#panel').hidden = !open; $('#launcher').setAttribute('aria-expanded', String(open)); $('#launcher').setAttribute('aria-label', open ? 'OMYLAを閉じる' : 'OMYLAを開く'); if (open) redraw(); }
  $('#launcher').onclick = () => setOpen(!host.classList.contains('open'));
  chrome.runtime.onMessage.addListener(message => { if (message?.type === 'omyla-toggle') setOpen(!host.classList.contains('open')); });
  $('#close').onclick = () => setOpen(false);
  shadow.addEventListener('keydown', event => { if (event.key === 'Escape') { setOpen(false); $('#launcher').focus(); } });
  const pos = event => ({ x: Math.max(0, Math.min(1, event.clientX / innerWidth)), y: Math.max(0, Math.min(1, event.clientY / innerHeight)) });
  const label = node => {
    if (!node || node.closest('input,textarea,select,[contenteditable],form')) return '';
    const el = node.closest('h1,h2,h3,p,button,a,li,img,[role="button"]');
    if (!el) return '';
    return (el.getAttribute?.('alt') || el.getAttribute?.('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160);
  };
  const elementAt = p => {
    canvas.style.pointerEvents = 'none'; host.style.pointerEvents = 'none';
    const found = document.elementFromPoint(p.x * innerWidth, p.y * innerHeight);
    host.style.pointerEvents = 'none'; canvas.style.pointerEvents = 'auto';
    return found?.closest('#omyla-overlay-root') ? null : found;
  };
  const targetsIn = box => {
    const nodes = [...document.querySelectorAll('h1,h2,h3,p,button,a,li,img,[role="button"]')].slice(0, 2000);
    return [...new Set(nodes.filter(node => !node.closest('form,[contenteditable]')).filter(node => {
      const r = node.getBoundingClientRect(), cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
      return r.width > 0 && r.height > 0 && cx >= box.x * innerWidth && cx <= (box.x + box.width) * innerWidth && cy >= box.y * innerHeight && cy <= (box.y + box.height) * innerHeight;
    }).map(label).filter(Boolean))].slice(0, 4);
  };
  const classify = points => {
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const box = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    const distance = (a, b) => Math.hypot((a.x - b.x) * innerWidth, (a.y - b.y) * innerHeight);
    const diagonal = Math.hypot(box.width * innerWidth, box.height * innerHeight);
    const length = points.slice(1).reduce((n, p, i) => n + distance(p, points[i]), 0);
    let kind = 'line', tip = points.at(-1);
    if (diagonal > 30 && length > diagonal * 1.8 && distance(points[0], tip) < Math.max(25, diagonal * .2)) kind = 'circle';
    else if (points.length > 5 && diagonal > 35) {
      let far = 0; for (let i = 1; i < points.length; i++) if (distance(points[0], points[i]) > distance(points[0], points[far])) far = i;
      const apex = points[far], retreat = distance(apex, tip), barb = distance(apex, points.at(-2));
      if (far > points.length * .55 && far < points.length - 2 && (retreat > 12 && retreat < diagonal * .45 || retreat < 15 && barb > 12 && barb < diagonal * .45)) { kind = 'arrow'; tip = apex; }
    }
    return { kind, box, tip };
  };
  function redraw() { const dpr = devicePixelRatio || 1; canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.strokeStyle = '#c8f395'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; for (const line of [...strokes, stroke]) { if (!line.length) continue; ctx.beginPath(); line.forEach((p, i) => i ? ctx.lineTo(p.x * innerWidth, p.y * innerHeight) : ctx.moveTo(p.x * innerWidth, p.y * innerHeight)); ctx.stroke(); } for (const mark of marks.filter(x => x.kind === 'point')) { ctx.beginPath(); ctx.arc(mark.tip.x * innerWidth, mark.tip.y * innerHeight, 11, 0, Math.PI * 2); ctx.stroke(); } }
  function refresh() { const latest = marks.at(-1); $('#preview').textContent = latest ? `${{ point:'指した場所',circle:'丸の範囲',arrow:'矢印の先',line:'線の終点' }[latest.kind]}: ${latest.target || '文字のない場所'}${marks.length > 1 ? ` · 他${marks.length - 1}件` : ''}` : 'ページ上をクリックするか、描いて対象を選んでね。'; }
  function updateLast() { const m = marks.at(-1); if (!m || !strokes.length) return; const shape = classify(strokes.at(-1)); m.kind = override === 'auto' ? shape.kind : override; m.tip = shape.tip; m.box = shape.box; m.target = m.kind === 'circle' ? targetsIn(shape.box).join(' / ') : label(elementAt(shape.tip)); refresh(); }
  canvas.addEventListener('pointerdown', event => { event.preventDefault(); canvas.setPointerCapture(event.pointerId); if (mode === 'point') { const p = pos(event); marks.push({ kind:'point', target:label(elementAt(p)), tip:p }); marks = marks.slice(-8); refresh(); redraw(); return; } active = true; stroke = [pos(event)]; redraw(); });
  canvas.addEventListener('pointermove', event => { if (active) { stroke.push(pos(event)); redraw(); } });
  canvas.addEventListener('pointerup', event => { if (!active) return; active = false; stroke.push(pos(event)); strokes.push(stroke); stroke = []; override = 'auto'; $('#kind').value = 'auto'; $('#kind').disabled = false; marks.push({ kind:'line', target:'', tip:null, box:null }); marks = marks.slice(-8); updateLast(); redraw(); });
  $('#point').onclick = () => { mode = 'point'; $('#point').classList.add('on'); $('#draw').classList.remove('on'); };
  $('#draw').onclick = () => { mode = 'draw'; $('#draw').classList.add('on'); $('#point').classList.remove('on'); };
  $('#clear').onclick = () => { ++requestId; stopGuide(); marks = []; strokes = []; $('#kind').disabled = true; redraw(); refresh(); };
  $('#kind').onchange = event => { override = event.target.value; updateLast(); };
  function payload() {
    const goal = $('#goal').value.trim();
    if (!goal) { $('#goal').focus(); return null; }
    return { goal, context: { surface: { kind:'browser-tab', host:location.hostname.slice(0, 120), title:document.title.slice(0, 160) }, targets:[...new Set(marks.map(m => m.target).filter(Boolean))].slice(0, 6), marks:marks.slice(0, 8) } };
  }
  function stopGuide() { speechSynthesis.cancel(); guide = []; $('#guide-ring').hidden = true; $('#guide-card').hidden = true; }
  function showGuide() {
    const step = guide[guideIndex], mark = guideMarks.at(-1);
    if (!step) return stopGuide();
    $('#guide-heading').textContent = step.name + ' · ' + (guideIndex + 1) + '/' + guide.length;
    $('#guide-text').textContent = step.text;
    $('#guide-next').textContent = guideIndex === guide.length - 1 ? '完了' : '次へ';
    $('#guide-prev').disabled = guideIndex === 0;
    const tip = mark?.tip || (mark?.box && { x: mark.box.x + mark.box.width / 2, y: mark.box.y + mark.box.height / 2 });
    $('#guide-ring').hidden = !tip;
    if (tip) { $('#guide-ring').style.left = (tip.x * innerWidth) + 'px'; $('#guide-ring').style.top = (tip.y * innerHeight) + 'px'; }
    $('#guide-card').style.left = Math.max(12, Math.min(innerWidth - 342, (tip?.x || .5) * innerWidth + 34)) + 'px';
    $('#guide-card').style.top = Math.max(12, Math.min(innerHeight - 320, (tip?.y || .2) * innerHeight + 24)) + 'px';
    $('#guide-card').hidden = false;
  }
  $('#guide-next').onclick = () => { speechSynthesis.cancel(); if (++guideIndex < guide.length) showGuide(); else stopGuide(); };
  $('#guide-prev').onclick = () => { if (guideIndex > 0) { speechSynthesis.cancel(); --guideIndex; showGuide(); } };
  $('#guide-speak').onclick = () => {
    const step = guide[guideIndex]; if (!step || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(step.text);
    utterance.lang = 'ja-JP'; utterance.rate = 1;
    speechSynthesis.speak(utterance);
  };
  $('#guide-stop').onclick = stopGuide;
  $('#send').onclick = async () => {
    const data = payload(); if (!data) return;
    const id = ++requestId, page = location.href, scroll = [scrollX, scrollY];
    stopGuide();
    $('#send').disabled = true;
    $('#preview').textContent = '案内を考えているよ…';
    try {
      const result = await chrome.runtime.sendMessage({ type:'omyla-browser-guide', payload:data });
      if (id !== requestId) return;
      if (location.href !== page || scrollX !== scroll[0] || scrollY !== scroll[1]) {
        $('#preview').textContent = '画面が変わったので、もう一度対象を指してね。'; return;
      }
      if (!result?.ok) { $('#preview').textContent = result?.error || '案内を取得できなかった。'; return; }
      guide = (result.data?.steps || []).filter(x => x && typeof x.text === 'string' && typeof x.name === 'string');
      if (!guide.length) { $('#preview').textContent = '案内を取得できなかった。'; return; }
      guideMarks = data.context.marks;
      guideIndex = 0; setOpen(false); showGuide();
    } catch { $('#preview').textContent = '接続できなかった。少し待って再試行してね。'; }
    finally { $('#send').disabled = false; }
  };
  $('#handoff').onclick = () => {
    const data = payload(); if (!data) return;
    chrome.runtime.sendMessage({ type:'omyla-handoff', payload:data }); host.remove();
  };
  addEventListener('resize', () => { stopGuide(); redraw(); }, { passive:true });
  addEventListener('scroll', () => { ++requestId; stopGuide(); marks = []; strokes = []; $('#kind').disabled = true; redraw(); refresh(); }, { passive:true });
  redraw();
})();
