const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('omylaPassive', { onDrawing: callback => ipcRenderer.on('drawing:update', (_event, value) => callback(value)) });
