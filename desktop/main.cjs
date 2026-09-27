const { app, BrowserWindow, ipcMain, screen, shell, desktopCapturer } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const compact = { width: 64, height: 64 };
const expanded = { width: 420, height: 400 };
let win;
let open = false;
let anchor;
let launchOnLogin = true;
let selectedDisplayId;
let inkWin;
let selectedMarks = [];
let selectedCanvas;

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
  win.webContents.on('will-navigate', event => event.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => win.show());
}

function authorized(event) { return win && !win.isDestroyed() && event.sender === win.webContents; }
ipcMain.handle('overlay:toggle', event => {
  if (!authorized(event)) return false;
  open = !open; win.setBounds(place(open ? expanded : compact));
  if (open) win.focus();
  return open;
});
ipcMain.handle('overlay:close', event => {
  if (!authorized(event)) return;
  if (open) { open = false; win.setBounds(place(compact)); }
});
ipcMain.handle('overlay:displays', event => authorized(event) ? { selected: String(activeDisplay().id), displays: screen.getAllDisplays().map(displayInfo) } : null);
ipcMain.handle('overlay:select-display', (event, id) => {
  if (!authorized(event) || inkWin || typeof id !== 'string') return false;
  const display = screen.getAllDisplays().find(item => String(item.id) === id);
  if (!display) return false;
  selectedDisplayId = display.id;
  const area = display.workArea;
  anchor = { x: area.x + area.width - 12, y: area.y + area.height - 12 };
  selectedMarks = []; selectedCanvas = undefined;
  win.setBounds(place(open ? expanded : compact));
  return true;
});
ipcMain.handle('overlay:preview-screen', async event => {
  if (!authorized(event) || inkWin) return null;
  const displayId = String(activeDisplay().id);
  win.hide();
  try {
    await new Promise(resolve => setTimeout(resolve, 150));
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1280, height: 720 } });
    const source = sources.find(item => item.display_id === displayId);
    if (!source || source.thumbnail.isEmpty()) return null;
    return { displayId, image: source.thumbnail.toDataURL() };
  } finally { if (win && !win.isDestroyed()) win.show(); }
});
ipcMain.handle('overlay:draw', event => {
  if (!authorized(event) || inkWin) return false;
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
ipcMain.handle('overlay:ink-finish', (event, marks) => {
  if (!inkWin || event.sender !== inkWin.webContents) return false;
  if (Array.isArray(marks) && marks.length <= 12 && marks.every(mark =>
    ['point', 'circle', 'arrow', 'line'].includes(mark?.kind) &&
    mark.tip && [mark.tip.x, mark.tip.y].every(n => typeof n === 'number' && n >= 0 && n <= 1) &&
    (!mark.box || [mark.box.x, mark.box.y, mark.box.width, mark.box.height].every(n => typeof n === 'number' && n >= 0 && n <= 1)))) {
    const display = activeDisplay();
    selectedMarks = marks.map(mark => ({ kind: mark.kind, tip: mark.tip, box: mark.box, target: '' }));
    selectedCanvas = { kind: 'monitor', displayId: String(display.id), width: display.bounds.width, height: display.bounds.height, originX: display.bounds.x, originY: display.bounds.y, scaleFactor: display.scaleFactor, observedAt: new Date().toISOString() };
    win.webContents.send('overlay:marks-updated', selectedMarks.length);
  }
  inkWin.close();
  return true;
});
ipcMain.handle('overlay:open-goal', async (event, value) => {
  if (!authorized(event) || typeof value !== 'string') return false;
  const goal = value.trim();
  if (!goal || goal.length > 1500) return false;
  const payload = { goal, context: { surface: { kind: 'desktop', title: 'OMYLA Desktop' }, canvas: selectedCanvas, targets: [], marks: selectedMarks } };
  const url = `https://omyla.uwaaa.com/app/#omyla=${encodeURIComponent(JSON.stringify(payload))}`;
  await shell.openExternal(url);
  selectedMarks = []; selectedCanvas = undefined;
  if (open) { open = false; win.setBounds(place(compact)); }
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
  app.whenReady().then(() => { loadPreferences(); create(); });
  app.on('second-instance', () => { if (win && !win.isDestroyed()) win.show(); });
  app.on('window-all-closed', () => app.quit());
} else app.quit();
