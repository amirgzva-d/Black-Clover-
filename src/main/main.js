import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Agent } from '../agent/Agent.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
let win;
const agent=new Agent({ emit:(event)=>win?.webContents.send('agent:event',event) });

function createWindow(){
  win=new BrowserWindow({width:1180,height:760,minWidth:850,minHeight:600,backgroundColor:'#0d1017',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  const dev=process.env.NODE_ENV!=='production' && !app.isPackaged;
  if(dev) win.loadURL('http://127.0.0.1:5173'); else win.loadFile(path.join(__dirname,'../../dist/index.html'));
}
app.whenReady().then(()=>{createWindow(); app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
ipcMain.handle('agent:chat',(_e,text)=>agent.chat(String(text??'')));
ipcMain.handle('agent:confirm',(_e,payload)=>agent.confirm(payload));
ipcMain.handle('agent:status',()=>agent.status());
