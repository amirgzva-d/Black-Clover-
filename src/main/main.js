import { app,BrowserWindow,ipcMain,globalShortcut,Tray,Menu,nativeImage,Notification } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Agent } from '../agent/Agent.js';
import { reminders } from '../agent/ReminderStore.js';
import { DependencyManager } from './DependencyManager.js';
import { SpeechService } from './SpeechService.js';
import { SystemPresence } from './SystemPresence.js';

const execFileAsync=promisify(execFile),__dirname=path.dirname(fileURLToPath(import.meta.url));
let win=null,tray=null,quitting=false,reminderTimer=null,learningTimer=null,autoProvisionStarted=false,provisioning=false;
const send=event=>{if(win&&!win.isDestroyed())win.webContents.send('agent:event',event);};
const agent=new Agent({emit:send}),deps=new DependencyManager({emit:send}),speech=new SpeechService(),presence=new SystemPresence({emit:e=>{send(e);if(e.type==='break-reminder'&&Notification.isSupported())new Notification({title:'Maria • Black Clover',body:e.text,silent:true}).show();}});

async function beginAutoProvision(){if(autoProvisionStarted||!app.isPackaged||process.platform!=='win32')return;autoProvisionStarted=true;try{if(!await deps.needsProvisioning())return;provisioning=true;send({type:'provision',state:'needed',message:'Full Setup ماریا در حال آماده‌سازی است'});await deps.installAll({includeOptional:true});}catch(e){console.warn('Auto provision:',e.message);send({type:'provision',state:'partial',message:`آماده‌سازی کامل نشد: ${e.message}`});}finally{provisioning=false;}}
function createWindow(){
  if(win&&!win.isDestroyed())return win;
  win=new BrowserWindow({width:1180,height:760,minWidth:850,minHeight:600,backgroundColor:'#0d1017',show:true,title:'Black Clover Maria',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  const dev=process.env.NODE_ENV!=='production'&&!app.isPackaged;if(dev)win.loadURL('http://127.0.0.1:5173');else win.loadFile(path.join(__dirname,'../../dist/index.html'));
  win.webContents.once('did-finish-load',()=>setTimeout(beginAutoProvision,900));
  win.on('close',e=>{if(!quitting){e.preventDefault();win.hide();}});win.on('closed',()=>{win=null;});return win;
}
function showAssistant(){const w=createWindow();if(w.isMinimized())w.restore();w.show();w.focus();w.webContents.send('assistant:focus-input');}
function toggleAssistant(){if(!win||win.isDestroyed()){showAssistant();return;}if(win.isVisible()&&win.isFocused())win.hide();else showAssistant();}
function trayIcon(){return nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAK0lEQVR42mNkYPj/n4ECwESJ5lEDRg0YNYDQgBqGQWjAoAGjBgwaMGgAAJs7Ah7lQ3jMAAAAAElFTkSuQmCC').resize({width:16,height:16});}
async function installAllFromTray(){if(provisioning)return;provisioning=true;try{await deps.installAll({includeOptional:true});}catch{}finally{provisioning=false;}}
function createTray(){if(tray)return;tray=new Tray(trayIcon());tray.setToolTip('Maria • Black Clover');tray.setContextMenu(Menu.buildFromTemplate([{label:'باز کردن ماریا',click:showAssistant},{label:'آماده‌سازی کامل ابزارها',click:installAllFromTray},{label:'اجرا با دسترسی Administrator',click:()=>restartElevated().catch(()=>{})},{type:'separator'},{label:'خروج کامل',click:()=>{quitting=true;app.quit();}}]));tray.on('click',toggleAssistant);}
function psQuote(s){return `'${String(s).replaceAll("'","''")}'`;}
async function isAdmin(){try{const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command','([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'],{windowsHide:true,timeout:10000});return stdout.trim().toLowerCase()==='true';}catch{return false;}}
async function restartElevated(){if(process.platform!=='win32')throw new Error('Administrator elevation is only available on Windows.');if(await isAdmin())return {ok:true,already:true};const args=app.isPackaged?[]:[app.getAppPath()],argList=args.length?` -ArgumentList ${args.map(psQuote).join(',')}`:'';await execFileAsync('powershell.exe',['-NoProfile','-Command',`Start-Process -FilePath ${psQuote(process.execPath)}${argList} -Verb RunAs`],{windowsHide:true,timeout:60000});setTimeout(()=>{quitting=true;app.quit();},350);return {ok:true};}
function startupStatus(){const s=app.getLoginItemSettings();return {openAtLogin:Boolean(s.openAtLogin),executableWillLaunchAtLogin:Boolean(s.executableWillLaunchAtLogin),path:process.execPath};}
function setStartup(enabled){if(!app.isPackaged)return {ok:false,message:'Start-with-Windows is enabled after installing the packaged app.',...startupStatus()};app.setLoginItemSettings({openAtLogin:Boolean(enabled),path:process.execPath,args:[]});return {ok:true,...startupStatus()};}
function startReminderPump(){if(reminderTimer)return;reminderTimer=setInterval(async()=>{try{for(const item of await reminders.takeDue()){const event={type:'reminder',item,text:item.message};send(event);if(Notification.isSupported())new Notification({title:'یادآوری ماریا',body:item.message}).show();}}catch(e){console.warn('Reminder pump:',e.message);}},5000);}
function startIdleLearningPump(){if(learningTimer)return;learningTimer=setInterval(async()=>{try{if(provisioning)return;const idle=presence.status().idleSeconds;if(!Number.isFinite(idle)||idle<300)return;const dependencyState=await deps.status();if(!dependencyState.recommendedReady)return;await agent.improveOne({allowCurriculum:true});}catch(e){console.warn('Idle learning:',e.message);}},10*60*1000);}

const gotLock=app.requestSingleInstanceLock();if(!gotLock){app.quit();}else app.on('second-instance',showAssistant);
app.whenReady().then(()=>{createWindow();createTray();presence.start();startReminderPump();startIdleLearningPump();globalShortcut.register('CommandOrControl+Shift+Space',toggleAssistant);app.on('activate',showAssistant);});
app.on('before-quit',()=>{quitting=true;});
app.on('will-quit',()=>{globalShortcut.unregisterAll();presence.stop();if(reminderTimer)clearInterval(reminderTimer);if(learningTimer)clearInterval(learningTimer);});
app.on('window-all-closed',()=>{});

ipcMain.handle('agent:chat',(_e,text)=>agent.chat(String(text??'')));
ipcMain.handle('agent:confirm',(_e,payload)=>agent.confirm(payload));
ipcMain.handle('agent:status',()=>agent.status());
ipcMain.handle('assistant:toggle',()=>{toggleAssistant();return true;});
ipcMain.handle('system:diagnostics',async()=>({dependencies:await deps.status(),speech:await speech.status(),presence:presence.status(),startup:startupStatus(),admin:await isAdmin(),packaged:app.isPackaged,version:app.getVersion()}));
ipcMain.handle('system:install-dependency',(_e,id)=>deps.install(String(id||'')));
ipcMain.handle('system:install-all-dependencies',()=>installAllFromTray());
ipcMain.handle('system:restart-admin',()=>restartElevated());
ipcMain.handle('system:get-startup',()=>startupStatus());
ipcMain.handle('system:set-startup',(_e,enabled)=>setStartup(enabled));
ipcMain.handle('speech:status',()=>speech.status());
ipcMain.handle('speech:transcribe',(_e,payload)=>speech.transcribe(payload?.bytes??payload,{language:payload?.language||'fa'}));
ipcMain.handle('speech:synthesize',(_e,payload)=>speech.synthesize(payload?.text,{rate:payload?.rate,volume:payload?.volume}));
