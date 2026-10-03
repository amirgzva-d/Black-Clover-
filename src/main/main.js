import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Agent } from '../agent/Agent.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
let win;
const agent=new Agent({emit:(event)=>win?.webContents.send('agent:event',event)});

function createWindow(){
  win=new BrowserWindow({
    width:1180,height:760,minWidth:850,minHeight:600,
    backgroundColor:'#0d1017',show:true,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}
  });
  const dev=process.env.NODE_ENV!=='production'&&!app.isPackaged;
  if(dev) win.loadURL('http://127.0.0.1:5173');
  else win.loadFile(path.join(__dirname,'../../dist/index.html'));
  win.on('closed',()=>{win=null;});
}

function toggleAssistant(){
  if(!win){createWindow();return;}
  if(win.isVisible()&&win.isFocused()){win.hide();return;}
  if(win.isMinimized())win.restore();
  win.show();win.focus();
  win.webContents.send('assistant:focus-input');
}

app.whenReady().then(()=>{
  createWindow();
  globalShortcut.register('CommandOrControl+Shift+Space',toggleAssistant);
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('will-quit',()=>globalShortcut.unregisterAll());
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});

ipcMain.handle('agent:chat',(_e,text)=>agent.chat(String(text??'')));
ipcMain.handle('agent:confirm',(_e,payload)=>agent.confirm(payload));
ipcMain.handle('agent:status',()=>agent.status());
ipcMain.handle('assistant:toggle',()=>{toggleAssistant();return true;});
