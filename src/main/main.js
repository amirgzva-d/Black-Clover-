import { app,BrowserWindow,ipcMain,globalShortcut,Tray,Menu,nativeImage,Notification,screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Agent } from '../agent/Agent.js';
import { reminders } from '../agent/ReminderStore.js';
import { Phase1DependencyManager } from './Phase1DependencyManager.js';
import { SpeechService } from './SpeechService.js';
import { SystemPresence } from './SystemPresence.js';

const execFileAsync=promisify(execFile),__dirname=path.dirname(fileURLToPath(import.meta.url));
let avatarWin=null,chatWin=null,tray=null,quitting=false,reminderTimer=null,learningTimer=null,autoProvisionStarted=false,provisioning=false;
const livingWindows=()=>[avatarWin,chatWin].filter(w=>w&&!w.isDestroyed());
const send=event=>{for(const w of livingWindows())w.webContents.send('agent:event',event);};
const sendAvatar=(channel,payload)=>{if(avatarWin&&!avatarWin.isDestroyed())avatarWin.webContents.send(channel,payload);};
const agent=new Agent({emit:send}),deps=new Phase1DependencyManager({emit:send}),speech=new SpeechService(),presence=new SystemPresence({emit:e=>{send(e);if(e.type==='break-reminder'&&Notification.isSupported())new Notification({title:'Maria • Black Clover',body:e.text,silent:true}).show();}});

function loadSurface(w,surface){const dev=process.env.NODE_ENV!=='production'&&!app.isPackaged;if(dev)w.loadURL(`http://127.0.0.1:5173/?surface=${surface}`);else w.loadFile(path.join(__dirname,'../../dist/index.html'),{query:{surface}});}
function displayWorkArea(){return screen.getPrimaryDisplay().workArea;}
function avatarBounds(){const a=displayWorkArea(),width=Math.min(470,Math.max(360,Math.round(a.width*.26))),height=Math.min(760,Math.max(560,a.height-40));return {width,height,x:a.x+a.width-width-14,y:a.y+a.height-height-12};}
function chatBounds(){const a=displayWorkArea(),avatar=avatarBounds(),width=Math.min(590,Math.max(500,Math.round(a.width*.32))),height=Math.min(740,Math.max(620,a.height-70));let x=avatar.x-width-14;if(x<a.x+10)x=a.x+24;let y=a.y+Math.max(20,Math.round((a.height-height)/2));return {width,height,x,y};}

async function beginAutoProvision(){if(autoProvisionStarted||!app.isPackaged||process.platform!=='win32')return;autoProvisionStarted=true;try{if(!await deps.needsProvisioning())return;provisioning=true;send({type:'provision',state:'needed',message:'Full Setup ماریا در حال آماده‌سازی است'});await deps.installAll({includeOptional:true});}catch(e){console.warn('Auto provision:',e.message);send({type:'provision',state:'partial',message:`آماده‌سازی کامل نشد: ${e.message}`});}finally{provisioning=false;}}
function commonWebPreferences(){return {preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true};}
function createAvatarWindow(){if(avatarWin&&!avatarWin.isDestroyed())return avatarWin;const b=avatarBounds();avatarWin=new BrowserWindow({...b,minWidth:330,minHeight:500,transparent:true,frame:false,backgroundColor:'#00000000',show:true,resizable:true,alwaysOnTop:true,skipTaskbar:false,hasShadow:false,title:'Maria • Black Clover',webPreferences:commonWebPreferences()});loadSurface(avatarWin,'avatar');avatarWin.setAlwaysOnTop(true,'floating');avatarWin.webContents.once('did-finish-load',()=>setTimeout(beginAutoProvision,900));avatarWin.on('close',e=>{if(!quitting){e.preventDefault();avatarWin.hide();}});avatarWin.on('closed',()=>{avatarWin=null;});return avatarWin;}
function createChatWindow(){if(chatWin&&!chatWin.isDestroyed())return chatWin;const b=chatBounds();chatWin=new BrowserWindow({...b,minWidth:470,minHeight:560,transparent:true,frame:false,backgroundColor:'#00000000',show:false,resizable:true,hasShadow:true,title:'Maria Chat',webPreferences:commonWebPreferences()});loadSurface(chatWin,'chat');chatWin.on('close',e=>{if(!quitting){e.preventDefault();chatWin.hide();}});chatWin.on('closed',()=>{chatWin=null;});return chatWin;}
function showAvatar(){const w=createAvatarWindow();if(w.isMinimized())w.restore();w.show();return w;}
function showChat({focus=true}={}){showAvatar();const w=createChatWindow();if(w.isMinimized())w.restore();w.show();if(focus){w.focus();w.webContents.send('assistant:focus-input');}return w;}
function hideChat(){if(chatWin&&!chatWin.isDestroyed())chatWin.hide();}
function toggleChat(){if(chatWin&&!chatWin.isDestroyed()&&chatWin.isVisible())hideChat();else showChat();}
function showAssistant(){showAvatar();showChat();}
function trayIcon(){return nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAK0lEQVR42mNkYPj/n4ECwESJ5lEDRg0YNYDQgBqGQWjAoAGjBgwaMGgAAJs7Ah7lQ3jMAAAAAElFTkSuQmCC').resize({width:16,height:16});}
async function installAllFromTray(){if(provisioning)return;provisioning=true;try{await deps.installAll({includeOptional:true});}catch{}finally{provisioning=false;}}
function createTray(){if(tray)return;tray=new Tray(trayIcon());tray.setToolTip('Maria • Black Clover');tray.setContextMenu(Menu.buildFromTemplate([{label:'نمایش ماریا',click:showAvatar},{label:'باز کردن چت',click:()=>showChat()},{label:'آماده‌سازی کامل ابزارها',click:installAllFromTray},{label:'اجرا با دسترسی Administrator',click:()=>restartElevated().catch(()=>{})},{type:'separator'},{label:'خروج کامل',click:()=>{quitting=true;app.quit();}}]));tray.on('click',toggleChat);}
function psQuote(s){return `'${String(s).replaceAll("'","''")}'`;}
async function isAdmin(){try{const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command','([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'],{windowsHide:true,timeout:10000});return stdout.trim().toLowerCase()==='true';}catch{return false;}}
async function restartElevated(){if(process.platform!=='win32')throw new Error('Administrator elevation is only available on Windows.');if(await isAdmin())return {ok:true,already:true};const args=app.isPackaged?[]:[app.getAppPath()],argList=args.length?` -ArgumentList ${args.map(psQuote).join(',')}`:'';await execFileAsync('powershell.exe',['-NoProfile','-Command',`Start-Process -FilePath ${psQuote(process.execPath)}${argList} -Verb RunAs`],{windowsHide:true,timeout:60000});setTimeout(()=>{quitting=true;app.quit();},350);return {ok:true};}
function startupStatus(){const s=app.getLoginItemSettings();return {openAtLogin:Boolean(s.openAtLogin),executableWillLaunchAtLogin:Boolean(s.executableWillLaunchAtLogin),path:process.execPath};}
function setStartup(enabled){if(!app.isPackaged)return {ok:false,message:'Start-with-Windows is enabled after installing the packaged app.',...startupStatus()};app.setLoginItemSettings({openAtLogin:Boolean(enabled),path:process.execPath,args:[]});return {ok:true,...startupStatus()};}
function startReminderPump(){if(reminderTimer)return;reminderTimer=setInterval(async()=>{try{for(const item of await reminders.takeDue()){const event={type:'reminder',item,text:item.message};send(event);if(Notification.isSupported())new Notification({title:'یادآوری ماریا',body:item.message}).show();}}catch(e){console.warn('Reminder pump:',e.message);}},5000);}
function startIdleLearningPump(){if(learningTimer)return;learningTimer=setInterval(async()=>{try{if(provisioning)return;const idle=presence.status().idleSeconds;if(!Number.isFinite(idle)||idle<300)return;const dependencyState=await deps.status();if(!dependencyState.recommendedReady)return;await agent.improveOne({allowCurriculum:true});}catch(e){console.warn('Idle learning:',e.message);}},10*60*1000);}

const gotLock=app.requestSingleInstanceLock();if(!gotLock){app.quit();}else app.on('second-instance',()=>{showAvatar();showChat();});
app.whenReady().then(()=>{createAvatarWindow();createTray();presence.start();startReminderPump();startIdleLearningPump();globalShortcut.register('CommandOrControl+Shift+Space',toggleChat);app.on('activate',showAvatar);});
app.on('before-quit',()=>{quitting=true;});
app.on('will-quit',()=>{globalShortcut.unregisterAll();presence.stop();if(reminderTimer)clearInterval(reminderTimer);if(learningTimer)clearInterval(learningTimer);});
app.on('window-all-closed',()=>{});

ipcMain.handle('agent:chat',async(_e,text)=>{const response=await agent.chat(String(text??''));sendAvatar('assistant:response',response);return response;});
ipcMain.handle('agent:confirm',async(_e,payload)=>{const response=await agent.confirm(payload);sendAvatar('assistant:response',response);return response;});
ipcMain.handle('agent:status',()=>agent.status());
ipcMain.handle('assistant:toggle',()=>{toggleChat();return true;});
ipcMain.handle('assistant:show-chat',()=>{showChat();return true;});
ipcMain.handle('assistant:hide-chat',()=>{hideChat();return true;});
ipcMain.handle('assistant:minimize-chat',()=>{const w=createChatWindow();w.minimize();return true;});
ipcMain.handle('assistant:open-settings',()=>{const w=showChat();w.webContents.send('assistant:open-settings');return true;});
ipcMain.handle('assistant:prompt',(_e,text)=>{const w=showChat();w.webContents.send('assistant:prefill-prompt',{text:String(text||''),submit:true});return true;});
ipcMain.handle('system:diagnostics',async()=>({dependencies:await deps.status(),speech:await speech.status(),presence:presence.status(),startup:startupStatus(),admin:await isAdmin(),packaged:app.isPackaged,version:app.getVersion()}));
ipcMain.handle('system:install-dependency',(_e,id)=>deps.install(String(id||'')));
ipcMain.handle('system:install-all-dependencies',()=>installAllFromTray());
ipcMain.handle('system:restart-admin',()=>restartElevated());
ipcMain.handle('system:get-startup',()=>startupStatus());
ipcMain.handle('system:set-startup',(_e,enabled)=>setStartup(enabled));
ipcMain.handle('speech:status',()=>speech.status());
ipcMain.handle('speech:transcribe',(_e,payload)=>speech.transcribe(payload?.bytes??payload,{language:payload?.language||'fa'}));
ipcMain.handle('speech:synthesize',(_e,payload)=>speech.synthesize(payload?.text,{rate:payload?.rate,volume:payload?.volume,pitch:payload?.pitch}));
