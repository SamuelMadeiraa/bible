const { contextBridge, ipcRenderer } = require('electron');

const CANAIS = ['slide', 'displays-changed', 'output:state'];

contextBridge.exposeInMainWorld('bridge', {
  displays: () => ipcRenderer.invoke('displays'),
  openOutput: id => ipcRenderer.invoke('output:open', id),
  closeOutput: () => ipcRenderer.invoke('output:close'),
  outputState: () => ipcRenderer.invoke('output:state'),
  toggleFullscreen: () => ipcRenderer.send('output:fullscreen-toggle'),
  sendSlide: slide => ipcRenderer.send('slide', slide),
  lastSlide: () => ipcRenderer.invoke('slide:last'),
  putImage: (id, data) => ipcRenderer.send('image:put', id, data),
  getImage: id => ipcRenderer.invoke('image:get', id),
  serverInfo: () => ipcRenderer.invoke('server:info'),
  openExternal: url => ipcRenderer.send('open-external', url),
  on: (canal, cb) => {
    if (CANAIS.includes(canal)) ipcRenderer.on(canal, (e, ...args) => cb(...args));
  },
});
