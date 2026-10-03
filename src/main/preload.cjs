const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('blackClover', {
  chat: (text) => ipcRenderer.invoke('agent:chat', text),
  confirm: (id, approved) => ipcRenderer.invoke('agent:confirm', { id, approved }),
  getStatus: () => ipcRenderer.invoke('agent:status'),
  toggle: () => ipcRenderer.invoke('assistant:toggle'),
  onEvent: (fn) => { const h=(_e,v)=>fn(v); ipcRenderer.on('agent:event',h); return ()=>ipcRenderer.removeListener('agent:event',h); },
  onFocusInput: (fn) => { const h=()=>fn(); ipcRenderer.on('assistant:focus-input',h); return ()=>ipcRenderer.removeListener('assistant:focus-input',h); }
});
