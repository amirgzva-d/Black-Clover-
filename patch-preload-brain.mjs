import fs from 'node:fs';
const p='C:\\Users\\cibesabz\\Black-Clover-Live\\src\\main\\preload.cjs';
let s=fs.readFileSync(p,'utf8');
if(!s.includes('brainSettings:')){
  s=s.replace(
    "  modelCatalog:()=>ipcRenderer.invoke('brain:catalog'),",
    "  modelCatalog:()=>ipcRenderer.invoke('brain:catalog'),\n  brainSettings:()=>ipcRenderer.invoke('brain:settings'),\n  saveBrainProvider:payload=>ipcRenderer.invoke('brain:save-provider',payload),\n  removeBrainProvider:provider=>ipcRenderer.invoke('brain:remove-provider',provider),\n  testBrainProvider:provider=>ipcRenderer.invoke('brain:test-provider',provider),"
  );
}
fs.writeFileSync(p,s,'utf8');
console.log('preload brain api wired');