const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('omyla', {
  toggle: () => ipcRenderer.invoke('overlay:toggle'),
  close: () => ipcRenderer.invoke('overlay:close'),
  openGoal: value => ipcRenderer.invoke('overlay:open-goal', typeof value === 'string' ? value.slice(0, 1500) : ''),
  getLogin: () => ipcRenderer.invoke('overlay:get-login'),
  setLogin: value => ipcRenderer.invoke('overlay:set-login', value === true),
  quit: () => ipcRenderer.invoke('overlay:quit')
});
