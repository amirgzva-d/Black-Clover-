import { app,BrowserWindow,ipcMain,globalShortcut,Tray,Menu,nativeImage,Notification,screen,shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Agent } from '../agent/Agent.js';
import { reminders } from '../agent/ReminderStore.js';
import { pinnedNotes } from '../agent/PinnedNoteStore.js';
import { quickShortcuts } from '../agent/QuickShortcutStore.js';
import { accountingReports } from '../agent/AccountingReportStore.js';
import { AccountingMonitorService } from '../agent/AccountingMonitorService.js';
import { attachmentIdAllocator } from '../agent/AttachmentIdAllocator.js';
import { runTool } from '../agent/toolRegistry.js';
import { projectService } from '../agent/ProjectService.js';
import { Phase1DependencyManager } from './Phase1DependencyManager.js';
import { SpeechService } from './SpeechService.js';
import { SystemPresence } from './SystemPresence.js';
import { LocalAssetLibrary } from './LocalAssetLibrary.js';
import { isRemovedAvatar } from './RemovedAvatars.js';
import { BrainProviderStore } from './BrainProviderStore.js';
import { setRuntimeProviderConfig,onlineBrainPoolFromEnv } from '../agent/OnlineBrainPool.js';

const execFileAsync=promisify(execFile),__dirname=path.dirname(fileURLToPath(import.meta.url));
const isDev=!app.isPackaged&&process.env.NODE_ENV!=='production';
if(isDev){
  const slot=String(process.env.BLACK_CLOVER_DEV_SLOT||'').replace(/[^a-z0-9_-]/gi,'').slice(0,24);
  const suffix=slot?'-'+slot:'';
  app.setPath('userData',path.join(app.getPath('appData'),'BlackCloverLiveDev'+suffix));
  app.setPath('cache',path.join(app.getPath('temp'),'BlackCloverLiveDevCache'+suffix));
  app.commandLine.appendSwitch('remote-debugging-port',String(process.env.BLACK_CLOVER_DEBUG_PORT||'9223'));
}
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
let avatarWin=null,chatWin=null,islandWin=null,pinsWin=null,remindersWin=null,projectsWin=null,motionsWin=null,wardrobeWin=null,tray=null,quitting=false,reminderTimer=null,learningTimer=null,autoProvisionStarted=false,provisioning=false,brainStore=null,uiState={mode:'online',detail:'Online • آماده',updatedAt:Date.now()};
const avatarLockPath=()=>path.join(app.getPath('userData'),'avatar-lock.json');
function avatarLockState(){try{const x=JSON.parse(fs.readFileSync(avatarLockPath(),'utf8'));if(isRemovedAvatar(x))return setAvatarLockState({locked:false,name:''});return {locked:Boolean(x?.locked),name:String(x?.name||'')};}catch{return {locked:false,name:''};}}
function setAvatarLockState(payload={}){const next={locked:Boolean(payload.locked),name:String(payload.name||'')};fs.mkdirSync(path.dirname(avatarLockPath()),{recursive:true});fs.writeFileSync(avatarLockPath(),JSON.stringify(next,null,2),'utf8');return next;}
const livingWindows=()=>[avatarWin,chatWin,islandWin,pinsWin,remindersWin,projectsWin,motionsWin,wardrobeWin].filter(w=>w&&!w.isDestroyed());
const send=event=>{for(const w of livingWindows())w.webContents.send('agent:event',event);};
const accountingMonitor=new AccountingMonitorService({store:accountingReports,emit:send});
function setUiState(mode='online',detail=''){uiState={mode:String(mode||'online'),detail:String(detail||''),updatedAt:Date.now()};send({type:'ui-state',...uiState});return uiState;}
function surfaceState(){return {avatarVisible:Boolean(avatarWin&&!avatarWin.isDestroyed()&&avatarWin.isVisible()),chatVisible:Boolean(chatWin&&!chatWin.isDestroyed()&&chatWin.isVisible()),islandVisible:Boolean(islandWin&&!islandWin.isDestroyed()&&islandWin.isVisible()),pinsVisible:Boolean(pinsWin&&!pinsWin.isDestroyed()&&pinsWin.isVisible()),remindersVisible:Boolean(remindersWin&&!remindersWin.isDestroyed()&&remindersWin.isVisible()),projectsVisible:Boolean(projectsWin&&!projectsWin.isDestroyed()&&projectsWin.isVisible()),motionsVisible:Boolean(motionsWin&&!motionsWin.isDestroyed()&&motionsWin.isVisible()),wardrobeVisible:Boolean(wardrobeWin&&!wardrobeWin.isDestroyed()&&wardrobeWin.isVisible()),alwaysOnTop:Boolean(avatarWin&&!avatarWin.isDestroyed()&&avatarWin.isAlwaysOnTop()),uiState};}
function announceSurfaceState(){send({type:'surface-state',state:surfaceState()});}
function sendWhenReady(w,channel,payload){if(!w||w.isDestroyed())return;const deliver=()=>{if(w&&!w.isDestroyed())w.webContents.send(channel,payload);};if(w.webContents.isLoadingMainFrame?.()||w.webContents.isLoading?.())w.webContents.once('did-finish-load',deliver);else deliver();}
function showAnimated(w,bounds,{focus=true}={}){const wasVisible=w.isVisible();if(w.isMinimized())w.restore();if(bounds)w.setBounds(bounds);w.show();w.moveTop();if(!wasVisible)sendWhenReady(w,'assistant:surface-opening');if(focus)w.focus();setTimeout(announceSurfaceState,30);return w;}
function hideAnimated(w){if(!w||w.isDestroyed()||!w.isVisible())return;w.webContents.send('assistant:surface-closing');setTimeout(()=>{if(w&&!w.isDestroyed()){w.hide();announceSurfaceState();}},135);}
const sendAvatar=(channel,payload)=>{if(avatarWin&&!avatarWin.isDestroyed())avatarWin.webContents.send(channel,payload);};
const agent=new Agent({emit:send}),deps=new Phase1DependencyManager({emit:send}),speech=new SpeechService(),localAssets=new LocalAssetLibrary(()=>app.getPath('desktop')),presence=new SystemPresence({emit:e=>{send(e);if(e.type==='break-reminder'&&Notification.isSupported())new Notification({title:'Maria • Black Clover',body:e.text,silent:true}).show();}});

function loadSurface(w,surface){if(isDev)w.loadURL(`http://127.0.0.1:5173/?surface=${surface}`);else w.loadFile(path.join(__dirname,'../../dist/index.html'),{query:{surface}});}
function displayWorkArea(){return screen.getPrimaryDisplay().workArea;}
function avatarBounds(){const a=displayWorkArea(),width=Math.min(405,Math.max(340,Math.round(a.width*.22))),height=Math.min(660,Math.max(540,Math.round(a.height*.68)));return {width,height,x:a.x+a.width-width-14,y:a.y+a.height-height-10};}
function chatBounds(){const a=displayWorkArea(),avatar=avatarBounds(),width=Math.min(540,Math.max(470,Math.round(a.width*.30))),height=Math.min(700,Math.max(590,Math.round(a.height*.72)));let x=avatar.x-width-18;if(x<a.x+10)x=a.x+22;return {width,height,x,y:a.y+Math.max(18,Math.round((a.height-height)/2))};}
function utilityBounds(){const b=chatBounds();return {...b,width:Math.min(560,b.width+20),height:Math.min(720,b.height+20)};}
function islandBounds(mode='compact'){const a=displayWorkArea();const size=mode==='expanded'?{width:Math.min(1120,Math.max(820,Math.round(a.width*.66))),height:610}:mode==='peek'?{width:Math.min(480,Math.max(390,Math.round(a.width*.24))),height:52}:{width:Math.min(980,Math.max(720,Math.round(a.width*.52))),height:86};return {...size,x:a.x+Math.round((a.width-size.width)/2),y:a.y};}
function projectsBounds(){const a=displayWorkArea(),width=Math.min(1120,Math.max(820,Math.round(a.width*.72))),height=Math.min(780,Math.max(620,Math.round(a.height*.82)));return {width,height,x:a.x+Math.max(12,Math.round((a.width-width)/2)),y:a.y+Math.max(12,Math.round((a.height-height)/2))};}
function assetBounds(){const a=displayWorkArea(),width=Math.min(980,Math.max(760,Math.round(a.width*.62))),height=Math.min(820,Math.max(620,Math.round(a.height*.80)));return {width,height,x:a.x+Math.max(12,Math.round((a.width-width)/2)),y:a.y+Math.max(12,Math.round((a.height-height)/2))};}
function commonWebPreferences(){return {preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false};}

async function beginAutoProvision(){if(autoProvisionStarted||!app.isPackaged||process.platform!=='win32')return;autoProvisionStarted=true;try{if(!await deps.needsProvisioning())return;provisioning=true;send({type:'provision',state:'needed',message:'Full Setup ماریا در حال آماده‌سازی است'});await deps.installAll({includeOptional:true});}catch(e){console.warn('Auto provision:',e.message);send({type:'provision',state:'partial',message:`آماده‌سازی کامل نشد: ${e.message}`});}finally{provisioning=false;}}
function createAvatarWindow(){if(avatarWin&&!avatarWin.isDestroyed())return avatarWin;const b=avatarBounds();avatarWin=new BrowserWindow({...b,minWidth:330,minHeight:500,transparent:true,frame:false,backgroundColor:'#00000000',show:true,resizable:true,alwaysOnTop:true,skipTaskbar:true,hasShadow:false,title:'Maria • Black Clover',webPreferences:commonWebPreferences()});loadSurface(avatarWin,'avatar');avatarWin.setAlwaysOnTop(true,'floating');avatarWin.webContents.on('context-menu',()=>desktopMenu().popup({window:avatarWin}));avatarWin.webContents.once('did-finish-load',()=>{setTimeout(()=>{if(avatarWin&&!avatarWin.isDestroyed()){avatarWin.setBounds(avatarBounds());avatarWin.showInactive();avatarWin.setAlwaysOnTop(true,'floating');}},120);setTimeout(beginAutoProvision,900);});avatarWin.on('close',e=>{if(!quitting){e.preventDefault();avatarWin.hide();}});avatarWin.on('closed',()=>{avatarWin=null;});return avatarWin;}
function createIslandWindow(){if(islandWin&&!islandWin.isDestroyed())return islandWin;const b=islandBounds('compact');islandWin=new BrowserWindow({...b,minWidth:390,minHeight:48,transparent:true,frame:false,backgroundColor:'#00000000',show:false,resizable:false,alwaysOnTop:true,skipTaskbar:true,hasShadow:false,title:'MARIA Command Island',webPreferences:commonWebPreferences()});loadSurface(islandWin,'island');islandWin.setAlwaysOnTop(true,'floating');islandWin.on('close',e=>{if(!quitting){e.preventDefault();islandWin.hide();}});islandWin.on('closed',()=>{islandWin=null;});return islandWin;}
function setIslandMode(mode='compact'){const safe=['peek','compact','expanded'].includes(mode)?mode:'compact',w=createIslandWindow();w.setBounds(islandBounds(safe),true);w.setAlwaysOnTop(true,'floating');if(!w.isVisible())w.showInactive();announceSurfaceState();return {ok:true,mode:safe,bounds:w.getBounds()};}
function showIsland(mode='compact'){const w=createIslandWindow();w.setBounds(islandBounds(mode));w.showInactive();w.setAlwaysOnTop(true,'floating');announceSurfaceState();return w;}
function showIslandModule(module='home'){const w=showIsland('expanded');sendWhenReady(w,'assistant:island-module',{module:String(module||'home')});return w;}
function hideIsland(){hideAnimated(islandWin);}
function createChatWindow(){if(chatWin&&!chatWin.isDestroyed())return chatWin;const b=chatBounds();chatWin=new BrowserWindow({...b,minWidth:470,minHeight:560,transparent:true,frame:false,backgroundColor:'#00000000',show:false,resizable:true,hasShadow:true,title:'Maria Chat',webPreferences:commonWebPreferences()});loadSurface(chatWin,'chat');chatWin.on('close',e=>{if(!quitting){e.preventDefault();chatWin.hide();}});chatWin.on('closed',()=>{chatWin=null;});return chatWin;}
function createUtilityWindow(surface){const key=surface==='pins'?'pins':'reminders',current=key==='pins'?pinsWin:remindersWin;if(current&&!current.isDestroyed())return current;const b=utilityBounds(),w=new BrowserWindow({...b,minWidth:480,minHeight:560,transparent:true,frame:false,backgroundColor:'#00000000',show:false,resizable:true,hasShadow:true,title:key==='pins'?'Maria Pins':'Maria Reminders',webPreferences:commonWebPreferences()});loadSurface(w,key);w.on('close',e=>{if(!quitting){e.preventDefault();w.hide();}});w.on('closed',()=>{if(key==='pins')pinsWin=null;else remindersWin=null;});if(key==='pins')pinsWin=w;else remindersWin=w;return w;}
function createProjectsWindow(){if(projectsWin&&!projectsWin.isDestroyed())return projectsWin;const b=projectsBounds();projectsWin=new BrowserWindow({...b,minWidth:820,minHeight:600,transparent:true,frame:false,backgroundColor:'#00000000',show:false,resizable:true,hasShadow:true,title:'Maria Projects',webPreferences:commonWebPreferences()});loadSurface(projectsWin,'projects');projectsWin.on('close',e=>{if(!quitting){e.preventDefault();projectsWin.hide();}});projectsWin.on('closed',()=>{projectsWin=null;});return projectsWin;}
function createAssetWindow(surface){const isMotion=surface==='motions',current=isMotion?motionsWin:wardrobeWin;if(current&&!current.isDestroyed())return current;const b=assetBounds(),w=new BrowserWindow({...b,minWidth:720,minHeight:580,transparent:true,frame:false,backgroundColor:'#00000000',show:false,resizable:true,hasShadow:true,title:isMotion?'Maria Motions':'Maria Wardrobe',webPreferences:commonWebPreferences()});loadSurface(w,surface);w.on('close',e=>{if(!quitting){e.preventDefault();w.hide();}});w.on('closed',()=>{if(isMotion)motionsWin=null;else wardrobeWin=null;});if(isMotion)motionsWin=w;else wardrobeWin=w;return w;}
function showAvatar(){return showAnimated(createAvatarWindow(),avatarBounds(),{focus:false});}
function showChat({focus=true}={}){showAvatar();const w=showAnimated(createChatWindow(),chatBounds(),{focus});if(focus)sendWhenReady(w,'assistant:focus-input');return w;}
function showUtility(surface){showAvatar();return showAnimated(createUtilityWindow(surface),utilityBounds());}
function showProjects(){showAvatar();return showAnimated(createProjectsWindow(),projectsBounds());}
function showAssetSurface(surface){showAvatar();return showAnimated(createAssetWindow(surface),assetBounds());}
function hideChat(){hideAnimated(chatWin);}
function hideAvatar(){hideAnimated(avatarWin);}
function hideUtility(surface){hideAnimated(surface==='pins'?pinsWin:remindersWin);}
function hideProjects(){hideAnimated(projectsWin);}
function hideAssetSurface(surface){hideAnimated(surface==='motions'?motionsWin:wardrobeWin);}
function toggleAvatar(){if(avatarWin&&!avatarWin.isDestroyed()&&avatarWin.isVisible())hideAvatar();else showAvatar();}
function toggleAlwaysOnTop(){const w=showAvatar(),next=!w.isAlwaysOnTop();w.setAlwaysOnTop(next,next?'floating':'normal');return next;}
function toggleChat(){if(chatWin&&!chatWin.isDestroyed()&&chatWin.isVisible())hideChat();else showChat();}

function trayIcon(){return nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAK0lEQVR42mNkYPj/n4ECwESJ5lEDRg0YNYDQgBqGQWjAoAGjBgwaMGgAAJs7Ah7lQ3jMAAAAAElFTkSuQmCC').resize({width:16,height:16});}
async function installAllFromTray(){if(provisioning)return;provisioning=true;try{await deps.installAll({includeOptional:true});}catch{}finally{provisioning=false;}}
function desktopMenu(){const pinned=Boolean(avatarWin&&!avatarWin.isDestroyed()&&avatarWin.isAlwaysOnTop());return Menu.buildFromTemplate([{label:'پنل بالای MARIA',click:()=>showIsland('compact')},{label:'نمایش ماریا',click:showAvatar},{label:'مخفی کردن ماریا',click:hideAvatar},{label:'باز کردن چت',click:()=>showChat()},{label:'پین‌شده‌ها',click:()=>showIslandModule('pins')},{label:'یادآورها و کارهای زمان‌بندی‌شده',click:()=>showIslandModule('tasks')},{label:'پروژه‌ها',click:showProjects},{label:'حرکت‌ها',click:()=>showAssetSurface('motions')},{label:'لباس و وسایل',click:()=>showAssetSurface('wardrobe')},{type:'separator'},{label:pinned?'برداشتن از روی همه پنجره‌ها':'همیشه روی پنجره‌ها',type:'checkbox',checked:pinned,click:toggleAlwaysOnTop},{label:'تنظیمات ماریا',click:()=>{const w=showChat();w.webContents.send('assistant:open-settings');}},{type:'separator'},{label:'آماده‌سازی کامل ابزارها',click:installAllFromTray},{label:'اجرا با دسترسی Administrator',click:()=>restartElevated().catch(()=>{})},{type:'separator'},{label:'خروج کامل',click:()=>{quitting=true;app.quit();}}]);}
function createTray(){if(tray)return;tray=new Tray(trayIcon());tray.setToolTip('Maria • Black Clover');const refresh=()=>tray.setContextMenu(desktopMenu());refresh();tray.on('right-click',refresh);tray.on('click',toggleAvatar);}
function psQuote(s){return `'${String(s).replaceAll("'","''")}'`;}
async function isAdmin(){try{const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command','([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'],{windowsHide:true,timeout:10000});return stdout.trim().toLowerCase()==='true';}catch{return false;}}
async function restartElevated(){if(process.platform!=='win32')throw new Error('Administrator elevation is only available on Windows.');if(await isAdmin())return {ok:true,already:true};const args=app.isPackaged?[]:[app.getAppPath()],argList=args.length?` -ArgumentList ${args.map(psQuote).join(',')}`:'';await execFileAsync('powershell.exe',['-NoProfile','-Command',`Start-Process -FilePath ${psQuote(process.execPath)}${argList} -Verb RunAs`],{windowsHide:true,timeout:60000});setTimeout(()=>{quitting=true;app.quit();},350);return {ok:true};}
function startupStatus(){const s=app.getLoginItemSettings();return {openAtLogin:Boolean(s.openAtLogin),executableWillLaunchAtLogin:Boolean(s.executableWillLaunchAtLogin),path:process.execPath};}
function setStartup(enabled){if(!app.isPackaged)return {ok:false,message:'Start-with-Windows is enabled after installing the packaged app.',...startupStatus()};app.setLoginItemSettings({openAtLogin:Boolean(enabled),path:process.execPath,args:[]});return {ok:true,...startupStatus()};}
function startReminderPump(){if(reminderTimer)return;reminderTimer=setInterval(async()=>{try{for(const item of await reminders.takeDue()){const text=item.message||item.label||item.instruction||'یادآوری';send({type:'reminder',item,text});if(Notification.isSupported())new Notification({title:'یادآوری ماریا',body:text}).show();}}catch(e){console.warn('Reminder pump:',e.message);}},5000);}
function startIdleLearningPump(){if(learningTimer)return;learningTimer=setInterval(async()=>{try{if(provisioning)return;const idle=presence.status().idleSeconds;if(!Number.isFinite(idle)||idle<300)return;const dependencyState=await deps.status();if(!dependencyState.recommendedReady)return;await agent.improveOne({allowCurriculum:true});}catch(e){console.warn('Idle learning:',e.message);}},10*60*1000);}
async function refreshBrainProviders(){if(!brainStore)brainStore=new BrainProviderStore();const cfg=await brainStore.runtimeConfig();setRuntimeProviderConfig(cfg);agent.client.online=onlineBrainPoolFromEnv();projectService.reloadBrains();return {settings:await brainStore.publicState(),catalog:await agent.modelCatalog()};}

const gotLock=app.requestSingleInstanceLock();if(!gotLock){app.quit();}else app.on('second-instance',()=>{showAvatar();showChat();});
app.whenReady().then(async()=>{brainStore=new BrainProviderStore();await refreshBrainProviders().catch(e=>console.warn('Brain providers:',e.message));createAvatarWindow();showIsland('compact');createTray();presence.start();
reminders.setActionExecutor(async item=>{setUiState('executing','اجرای کار زمان‌بندی‌شده');try{const out=await agent.chat(String(item.instruction||''),{profile:'scheduled-action'});send({type:'scheduled-action',item,result:out});return out;}finally{setUiState('online','Online • آماده');}});
startReminderPump();accountingMonitor.start().catch(e=>console.warn('Accounting monitor:',e.message));startIdleLearningPump();setTimeout(()=>runTool('get_volume',{}).catch(()=>{}),250);globalShortcut.register('CommandOrControl+Shift+Space',toggleChat);app.on('activate',()=>{showAvatar();showIsland('compact');});});
app.on('before-quit',()=>{quitting=true;});
app.on('will-quit',()=>{globalShortcut.unregisterAll();presence.stop();accountingMonitor.stop().catch(()=>{});if(reminderTimer)clearInterval(reminderTimer);if(learningTimer)clearInterval(learningTimer);});
app.on('window-all-closed',()=>{});

ipcMain.handle('agent:chat',async(_e,payload)=>{const text=typeof payload==='object'&&payload!==null?payload.text:payload,options=typeof payload==='object'&&payload!==null?(payload.options||{}):{};setUiState('working','در حال پردازش درخواست');try{const response=await agent.chat(String(text??''),{modelOverride:options.model||options.modelOverride||'auto',profile:options.profile||null});sendAvatar('assistant:response',response);return response;}catch(error){setUiState('error',String(error?.message||error));throw error;}finally{if(uiState.mode!=='listening')setUiState('online','Online • آماده');}});
ipcMain.handle('agent:confirm',async(_e,payload)=>{const response=await agent.confirm(payload);sendAvatar('assistant:response',response);return response;});
ipcMain.handle('agent:status',()=>agent.status());
ipcMain.handle('brain:catalog',()=>agent.modelCatalog());
ipcMain.handle('brain:settings',async()=>{if(!brainStore)brainStore=new BrainProviderStore();return brainStore.publicState();});
ipcMain.handle('brain:save-provider',async(_e,payload)=>{if(!brainStore)brainStore=new BrainProviderStore();await brainStore.saveProvider(payload||{});return refreshBrainProviders();});
ipcMain.handle('brain:remove-provider',async(_e,provider)=>{if(!brainStore)brainStore=new BrainProviderStore();await brainStore.removeProvider(String(provider||''));return refreshBrainProviders();});
ipcMain.handle('brain:test-provider',async(_e,provider)=>{await refreshBrainProviders();const states=await agent.client.online.health();return {provider:String(provider||''),ok:Boolean(states?.[provider]),states};});
ipcMain.handle('brain:github-login',async()=>{if(!brainStore)brainStore=new BrainProviderStore();return brainStore.startGithubLogin();});
ipcMain.handle('assistant:toggle',()=>{toggleChat();return true;});
ipcMain.handle('assistant:show-island',(_e,mode='compact')=>{showIsland(String(mode||'compact'));return true;});
ipcMain.handle('assistant:show-island-module',(_e,module='home')=>{showIslandModule(String(module||'home'));return true;});
ipcMain.handle('assistant:hide-island',()=>{hideIsland();return true;});
ipcMain.handle('assistant:set-island-mode',(_e,mode)=>setIslandMode(String(mode||'compact')));
ipcMain.handle('assistant:show-chat',()=>{showChat();return true;});
ipcMain.handle('assistant:hide-chat',()=>{hideChat();return true;});
ipcMain.handle('assistant:show-avatar',()=>{showAvatar();return true;});
ipcMain.handle('assistant:hide-avatar',()=>{hideAvatar();return true;});
ipcMain.handle('assistant:show-projects',()=>{showProjects();return true;});
ipcMain.handle('assistant:hide-projects',()=>{hideProjects();return true;});
ipcMain.handle('assistant:show-pins',()=>{showIslandModule('pins');return true;});
ipcMain.handle('assistant:hide-pins',()=>{hideIsland();return true;});
ipcMain.handle('assistant:show-reminders',()=>{showIslandModule('tasks');return true;});
ipcMain.handle('assistant:hide-reminders',()=>{hideIsland();return true;});
ipcMain.handle('assistant:show-motions',()=>{showAssetSurface('motions');return true;});
ipcMain.handle('assistant:hide-motions',()=>{hideAssetSurface('motions');return true;});
ipcMain.handle('assistant:show-wardrobe',()=>{showAssetSurface('wardrobe');return true;});
ipcMain.handle('assistant:hide-wardrobe',()=>{hideAssetSurface('wardrobe');return true;});
ipcMain.handle('assistant:toggle-top',()=>toggleAlwaysOnTop());
ipcMain.handle('assistant:window-state',()=>surfaceState());
ipcMain.handle('assistant:set-ui-state',(_e,payload)=>setUiState(payload?.mode||'online',payload?.detail||''));
ipcMain.handle('assistant:minimize-chat',()=>{const w=createChatWindow();w.minimize();return true;});
ipcMain.handle('assistant:minimize-surface',(_e,surface)=>{if(surface==='pins'||surface==='reminders'){setIslandMode('peek');return true;}const w=surface==='projects'?projectsWin:surface==='motions'?motionsWin:surface==='wardrobe'?wardrobeWin:chatWin;if(w&&!w.isDestroyed())w.minimize();return true;});
ipcMain.handle('assistant:open-settings',(_e,section='general')=>{const w=showChat();sendWhenReady(w,'assistant:open-settings',{section:String(section||'general')});return true;});
ipcMain.handle('assistant:prompt',(_e,text)=>{const w=showChat();sendWhenReady(w,'assistant:prefill-prompt',{text:String(text||''),submit:true});return true;});

ipcMain.handle('shortcuts:list',()=>quickShortcuts.list({limit:1000}));
ipcMain.handle('shortcuts:create',async(_e,payload)=>{const item=await quickShortcuts.create(payload||{});send({type:'data-changed',store:'shortcuts'});return item;});
ipcMain.handle('shortcuts:update',async(_e,payload)=>{const item=await quickShortcuts.update(String(payload?.id||''),payload?.patch||payload||{});send({type:'data-changed',store:'shortcuts'});return item;});
ipcMain.handle('shortcuts:remove',async(_e,id)=>{const ok=await quickShortcuts.remove(String(id||''));send({type:'data-changed',store:'shortcuts'});return ok;});
ipcMain.handle('shortcuts:open',async(_e,id)=>{const sid=String(id||''),item=(await quickShortcuts.list({limit:1000})).find(x=>x.id===sid);if(!item)throw new Error('Shortcut not found');const target=String(item.target||'').trim();let result;if(item.kind==='agent'||item.kind==='routine')result=await agent.chat(target,{profile:'quick-shortcut'});else if(/^https?:\/\//i.test(target)){await shell.openExternal(target);result={ok:true,type:'url',target};}else{const error=await shell.openPath(target);if(error)throw new Error(error);result={ok:true,type:'path',target};}await quickShortcuts.markUsed(sid);send({type:'data-changed',store:'shortcuts'});return result;});

ipcMain.handle('accounting:dashboard',()=>accountingReports.dashboard());
ipcMain.handle('accounting:create-monitor',async(_e,payload)=>{const item=await accountingReports.createMonitor(payload||{});await accountingMonitor.rebuildWatchers();await accountingMonitor.refreshOne(item.id,{force:true,reason:'created'});send({type:'data-changed',store:'accounting'});return item;});
ipcMain.handle('accounting:update-monitor',async(_e,payload)=>{const item=await accountingReports.updateMonitor(String(payload?.id||''),payload?.patch||{});await accountingMonitor.rebuildWatchers();send({type:'data-changed',store:'accounting'});return item;});
ipcMain.handle('accounting:remove-monitor',async(_e,id)=>{const ok=await accountingReports.removeMonitor(String(id||''));await accountingMonitor.rebuildWatchers();send({type:'data-changed',store:'accounting'});return ok;});
ipcMain.handle('accounting:refresh',(_e,payload)=>accountingMonitor.refresh({force:Boolean(payload?.force),reason:'manual'}));
ipcMain.handle('accounting:rebuild-watchers',()=>accountingMonitor.rebuildWatchers());
ipcMain.handle('accounting:open-monitor',async(_e,id)=>{const item=(await accountingReports.listMonitors()).find(x=>x.id===String(id||''));if(!item)throw new Error('Accounting workbook not found');const error=await shell.openPath(item.path);if(error)throw new Error(error);await accountingReports.markOpened(item.id);send({type:'data-changed',store:'accounting'});return {ok:true,path:item.path};});
ipcMain.handle('accounting:open-evidence-root',async(_e,id)=>{const item=(await accountingReports.listMonitors()).find(x=>x.id===String(id||''));if(!item)throw new Error('Accounting workbook not found');const root=String(item.profile?.evidenceRoot||item.profile?.attachmentRoot||'').trim();if(!root)throw new Error('Evidence root is not configured');const error=await shell.openPath(root);if(error)throw new Error(error);return {ok:true,path:root};});
ipcMain.handle('accounting:reserve-attachment-id',async(_e,id)=>{const item=(await accountingReports.listMonitors()).find(x=>x.id===String(id||''));if(!item)throw new Error('Accounting workbook not found');const root=String(item.profile?.evidenceRoot||item.profile?.attachmentRoot||'').trim();if(!root)throw new Error('Evidence root is not configured');return attachmentIdAllocator.reserve(root);});
ipcMain.handle('accounting:release-attachment-id',async(_e,reservation)=>attachmentIdAllocator.release(reservation||{}));
ipcMain.handle('accounting:inspect-attachment-ids',async(_e,id)=>{const item=(await accountingReports.listMonitors()).find(x=>x.id===String(id||''));if(!item)throw new Error('Accounting workbook not found');const root=String(item.profile?.evidenceRoot||item.profile?.attachmentRoot||'').trim();if(!root)throw new Error('Evidence root is not configured');return attachmentIdAllocator.inspect(root);});

ipcMain.handle('assets:list-local',()=>localAssets.list());
ipcMain.handle('assets:read-local',(_e,name)=>localAssets.read(String(name||'')));
ipcMain.handle('assets:open-folder',()=>localAssets.openFolder());
ipcMain.handle('assets:apply-avatar',async(_e,name)=>{name=String(name||'');const lock=avatarLockState();if(lock.locked&&lock.name&&lock.name!==name)throw new Error(`Character is locked to ${lock.name}. Unlock it before changing.`);const payload=await localAssets.read(name);showAvatar();sendAvatar('assistant:local-avatar',payload);return {ok:true,name:payload.name,lock};});
ipcMain.handle('avatar:apply-built-in',async(_e,payload)=>{const name=String(payload?.name||'Built-in Character'),url=String(payload?.url||'');const lock=avatarLockState();if(lock.locked&&lock.name&&lock.name!==name)throw new Error(`Character is locked to ${lock.name}. Unlock it before changing.`);if(!url.startsWith('/models/'))throw new Error('Built-in character URL is not allowed.');showAvatar();sendAvatar('assistant:built-in-avatar',{url,name,persist:true});return {ok:true,name,url,lock};});
ipcMain.handle('avatar:lock-state',()=>avatarLockState());
ipcMain.handle('avatar:set-lock',(_e,payload)=>setAvatarLockState(payload||{}));
ipcMain.handle('assets:import-motion',async(_e,name)=>{const payload=await localAssets.read(String(name||''));showAvatar();sendAvatar('assistant:local-motion',payload);return {ok:true,name:payload.name};});
ipcMain.handle('avatar:play-motion',(_e,id)=>{showAvatar();sendAvatar('assistant:play-motion',{id:String(id||'')});return true;});

ipcMain.handle('projects:list',()=>projectService.list());
ipcMain.handle('projects:catalog',()=>projectService.catalog());
ipcMain.handle('projects:create',(_e,payload)=>projectService.create(payload||{}));
ipcMain.handle('projects:update',(_e,payload)=>projectService.update(String(payload?.id||''),payload?.patch||{}));
ipcMain.handle('projects:remove',(_e,id)=>projectService.remove(String(id||'')));
ipcMain.handle('projects:chat',(_e,payload)=>projectService.chat(payload||{}));
ipcMain.handle('projects:open-vscode',(_e,id)=>projectService.openVsCode(String(id||'')));
ipcMain.handle('projects:open-folder',(_e,id)=>projectService.openFolder(String(id||'')));
ipcMain.handle('projects:git-status',(_e,id)=>projectService.gitStatus(String(id||'')));
ipcMain.handle('projects:connect-github',(_e,id)=>projectService.connectGithub(String(id||'')));
ipcMain.handle('projects:publish-github',(_e,payload)=>projectService.publishGithub(String(payload?.id||''),{message:payload?.message}));
ipcMain.handle('browser:open-service',(_e,service)=>runTool('chrome_open_service',{service:String(service||'')}));
ipcMain.handle('pins:list',()=>pinnedNotes.list({limit:500}));
ipcMain.handle('pins:create',async(_e,payload)=>{const item=await pinnedNotes.create(payload||{});send({type:'data-changed',store:'pins'});return item;});
ipcMain.handle('pins:update',async(_e,payload)=>{const item=await pinnedNotes.update(payload?.id,payload||{});send({type:'data-changed',store:'pins'});return item;});
ipcMain.handle('pins:remove',async(_e,id)=>{const ok=await pinnedNotes.remove(String(id||''));send({type:'data-changed',store:'pins'});return ok;});
ipcMain.handle('reminders:list',()=>reminders.list());
ipcMain.handle('reminders:create',async(_e,payload)=>{const item=payload?.kind==='action'?await reminders.createAction(payload):await reminders.create(payload||{});send({type:'data-changed',store:'reminders'});return item;});
ipcMain.handle('reminders:update',async(_e,payload)=>{const item=await reminders.update(String(payload?.id||''),payload?.patch||{});send({type:'data-changed',store:'reminders'});return item;});
ipcMain.handle('reminders:pause',async(_e,id)=>{const item=await reminders.pause(String(id||''));send({type:'data-changed',store:'reminders'});return item;});
ipcMain.handle('reminders:resume',async(_e,id)=>{const item=await reminders.resume(String(id||''));send({type:'data-changed',store:'reminders'});return item;});
ipcMain.handle('reminders:cancel',async(_e,id)=>{const ok=await reminders.cancel(String(id||''));send({type:'data-changed',store:'reminders'});return ok;});
ipcMain.handle('system:diagnostics',async()=>({dependencies:await deps.status(),speech:await speech.status(),presence:presence.status(),startup:startupStatus(),admin:await isAdmin(),packaged:app.isPackaged,version:app.getVersion()}));
ipcMain.handle('system:install-dependency',(_e,id)=>deps.install(String(id||'')));
ipcMain.handle('system:install-all-dependencies',()=>installAllFromTray());
ipcMain.handle('system:restart-admin',()=>restartElevated());
ipcMain.handle('system:get-startup',()=>startupStatus());
ipcMain.handle('system:set-startup',(_e,enabled)=>setStartup(enabled));
ipcMain.handle('speech:status',()=>speech.status());
ipcMain.handle('speech:transcribe',(_e,payload)=>speech.transcribe(payload?.bytes??payload,{language:payload?.language||'fa'}));
ipcMain.handle('speech:synthesize',(_e,payload)=>speech.synthesize(payload?.text,{rate:payload?.rate,volume:payload?.volume,pitch:payload?.pitch}));
