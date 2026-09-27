const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('omyla', {
  toggle: () => ipcRenderer.invoke('overlay:toggle'),
  close: () => ipcRenderer.invoke('overlay:close'),
  displays: () => ipcRenderer.invoke('overlay:displays'),
  selectDisplay: id => ipcRenderer.invoke('overlay:select-display', String(id)),
  previewScreen: () => ipcRenderer.invoke('overlay:preview-screen'),
  draw: () => ipcRenderer.invoke('overlay:draw'),
  moveCursor: () => ipcRenderer.invoke('overlay:move-cursor'),
  onMarksUpdated: callback => ipcRenderer.on('overlay:marks-updated', (_event, count) => callback(count)),
  openGoal: value => ipcRenderer.invoke('overlay:open-goal', typeof value === 'string' ? value.slice(0, 1500) : ''),
  getLogin: () => ipcRenderer.invoke('overlay:get-login'),
  setLogin: value => ipcRenderer.invoke('overlay:set-login', value === true),
  quit: () => ipcRenderer.invoke('overlay:quit')
});
