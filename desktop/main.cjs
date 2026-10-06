const { app, BrowserWindow, ipcMain, screen, shell, desktopCapturer, globalShortcut, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const { installDesktopTasks } = require('./desktop-task.cjs');
let desktopTasks;

const compact = { width: 104, height: 118 };
const expanded = { width: 500, height: 650 };
let win;
let open = false;
let anchor;
let launchOnLogin = true;
let selectedDisplayId;
let inkWin;
let selectedMarks = [];
let selectedPaths = [];
let selectedCanvas;
let passiveWin;
let handleWins = [];
const handleDrags = new Map();
let guideWin;
let guideSteps = [];
let guideIndex = 0;
let guideDisplay;
let guideBusy = false;
let computerBusy = false;
let guideFingerprint;
let guideCapturedAt = 0;
let lastExchange;
let guideMute = false;
let draggingPresence = false;
let wanderEnabled = true;
let wanderTarget;
let wanderPauseUntil = Date.now() + 6000;
let walking = false;
let wanderTimer;

function stopDrawing() {
  for (const handle of handleWins) if (!handle.isDestroyed()) handle.close();
  handleWins = []; handleDrags.clear();
  if (passiveWin && !passiveWin.isDestroyed()) passiveWin.close();
  passiveWin = undefined;
}
function drawingDisplay() {
  return screen.getAllDisplays().find(display => String(display.id) === selectedCanvas?.displayId);
}
function renderDrawing() {
  if (!passiveWin || passiveWin.isDestroyed()) return;
  passiveWin.webContents.send('drawing:update', { paths: selectedPaths, marks: selectedMarks });
  const display = drawingDisplay();
  if (!display) { stopDrawing(); return; }
  const bounds = display.bounds;
  handleWins.forEach((handle, index) => {
    if (handle.isDestroyed() || !selectedMarks[index]) return;
    const tip = selectedMarks[index].tip;
    handle.setPosition(Math.round(bounds.x + tip.x * bounds.width - 15), Math.round(bounds.y + tip.y * bounds.height - 15));
  });
}
function createDrawing() {
  stopDrawing();
  if (!selectedMarks.length) return;
  const display = drawingDisplay();
  if (!display) return;
  passiveWin = new BrowserWindow({ ...display.bounds, frame: false, transparent: true, alwaysOnTop: true,
    skipTaskbar: true, focusable: false, resizable: false, movable: false, hasShadow: false,
    backgroundColor: '#00000000', show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'passive-preload.cjs') } });
  passiveWin.setIgnoreMouseEvents(true);
  passiveWin.webContents.on('will-navigate', e => e.preventDefault());
  passiveWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  passiveWin.webContents.once('did-finish-load', () => { renderDrawing(); passiveWin?.showInactive(); });
  passiveWin.loadFile(path.join(__dirname, 'passive.html'));
  handleWins = selectedMarks.map(mark => {
    const handle = new BrowserWindow({ width: 30, height: 30, frame: false, transparent: true, alwaysOnTop: true,
      skipTaskbar: true, resizable: false, hasShadow: false, backgroundColor: '#00000000', show: false,
      webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'handle-preload.cjs') } });
    handle.webContents.on('will-navigate', e => e.preventDefault());
    handle.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    handle.webContents.once('did-finish-load', () => { renderDrawing(); if (!handle.isDestroyed()) handle.showInactive(); });
    handle.loadFile(path.join(__dirname, 'handle.html'));
    return handle;
  });
}
function hideDrawing() {
  if (passiveWin && !passiveWin.isDestroyed()) passiveWin.hide();
  for (const handle of handleWins) if (!handle.isDestroyed()) handle.hide();
}
function restoreDrawing() {
  if (passiveWin && !passiveWin.isDestroyed()) passiveWin.showInactive();
  for (const handle of handleWins) if (!handle.isDestroyed()) handle.showInactive();
}

function stopGuide() {
  guideSteps = []; guideDisplay = undefined; guideIndex = 0;
  guideMute = false;
  guideFingerprint = undefined; guideCapturedAt = 0;
  if (guideWin && !guideWin.isDestroyed()) guideWin.close();
  guideWin = undefined;
}
function renderGuide() {
  if (!guideWin || guideWin.isDestroyed()) return;
  guideWin.webContents.send('guide:step', { step: guideSteps[guideIndex], index: guideIndex, total: guideSteps.length, mute: guideMute });
}
function startGuide(display, steps, mute = false) {
  stopGuide();
  guideMute = mute;
  guideDisplay = { id: display.id, bounds: { ...display.bounds } };
  guideSteps = steps; guideIndex = 0;
  guideWin = new BrowserWindow({ ...display.bounds, frame: false, transparent: true, alwaysOnTop: true,
    skipTaskbar: true, focusable: false, resizable: false, movable: false, hasShadow: false,
    backgroundColor: '#00000000', show: false,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, preload: path.join(__dirname, 'guide-preload.cjs') } });
  guideWin.setIgnoreMouseEvents(true, { forward: true });
  guideWin.webContents.on('will-navigate', event => event.preventDefault());
  guideWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  guideWin.webContents.once('did-finish-load', () => { if (guideWin && !guideWin.isDestroyed()) { renderGuide(); guideWin.showInactive(); } });
  guideWin.on('closed', () => { guideWin = undefined; });
  guideWin.loadFile(path.join(__dirname, 'guide.html'));
}


function configureLogin(enabled) {
  if (!app.isPackaged || !['win32', 'darwin'].includes(process.platform)) return false;
  app.setLoginItemSettings({ openAtLogin: enabled });
  return app.getLoginItemSettings().openAtLogin;
}

function loadPreferences() {
  const filename = path.join(app.getPath('userData'), 'presence.json');
  try { launchOnLogin = JSON.parse(fs.readFileSync(filename, 'utf8')).launchOnLogin !== false; } catch { launchOnLogin = true; }
  configureLogin(launchOnLogin);
}

function activeDisplay() { return screen.getAllDisplays().find(display => display.id === selectedDisplayId) || screen.getDisplayNearestPoint(anchor); }
function displayInfo(display) { return { id: String(display.id), bounds: display.bounds, scaleFactor: display.scaleFactor }; }
function place(size) {
  const display = activeDisplay();
  const area = display.workArea;
  return { width: size.width, height: size.height,
    x: Math.round(Math.max(area.x, Math.min(area.x + area.width - size.width, anchor.x - size.width))),
    y: Math.round(Math.max(area.y, Math.min(area.y + area.height - size.height, anchor.y - size.height))) };
}
function shapePresence() {
  if (process.platform !== 'win32' || !win || win.isDestroyed()) return;
  // Native hit testing lets clicks and touch outside Mia reach the app underneath.
  win.setShape(open ? [] : [
    { x: 24, y: 10, width: 56, height: 6 },
    { x: 15, y: 16, width: 74, height: 8 },
    { x: 11, y: 24, width: 82, height: 62 },
    { x: 16, y: 86, width: 72, height: 14 },
    { x: 8, y: 100, width: 88, height: 10 }
  ]);
}

function movePhysicalCursor(point) {
  if (process.platform !== 'win32') return Promise.resolve(false);
  const x = Math.round(point.x), y = Math.round(point.y);
  if (![x, y].every(Number.isSafeInteger)) return Promise.resolve(false);
  const script = `Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class OmylaCursor {
  [DllImport("user32.dll", SetLastError=true)]
  public static extern bool SetPhysicalCursorPos(int x, int y);
}
'@
if (-not [OmylaCursor]::SetPhysicalCursorPos(${x}, ${y})) { exit 1 }`;
  return new Promise(resolve => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand',
      Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true });
    let done = false;
    const finish = result => { if (!done) { done = true; resolve(result); } };
    const timer = setTimeout(() => { child.kill(); finish(false); }, 5000);
    child.once('error', () => { clearTimeout(timer); finish(false); });
    child.once('close', code => { clearTimeout(timer); finish(code === 0); });
  });
}


function targetChanged(original, latest, step) {
  if (!original || original.length !== latest.length) return true;
  const width = 320, height = 180;
  const cx = Math.round(step.x * (width - 1)), cy = Math.round(step.y * (height - 1));
  let changed = 0, count = 0;
  for (let dy = -8; dy <= 8; dy += 2) for (let dx = -8; dx <= 8; dx += 2) {
    const x = Math.max(0, Math.min(width - 1, cx + dx)), y = Math.max(0, Math.min(height - 1, cy + dy));
    const i = (y * width + x) * 4;
    const difference = Math.abs(original[i] - latest[i]) + Math.abs(original[i + 1] - latest[i + 1]) + Math.abs(original[i + 2] - latest[i + 2]);
    if (difference > 75) changed++;
    count++;
  }
  return changed > count * .12;
}
function clickPhysicalPoint(point) {
  if (process.platform !== 'win32') return Promise.resolve(false);
  const x = Math.round(point.x), y = Math.round(point.y);
  if (![x, y].every(Number.isSafeInteger)) return Promise.resolve(false);
  const script = `Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class OmylaClick {
  [StructLayout(LayoutKind.Sequential)]
  public struct MouseInput {
    public int dx, dy;
    public uint mouseData, dwFlags, time;
    public IntPtr dwExtraInfo;
  }
  [StructLayout(LayoutKind.Explicit, Size=40)]
  public struct Input {
    [FieldOffset(0)] public int type;
    [FieldOffset(8)] public MouseInput mouse;
  }
  [DllImport("user32.dll", SetLastError=true)]
  public static extern bool SetPhysicalCursorPos(int x, int y);
  [DllImport("user32.dll", SetLastError=true)]
  public static extern uint SendInput(uint count, Input[] inputs, int size);
  public static bool Click(int x, int y) {
    if (!SetPhysicalCursorPos(x, y)) return false;
    Input down = new Input { type=0, mouse=new MouseInput { dwFlags=2 } };
    Input up = new Input { type=0, mouse=new MouseInput { dwFlags=4 } };
    return SendInput(2, new Input[] { down, up }, Marshal.SizeOf(typeof(Input))) == 2;
  }
}
'@
if (-not [OmylaClick]::Click(${x}, ${y})) { exit 1 }`;
  return new Promise(resolve => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand',
      Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true });
    let finished = false;
    const finish = value => { if (!finished) { finished = true; resolve(value); } };
    const timer = setTimeout(() => { child.kill(); finish(false); }, 5000);
    child.once('error', () => { clearTimeout(timer); finish(false); });
    child.once('close', code => { clearTimeout(timer); finish(code === 0); });
  });
}

function togglePresence(followCursor = false) {
  if (!win || win.isDestroyed() || inkWin || computerBusy) return;
  if (!open && followCursor) {
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    selectedDisplayId = display.id;
    const area = display.workArea;
    anchor = { x: area.x + area.width - 12, y: area.y + area.height - 12 };
    stopDrawing(); selectedMarks = []; selectedPaths = []; selectedCanvas = undefined;
  }
  open = !open;
  wanderTarget = undefined;
  wanderPauseUntil = Date.now() + 3000;
  setWalking(false);
  win.setBounds(place(open ? expanded : compact));
  shapePresence();
  if (open) { win.show(); win.focus(); }
}

function setWalking(value) {
  if (walking === value) return;
  walking = value;
  if (win && !win.isDestroyed()) win.webContents.send('overlay:walking', value);
}
function wanderTick() {
  if (!wanderEnabled || !win || win.isDestroyed() || !win.isVisible() ||
      open || draggingPresence || inkWin || guideBusy || computerBusy) {
    setWalking(false);
    return;
  }
  const area = activeDisplay().workArea;
  const bounds = win.getBounds();
  if (bounds.width !== compact.width || bounds.height !== compact.height) return;
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const pointer = screen.getCursorScreenPoint();
  if (pointer.x >= bounds.x - 90 && pointer.x <= bounds.x + bounds.width + 90 &&
      pointer.y >= bounds.y - 90 && pointer.y <= bounds.y + bounds.height + 90) {
    wanderPauseUntil = Date.now() + 1200;
    setWalking(false);
    return;
  }
  if (Date.now() < wanderPauseUntil) { setWalking(false); return; }
  if (!wanderTarget) {
    const dx = (Math.random() < .5 ? -1 : 1) * (100 + Math.random() * 220);
    const dy = (Math.random() - .5) * 260;
    wanderTarget = {
      x: Math.round(clamp(bounds.x + dx, area.x, area.x + area.width - compact.width)),
      y: Math.round(clamp(bounds.y + dy, area.y, area.y + area.height - compact.height))
    };
  }
  const dx = wanderTarget.x - bounds.x, dy = wanderTarget.y - bounds.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 3) {
    wanderTarget = undefined;
    wanderPauseUntil = Date.now() + 1400 + Math.random() * 2600;
    setWalking(false);
    return;
  }
  const x = Math.round(clamp(bounds.x + dx / distance * 2, area.x, area.x + area.width - compact.width));
  const y = Math.round(clamp(bounds.y + dy / distance * 2, area.y, area.y + area.height - compact.height));
  if (x === bounds.x && y === bounds.y) {
    wanderTarget = undefined;
    wanderPauseUntil = Date.now() + 1800;
    setWalking(false);
    return;
  }
  win.setPosition(x, y);
  anchor = { x: x + compact.width, y: y + compact.height };
  setWalking(true);
}

function movePresence(point) {
  if (!draggingPresence || open || !win || win.isDestroyed()) return false;
  if (!point || ![point.x, point.y].every(Number.isFinite)) return false;
  const display = screen.getDisplayNearestPoint(point);
  const area = display.workArea;
  const x = Math.round(Math.max(area.x, Math.min(area.x + area.width - compact.width, point.x - compact.width / 2)));
  const y = Math.round(Math.max(area.y, Math.min(area.y + area.height - compact.height, point.y - compact.height / 2)));
  win.setPosition(x, y);
  wanderTarget = undefined;
  setWalking(false);
  selectedDisplayId = display.id;
  anchor = { x: x + compact.width, y: y + compact.height };
  return true;
}

function create() {
  const area = screen.getPrimaryDisplay().workArea;
  selectedDisplayId = screen.getPrimaryDisplay().id;
  anchor = { x: area.x + area.width - 12, y: area.y + area.height - 12 };
  win = new BrowserWindow({
    ...place(compact), frame: false, transparent: true, alwaysOnTop: true,
    skipTaskbar: true, resizable: false, maximizable: false, minimizable: false,
    hasShadow: false, backgroundColor: '#00000000', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false }
  });
  const microphoneAllowed = (contents, permission, details) =>
    contents === win.webContents && permission === 'media' &&
    details?.isMainFrame !== false &&
    (!details?.mediaTypes || details.mediaTypes.length === 1 && details.mediaTypes[0] === 'audio');
  win.webContents.session.setPermissionCheckHandler((contents, permission, _origin, details) =>
    microphoneAllowed(contents, permission, details));
  win.webContents.session.setPermissionRequestHandler((contents, permission, callback, details) =>
    callback(microphoneAllowed(contents, permission, details)));
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('context-menu', () => {
    if (!open) Menu.buildFromTemplate([{ label: 'OMYLAを終了', click: () => app.quit() }]).popup({ window: win });
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  shapePresence();
  win.once('ready-to-show', () => win.show());
}

function authorized(event) { return win && !win.isDestroyed() && event.sender === win.webContents; }
ipcMain.handle('overlay:toggle', event => {
  if (!authorized(event)) return false;
  togglePresence();
  return open;
});
ipcMain.handle('overlay:drag-start', event => { if (!authorized(event) || computerBusy || open) return false; draggingPresence = true; wanderTarget = undefined; setWalking(false); return true; });
ipcMain.handle('overlay:drag-move', (event, point) => authorized(event) ? movePresence(point) : false);
ipcMain.handle('overlay:drag-end', event => { if (!authorized(event)) return false; draggingPresence = false; wanderPauseUntil = Date.now() + 6000; return true; });
ipcMain.handle('overlay:set-wander', (event, enabled) => { if (!authorized(event) || typeof enabled !== 'boolean') return false; wanderEnabled = enabled; wanderTarget = undefined; setWalking(false); return true; });
ipcMain.handle('overlay:close', event => {
  if (!authorized(event)) return;
  if (open) { open = false; win.setBounds(place(compact)); }
  shapePresence();
});
ipcMain.handle('overlay:displays', event => authorized(event) ? { selected: String(activeDisplay().id), displays: screen.getAllDisplays().map(displayInfo) } : null);
ipcMain.handle('overlay:select-display', (event, id) => {
  if (!authorized(event) || computerBusy || inkWin || guideBusy || typeof id !== 'string') return false;
  const display = screen.getAllDisplays().find(item => String(item.id) === id);
  if (!display) return false;
  stopGuide();
  selectedDisplayId = display.id;
  const area = display.workArea;
  anchor = { x: area.x + area.width - 12, y: area.y + area.height - 12 };
  stopDrawing(); selectedMarks = []; selectedPaths = []; selectedCanvas = undefined;
  wanderTarget = undefined;
  wanderPauseUntil = Date.now() + 3000;
  win.setBounds(place(open ? expanded : compact));
  shapePresence();
  return true;
});
ipcMain.handle('overlay:preview-screen', async event => {
  if (!authorized(event) || computerBusy || inkWin || guideBusy) return null;
  const displayId = String(activeDisplay().id);
  if (guideWin && !guideWin.isDestroyed()) guideWin.hide();
  hideDrawing();
  win.hide();
  try {
    await new Promise(resolve => setTimeout(resolve, 150));
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } });
    const source = sources.find(item => item.display_id === displayId);
    if (!source || source.thumbnail.isEmpty()) return null;
    return { displayId, image: source.thumbnail.toDataURL() };
  } finally { if (win && !win.isDestroyed()) win.show(); if (guideWin && !guideWin.isDestroyed()) guideWin.showInactive(); restoreDrawing(); }
});

ipcMain.handle('overlay:transcribe', async (event, data) => {
  if (!authorized(event) || !(data instanceof Uint8Array) || data.byteLength < 200 ||
      data.byteLength > 600000) return { error: 'invalid_audio' };
  const wav = Buffer.from(data);
  if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE' ||
      wav.toString('ascii', 12, 16) !== 'fmt ' || wav.readUInt16LE(20) !== 1 ||
      wav.readUInt16LE(22) !== 1 || wav.readUInt32LE(24) !== 16000 ||
      wav.readUInt16LE(34) !== 16 || wav.toString('ascii', 36, 40) !== 'data' ||
      wav.readUInt32LE(40) !== wav.length - 44) return { error: 'invalid_audio' };
  try {
    const response = await fetch('https://omyla.uwaaa.com/api/transcribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: wav.toString('base64') }),
      signal: AbortSignal.timeout(30000)
    });
    const result = await response.json();
    if (!response.ok) return { error: result.error || 'service_unavailable', message: result.message };
    return typeof result.text === 'string' ? { text: result.text.slice(0, 800) } : { error: 'invalid_transcript' };
  } catch { return { error: 'network_error' }; }
});

ipcMain.handle('overlay:ask', async (event, value) => {
  if (!authorized(event) || typeof value !== 'string' || !value.trim() || value.length > 1500) return { error: 'invalid_question' };
  try {
    const response = await fetch('https://omyla.uwaaa.com/api/ask', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: value.trim() }), signal: AbortSignal.timeout(60000)
    });
    const result = await response.json();
    if (!response.ok) return { error: result.error || 'service_unavailable', message: result.message };
    if (typeof result.answer !== 'string') return { error: 'invalid_answer' };
    lastExchange = { question: value.trim().slice(0, 300), answer: result.answer.slice(0, 320) };
    return { answer: result.answer.slice(0, 1600) };
  } catch { return { error: 'network_error' }; }
});

ipcMain.handle('overlay:observe', async (event, value) => {
  if (!authorized(event) || computerBusy || inkWin || guideBusy || typeof value !== 'string' || !value.trim() || value.length > 800)
    return { error: 'invalid_question' };
  const display = activeDisplay();
  const displayId = String(display.id);
  guideBusy = true;
  stopGuide();
  hideDrawing();
  win.hide();
  try {
    await new Promise(resolve => setTimeout(resolve, 180));
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } });
    const source = sources.find(item => item.display_id === displayId);
    if (!source || source.thumbnail.isEmpty()) return { error: 'capture_failed' };
    const jpeg = source.thumbnail.toJPEG(72);
    if (jpeg.length > 740000) return { error: 'image_too_large' };
    const response = await fetch('https://omyla.uwaaa.com/api/observe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: value.trim(), image: `data:image/jpeg;base64,${jpeg.toString('base64')}`,
        previous: lastExchange, marks: selectedCanvas?.displayId === displayId ? selectedMarks : [] }),
      signal: AbortSignal.timeout(60000)
    });
    const result = await response.json();
    if (!response.ok) return { error: result.error || 'service_unavailable', message: result.message };
    const current = screen.getAllDisplays().find(item => String(item.id) === displayId);
    if (!current || current.bounds.x !== display.bounds.x || current.bounds.y !== display.bounds.y ||
        current.bounds.width !== display.bounds.width || current.bounds.height !== display.bounds.height)
      return { error: 'display_changed' };
    if (typeof result.answer !== 'string' || !Array.isArray(result.steps) || result.steps.length > 3 ||
        !result.steps.every(step => typeof step.text === 'string' && step.text.length <= 100 &&
          ['circle', 'arrow'].includes(step.kind) && [step.x, step.y].every(n => typeof n === 'number' && n >= 0 && n <= 1)))
      return { error: 'invalid_answer' };
    lastExchange = { question: value.trim().slice(0, 300), answer: result.answer.slice(0, 320) };
    if (result.steps.length) startGuide(current, result.steps, true);
    return { answer: result.answer.slice(0, 320), marks: result.steps.length };
  } catch { return { error: 'network_error' }; }
  finally { guideBusy = false; if (win && !win.isDestroyed()) win.show(); restoreDrawing(); }
});

ipcMain.handle('overlay:guide', async (event, value) => {
  if (!authorized(event) || computerBusy || inkWin || guideBusy || typeof value !== 'string') return { error: 'busy' };
  const goal = value.trim();
  if (!goal || goal.length > 800) return { error: 'invalid_goal' };
  const display = activeDisplay();
  const displayId = String(display.id);
  guideBusy = true;
  stopGuide();
  hideDrawing();
  win.hide();
  try {
    await new Promise(resolve => setTimeout(resolve, 180));
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } });
    const source = sources.find(item => item.display_id === displayId);
    if (!source || source.thumbnail.isEmpty()) return { error: 'capture_failed' };
    const fingerprint = source.thumbnail.resize({ width: 320, height: 180 }).toBitmap();
    const jpeg = source.thumbnail.toJPEG(72);
    if (jpeg.length > 740000) return { error: 'image_too_large' };
    const image = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
    win.show();
    const response = await fetch('https://omyla.uwaaa.com/api/guide', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, image, marks: selectedCanvas?.displayId === displayId ? selectedMarks : [] }),
      signal: AbortSignal.timeout(60000)
    });
    const result = await response.json();
    if (!response.ok) return { error: result.error || 'service_unavailable', message: result.message };
    const current = screen.getAllDisplays().find(item => String(item.id) === displayId);
    if (!current || current.bounds.x !== display.bounds.x || current.bounds.y !== display.bounds.y ||
        current.bounds.width !== display.bounds.width || current.bounds.height !== display.bounds.height)
      return { error: 'display_changed' };
    const steps = result.steps;
    if (!Array.isArray(steps) || steps.length < 1 || steps.length > 4 || !steps.every(step =>
      typeof step.text === 'string' && step.text.length <= 130 && ['circle', 'arrow'].includes(step.kind) &&
      [step.x, step.y].every(n => typeof n === 'number' && n >= 0 && n <= 1))) return { error: 'invalid_guide' };
    startGuide(current, steps);
    guideFingerprint = fingerprint;
    guideCapturedAt = Date.now();
    return { count: steps.length, current: steps[0].text, model: String(result.model || '').slice(0, 100) };
  } catch { return { error: 'network_error' }; }
  finally { guideBusy = false; if (win && !win.isDestroyed()) win.show(); restoreDrawing(); }
});
ipcMain.handle('overlay:next-guide', event => {
  if (!authorized(event) || !guideSteps.length) return { remaining: 0 };
  guideIndex++;
  if (guideIndex >= guideSteps.length) { stopGuide(); return { remaining: 0 }; }
  renderGuide(); return { remaining: guideSteps.length - guideIndex, current: guideSteps[guideIndex].text };
});

ipcMain.handle('overlay:execute-guide-click', async event => {
  if (!authorized(event) || computerBusy || guideBusy || inkWin || process.platform !== 'win32' ||
      !guideDisplay || !guideSteps[guideIndex] || !guideFingerprint) return { error: 'no_guide' };
  if (Date.now() - guideCapturedAt > 60000) { stopGuide(); return { error: 'stale' }; }
  const display = screen.getAllDisplays().find(item => item.id === guideDisplay.id);
  const bounds = guideDisplay.bounds;
  if (!display || display.bounds.x !== bounds.x || display.bounds.y !== bounds.y ||
      display.bounds.width !== bounds.width || display.bounds.height !== bounds.height) {
    stopGuide(); return { error: 'display_changed' };
  }
  const step = guideSteps[guideIndex];
  computerBusy = true;
  guideWin?.hide();
  hideDrawing();
  win.hide();
  try {
    await new Promise(resolve => setTimeout(resolve, 180));
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } });
    const source = sources.find(item => item.display_id === String(display.id));
    if (!source || source.thumbnail.isEmpty()) return { error: 'capture_failed' };
    const latest = source.thumbnail.resize({ width: 320, height: 180 }).toBitmap();
    if (targetChanged(guideFingerprint, latest, step)) { stopGuide(); return { error: 'screen_changed' }; }
    const point = screen.dipToScreenPoint({
      x: bounds.x + Math.min(bounds.width - 1, Math.floor(step.x * bounds.width)),
      y: bounds.y + Math.min(bounds.height - 1, Math.floor(step.y * bounds.height))
    });
    const clicked = await clickPhysicalPoint(point);
    stopGuide();
    return clicked ? { clicked: true } : { error: 'click_failed' };
  } catch { stopGuide(); return { error: 'click_failed' }; }
  finally { computerBusy = false; if (win && !win.isDestroyed()) win.show(); restoreDrawing(); }
});

ipcMain.handle('overlay:stop-guide', event => { if (!authorized(event)) return false; stopGuide(); return true; });
ipcMain.handle('overlay:draw', event => {
  if (!authorized(event) || computerBusy || inkWin || guideBusy) return false;
  stopGuide();
  const display = activeDisplay();
  const bounds = display.bounds;
  inkWin = new BrowserWindow({ ...bounds, frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true,
    resizable: false, movable: false, hasShadow: false, backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'ink-preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false } });
  inkWin.webContents.on('will-navigate', e => e.preventDefault());
  inkWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  inkWin.on('closed', () => { inkWin = undefined; if (win && !win.isDestroyed()) win.focus(); });
  inkWin.loadFile(path.join(__dirname, 'ink.html'));
  return true;
});
ipcMain.handle('overlay:ink-finish', (event, drawing) => {
  if (!inkWin || event.sender !== inkWin.webContents) return false;
  const marks = drawing?.marks, paths = drawing?.paths;
  if (Array.isArray(marks) && Array.isArray(paths) && marks.length === paths.length && marks.length <= 12 &&
      paths.every(path => Array.isArray(path) && path.length <= 1500 && path.every(point =>
        point && [point.x, point.y].every(n => typeof n === 'number' && n >= 0 && n <= 1))) && marks.every(mark =>
    ['point', 'circle', 'arrow', 'line'].includes(mark?.kind) &&
    mark.tip && [mark.tip.x, mark.tip.y].every(n => typeof n === 'number' && n >= 0 && n <= 1) &&
    (!mark.box || [mark.box.x, mark.box.y, mark.box.width, mark.box.height].every(n => typeof n === 'number' && n >= 0 && n <= 1)))) {
    const display = activeDisplay();
    selectedMarks = marks.map(mark => ({ kind: mark.kind, tip: mark.tip, box: mark.box, target: '' }));
    selectedPaths = paths.map(path => path.map(({ x, y }) => ({ x, y })));
    selectedCanvas = { kind: 'monitor', displayId: String(display.id), width: display.bounds.width, height: display.bounds.height, originX: display.bounds.x, originY: display.bounds.y, scaleFactor: display.scaleFactor, observedAt: new Date().toISOString() };
    createDrawing();
    win.webContents.send('overlay:marks-updated', selectedMarks.length);
  }
  inkWin.close();
  return true;
});
ipcMain.handle('drawing:move', (event, dx, dy) => {
  const index = handleWins.findIndex(handle => !handle.isDestroyed() && handle.webContents === event.sender);
  if (index < 0 || !Number.isFinite(dx) || !Number.isFinite(dy) || Math.abs(dx) > 4000 || Math.abs(dy) > 4000) return false;
  const display = drawingDisplay();
  if (!selectedMarks[index] || !selectedPaths[index]) return false;
  if (!display) return false;
  if (!handleDrags.has(event.sender.id)) handleDrags.set(event.sender.id, {
    mark: structuredClone(selectedMarks[index]), path: structuredClone(selectedPaths[index])
  });
  const original = handleDrags.get(event.sender.id);
  const mx = dx / display.bounds.width, my = dy / display.bounds.height;
  const clamp = n => Math.max(0, Math.min(1, n));
  selectedMarks[index] = { ...original.mark,
    tip: { x: clamp(original.mark.tip.x + mx), y: clamp(original.mark.tip.y + my) },
    box: original.mark.box && { ...original.mark.box,
      x: clamp(original.mark.box.x + mx), y: clamp(original.mark.box.y + my) } };
  selectedPaths[index] = original.path.map(p => ({ x: clamp(p.x + mx), y: clamp(p.y + my) }));
  renderDrawing();
  return true;
});
ipcMain.handle('drawing:end', event => { handleDrags.delete(event.sender.id); return true; });
ipcMain.handle('drawing:remove', event => {
  const index = handleWins.findIndex(handle => !handle.isDestroyed() && handle.webContents === event.sender);
  if (index < 0) return false;
  selectedMarks.splice(index, 1); selectedPaths.splice(index, 1);
  createDrawing();
  win.webContents.send('overlay:marks-updated', selectedMarks.length);
  return true;
});
ipcMain.handle('overlay:move-cursor', async event => {
  if (!authorized(event) || computerBusy || inkWin || process.platform !== 'win32' || !selectedCanvas || !selectedMarks.length) return false;
  const display = screen.getAllDisplays().find(item => String(item.id) === selectedCanvas.displayId);
  if (!display || display.bounds.x !== selectedCanvas.originX || display.bounds.y !== selectedCanvas.originY ||
      display.bounds.width !== selectedCanvas.width || display.bounds.height !== selectedCanvas.height) return false;
  const tip = selectedMarks.at(-1).tip;
  if (![tip.x, tip.y].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) return false;
  const dipPoint = { x: display.bounds.x + Math.min(display.bounds.width - 1, Math.floor(tip.x * display.bounds.width)),
    y: display.bounds.y + Math.min(display.bounds.height - 1, Math.floor(tip.y * display.bounds.height)) };
  return movePhysicalCursor(screen.dipToScreenPoint(dipPoint));
});
ipcMain.handle('overlay:open-goal', async (event, value) => {
  if (!authorized(event) || computerBusy || typeof value !== 'string') return false;
  const goal = value.trim();
  if (!goal || goal.length > 1500) return false;
  const payload = { goal, context: { surface: { kind: 'desktop', title: 'OMYLA Desktop' }, canvas: selectedCanvas, targets: [], marks: selectedMarks } };
  const url = `https://omyla.uwaaa.com/app/#omyla=${encodeURIComponent(JSON.stringify(payload))}`;
  await shell.openExternal(url);
  stopDrawing(); selectedMarks = []; selectedPaths = []; selectedCanvas = undefined;
  if (open) { open = false; win.setBounds(place(compact)); }
  shapePresence();
  return true;
});
ipcMain.handle('overlay:quit', event => { if (authorized(event)) app.quit(); });
ipcMain.handle('overlay:get-login', event => authorized(event) ? { available: app.isPackaged && ['win32', 'darwin'].includes(process.platform), enabled: launchOnLogin } : null);
ipcMain.handle('overlay:set-login', (event, enabled) => {
  if (!authorized(event) || typeof enabled !== 'boolean' || !app.isPackaged || !['win32', 'darwin'].includes(process.platform)) return false;
  try {
    const actual = configureLogin(enabled);
    if (actual !== enabled) return false;
    fs.writeFileSync(path.join(app.getPath('userData'), 'presence.json'), JSON.stringify({ launchOnLogin: enabled }));
    launchOnLogin = enabled;
    return true;
  } catch { return false; }
});

if (app.requestSingleInstanceLock()) {
  app.whenReady().then(() => { loadPreferences(); create(); wanderTimer = setInterval(wanderTick, 50); globalShortcut.register('CommandOrControl+Shift+O', () => togglePresence(true)); globalShortcut.register('Control+Alt+Shift+Q', () => app.quit());
    desktopTasks = installDesktopTasks({ BrowserWindow, ipcMain, screen, desktopCapturer, globalShortcut, getWindow: () => win, getDisplay: activeDisplay, authorized, targetChanged,
      prepare: () => { stopGuide(); stopDrawing(); open = false; wanderTarget = undefined; win.setBounds(place(compact)); shapePresence(); win.webContents.send('task:collapse'); },
      setBusy: value => { computerBusy = value; }, setWalking, updateAnchor: (x, y) => { anchor = { x, y }; } }); });
  app.on('second-instance', () => { if (win && !win.isDestroyed()) win.show(); });
  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => { desktopTasks?.stop(); clearInterval(wanderTimer); globalShortcut.unregisterAll(); });
} else app.quit();
