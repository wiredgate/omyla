const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('omylaGuide', {
  onStep: callback => ipcRenderer.on('guide:step', (_event, value) => callback(value))
});
