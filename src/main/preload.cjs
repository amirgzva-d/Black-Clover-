const { contextBridge,ipcRenderer }=require('electron');
contextBridge.exposeInMainWorld('blackClover',{
  chat:text=>ipcRenderer.invoke('agent:chat',text),
  confirm:(id,approved)=>ipcRenderer.invoke('agent:confirm',{id,approved}),
  getStatus:()=>ipcRenderer.invoke('agent:status'),
  toggle:()=>ipcRenderer.invoke('assistant:toggle'),
  diagnostics:()=>ipcRenderer.invoke('system:diagnostics'),
  installDependency:id=>ipcRenderer.invoke('system:install-dependency',id),
  provisionAll:()=>ipcRenderer.invoke('system:install-all-dependencies'),
  restartAsAdmin:()=>ipcRenderer.invoke('system:restart-admin'),
  getStartup:()=>ipcRenderer.invoke('system:get-startup'),
  setStartup:enabled=>ipcRenderer.invoke('system:set-startup',Boolean(enabled)),
  speechStatus:()=>ipcRenderer.invoke('speech:status'),
  transcribeAudio:(bytes,language='fa')=>ipcRenderer.invoke('speech:transcribe',{bytes,language}),
  synthesizeSpeech:(text,options={})=>ipcRenderer.invoke('speech:synthesize',{text,...options}),
  onEvent:fn=>{const h=(_e,v)=>fn(v);ipcRenderer.on('agent:event',h);return()=>ipcRenderer.removeListener('agent:event',h);},
  onFocusInput:fn=>{const h=()=>fn();ipcRenderer.on('assistant:focus-input',h);return()=>ipcRenderer.removeListener('assistant:focus-input',h);}
});
