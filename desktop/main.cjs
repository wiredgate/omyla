const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
const path = require('node:path');

const compact = { width: 64, height: 64 };
const expanded = { width: 420, height: 330 };
let win;
let open = false;
let anchor;

function place(size) {
  const display = screen.getDisplayNearestPoint(anchor);
  const area = display.workArea;
  return { width: size.width, height: size.height,
    x: Math.round(Math.max(area.x, Math.min(area.x + area.width - size.width, anchor.x - size.width))),
    y: Math.round(Math.max(area.y, Math.min(area.y + area.height - size.height, anchor.y - size.height))) };
}

function create() {
  const area = screen.getPrimaryDisplay().workArea;
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
ipcMain.handle('overlay:open-goal', async (event, value) => {
  if (!authorized(event) || typeof value !== 'string') return false;
  const goal = value.trim();
  if (!goal || goal.length > 1500) return false;
  const payload = { goal, context: { surface: { kind: 'desktop', title: 'OMYLA Desktop' }, targets: [], marks: [] } };
  const url = `https://omyla.uwaaa.com/#omyla=${encodeURIComponent(JSON.stringify(payload))}`;
  await shell.openExternal(url);
  if (open) { open = false; win.setBounds(place(compact)); }
  return true;
});
ipcMain.handle('overlay:quit', event => { if (authorized(event)) app.quit(); });

if (app.requestSingleInstanceLock()) {
  app.whenReady().then(create);
  app.on('second-instance', () => { if (win && !win.isDestroyed()) win.show(); });
  app.on('window-all-closed', () => app.quit());
} else app.quit();
