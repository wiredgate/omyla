chrome.action.onClicked.addListener(async tab => {
  if (!tab.id || !/^https?:\/\//.test(tab.url || '')) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  } catch (error) {
    console.warn('OMYLA could not open on this tab:', error);
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'omyla-handoff' || !sender.tab?.id) return;
  const payload = message.payload;
  if (!payload || typeof payload !== 'object' || typeof payload.goal !== 'string' || payload.goal.length > 1500) return;
  const encoded = encodeURIComponent(JSON.stringify(payload));
  if (encoded.length > 7500) return;
  chrome.tabs.create({ url: `https://omyla.uwaaa.com/#omyla=${encoded}` });
});
