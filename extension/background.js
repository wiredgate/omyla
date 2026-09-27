chrome.action.onClicked.addListener(async tab => {
  if (!tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'omyla-toggle' });
  } catch (error) {
    console.warn('OMYLA could not open on this tab:', error);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'omyla-browser-guide') {
    if (!sender.tab?.id || !message.payload || typeof message.payload.goal !== 'string' || message.payload.goal.length > 1500) return;
    fetch('https://omyla.uwaaa.com/api/browser-guide', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.payload), signal: AbortSignal.timeout(45000)
    }).then(async response => {
      const data = await response.json();
      sendResponse(response.ok ? { ok: true, data } : { ok: false, error: data.message || '案内を取得できなかった。' });
    }).catch(() => sendResponse({ ok: false, error: '接続できなかった。少し待って再試行してね。' }));
    return true;
  }
  if (message?.type !== 'omyla-handoff' || !sender.tab?.id) return;
  const payload = message.payload;
  if (!payload || typeof payload !== 'object' || typeof payload.goal !== 'string' || payload.goal.length > 1500) return;
  const encoded = encodeURIComponent(JSON.stringify(payload));
  if (encoded.length > 7500) return;
  chrome.tabs.create({ url: `https://omyla.uwaaa.com/app/#omyla=${encoded}` });
});
