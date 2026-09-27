const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('omylaInk', { finish: marks => ipcRenderer.invoke('overlay:ink-finish', marks) });
