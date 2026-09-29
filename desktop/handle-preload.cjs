const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('omylaHandle', {
  move: (dx, dy) => ipcRenderer.invoke('drawing:move', Number(dx), Number(dy)),
  end: () => ipcRenderer.invoke('drawing:end'),
  remove: () => ipcRenderer.invoke('drawing:remove')
});
