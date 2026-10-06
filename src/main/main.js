import { app,BrowserWindow,ipcMain,globalShortcut,Tray,Menu,nativeImage,Notification,screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Agent } from '../agent/Agent.js';
import { reminders } from '../agent/ReminderStore.js';
import { pinnedNotes } from '../agent/PinnedNoteStore.js';
import { runTool } from '../agent/toolRegistry.js';
import { projectService } from '../agent/ProjectService.js';
import { Phase1DependencyManager } from './Phase1DependencyManager.js';
import { SpeechService } from './SpeechService.js';
import { SystemPresence } from './SystemPresence.js';

const execFileAsync=promisify(execFile),__dirname=path.dirname(fileURLToPath(import.meta.url));
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
let avatarWin=null,chatWin=null,pinsWin=null,remindersWin=null,projectsWin=null,tray=null,quitting=false,reminderTimer=null,learningTimer=null,autoProvisionStarted=false,provisioning=false;
const livingWindows=()=>[avatarWin,chatWin,pinsWin,remindersWin,projectsWin].filter(w=>w&&!w.isDestroyed());
const send=event=>{for(const w of livingWindows())w.webContents.send('agent:event',event);};
const sendAvatar=(channel,payload)=>{if(avatarWin&&!avatarWin.isDestroyed())avatarWin.webContents.send(channel,payload);};
const agent=new Agent({emit:send}),deps=new Phase1DependencyManager({emit:send}),speech=new SpeechService(),presence=new SystemPresence({emit:e=>{send(e);if(e.type==='break-reminder'&&Notification.isSupported())new Notification({title:'Maria • Black Clover',body:e.text,silent:true}).show();}});

function loadSurface(w,surface){const dev=process.env.NODE_ENV!=='production'&&!app.isPackaged;if(dev)w.loadURL(`http://127.0.0.1:5173/?surface=${surface}`);else w.loadFile(path.join(__dirname,'../../dist/index.html'),{query:{surface}});}
function displayWorkArea(){return screen.getPrimaryDisplay().workArea;}
function avatarBounds(){const a=displayWorkArea(),width=Math.min(405,Math.max(340,Math.round(a.width*.22))),height=Math.min(660,Math.max(540,Math.round(a.height*.68)));return {width,height,x:a.x+a.width-width-14,y:a.y+a.height-height-10};}
function chatBounds(){const a=displayWorkArea(),avatar=avatarBounds(),width=Math.min(540,Math.max(470,Math.round(a.width*.30))),height=Math.min(700,Math.max(590,Math.round(a.height*.72)));let x=avatar.x-width-18;if(x<a.x+10)x=a.x+22;return {width,height,x,y:a.y+Math.max(18,Math.round((a.height-height)/2))};}
function utilityBounds(){const b=chatBounds();return {...b,width:Math.min(560,b.width+20),height:Math.min(720,b.height+20)};}
function projectsBounds(){const a=displayWorkArea(),width=Math.min(1120,Math.max(820,Math.round(a.width*.72))),height=Math.min(780,Math.max(620,Math.round(a.height*.82)));return {width,height,x:a.x+Math.max(12,Math.round((a.width-width)/2)),y:a.y+Math.max(12,Math.round((a.height-height)/2))};}
function commonWebPreferences(){return {preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false};}

async function beginAutoProvision(){if(autoProvisionStarted||!app.isPackaged||process.platform!=='win32')return;autoProvisionStarted=true;try{if(!await deps.needsProvisioning())return;provisioning=true;send({type:'provision',state:'needed',message:'Full Setup ماریا در حال آماده‌سازی است'});await deps.installAll({includeOptional:true});}catch(e){console.warn('Auto provision:',e.message);send({type:'provision',state:'partial',message:`آماده‌سازی کامل نشد: ${e.message}`});}finally{provisioning=false;}}
function createAvatarWindow(){if(avatarWin&&!avatarWin.isDestroyed())return avatarWin;const b=avatarBounds();avatarWin=new BrowserWindow({...b,minWidth:330,minHeight:500,transparent:true,frame:false,backgroundColor:'#00000000',show:true,resizable:true,alwaysOnTop:true,skipTaskbar:true,hasShadow:false,title:'Maria • Black Clover',webPreferences:commonWebPreferences()});loadSurface(avatarWin,'avatar');avatarWin.setAlwaysOnTop(true,'floating');avatarWin.webContents.on('context-menu',()=>desktopMenu().popup({window:avatarWin}));avatarWin.webContents.once('did-finish-load',()=>{setTimeout(()=>{if(avatarWin&&!avatarWin.isDestroyed()){avatarWin.setBounds(avatarBounds());avatarWin.showInactive();avatarWin.setAlwaysOnTop(true,'floating');}},120);setTimeout(beginAutoProvision,900);});avatarWin.on('close',e=>{if(!quitting){e.preventDefault();avatarWin.hide();}});avatarWin.on('closed',()=>{avatarWin=null;});return avatarWin;}
function createChatWindow(){if(chatWin&&!chatWin.isDestroyed())return chatWin;const b=chatBounds();chatWin=new BrowserWindow({...b,minWidth:470,minHeight:560,transparent:true,frame:false,backgroundColor:'#00000000',show:false,resizable:true,hasShadow:true,title:'Maria Chat',webPreferences:commonWebPreferences()});loadSurface(chatWin,'chat');chatWin.on('close',e=>{if(!quitting){e.preventDefault();chatWin.hide();}});chatWin.on('closed',()=>{chatWin=null;});return chatWin;}
function createUtilityWindow(surface){const key=surface==='pins'?'pins':'reminders',current=key==='pins'?pinsWin:remindersWin;if(current&&!current.isDestroyed())return current;const b=utilityBounds(),w=new BrowserWindow({...b,minWidth:480,minHeight:560,transparent:true,frame:false,backgroundColor:'#00000000',show:false,resizable:true,hasShadow:true,title:key==='pins'?'Maria Pins':'Maria Reminders',webPreferences:commonWebPreferences()});loadSurface(w,key);w.on('close',e=>{if(!quitting){e.preventDefault();w.hide();}});w.on('closed',()=>{if(key==='pins')pinsWin=null;else remindersWin=null;});if(key==='pins')pinsWin=w;else remindersWin=w;return w;}
function createProjectsWindow(){if(projectsWin&&!projectsWin.isDestroyed())return projectsWin;const b=projectsBounds();projectsWin=new BrowserWindow({...b,minWidth:820,minHeight:600,transparent:true,frame:false,backgroundColor:'#00000000',show:false,resizable:true,hasShadow:true,title:'Maria Projects',webPreferences:commonWebPreferences()});loadSurface(projectsWin,'projects');projectsWin.on('close',e=>{if(!quitting){e.preventDefault();projectsWin.hide();}});projectsWin.on('closed',()=>{projectsWin=null;});return projectsWin;}
function showAvatar(){const w=createAvatarWindow();if(w.isMinimized())w.restore();w.setBounds(avatarBounds());w.show();return w;}
function showChat({focus=true}={}){showAvatar();const w=createChatWindow();if(w.isMinimized())w.restore();w.setBounds(chatBounds());w.show();w.moveTop();if(focus){w.focus();w.webContents.send('assistant:focus-input');}return w;}
function showUtility(surface){showAvatar();const w=createUtilityWindow(surface);if(w.isMinimized())w.restore();w.setBounds(utilityBounds());w.show();w.moveTop();w.focus();return w;}
function showProjects(){showAvatar();const w=createProjectsWindow();if(w.isMinimized())w.restore();w.setBounds(projectsBounds());w.show();w.moveTop();w.focus();return w;}
function hideChat(){if(chatWin&&!chatWin.isDestroyed())chatWin.hide();}
function hideAvatar(){if(avatarWin&&!avatarWin.isDestroyed())avatarWin.hide();}
function hideUtility(surface){const w=surface==='pins'?pinsWin:remindersWin;if(w&&!w.isDestroyed())w.hide();}
function hideProjects(){if(projectsWin&&!projectsWin.isDestroyed())projectsWin.hide();}
function toggleAvatar(){if(avatarWin&&!avatarWin.isDestroyed()&&avatarWin.isVisible())hideAvatar();else showAvatar();}
function toggleAlwaysOnTop(){const w=showAvatar(),next=!w.isAlwaysOnTop();w.setAlwaysOnTop(next,next?'floating':'normal');return next;}
function toggleChat(){if(chatWin&&!chatWin.isDestroyed()&&chatWin.isVisible())hideChat();else showChat();}

function trayIcon(){return nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAK0lEQVR42mNkYPj/n4ECwESJ5lEDRg0YNYDQgBqGQWjAoAGjBgwaMGgAAJs7Ah7lQ3jMAAAAAElFTkSuQmCC').resize({width:16,height:16});}
async function installAllFromTray(){if(provisioning)return;provisioning=true;try{await deps.installAll({includeOptional:true});}catch{}finally{provisioning=false;}}
function desktopMenu(){const pinned=Boolean(avatarWin&&!avatarWin.isDestroyed()&&avatarWin.isAlwaysOnTop());return Menu.buildFromTemplate([{label:'نمایش ماریا',click:showAvatar},{label:'مخفی کردن ماریا',click:hideAvatar},{label:'باز کردن چت',click:()=>showChat()},{label:'پین‌شده‌ها',click:()=>showUtility('pins')},{label:'یادآورها و کارهای زمان‌بندی‌شده',click:()=>showUtility('reminders')},{label:'پروژه‌ها',click:showProjects},{type:'separator'},{label:pinned?'برداشتن از روی همه پنجره‌ها':'همیشه روی پنجره‌ها',type:'checkbox',checked:pinned,click:toggleAlwaysOnTop},{label:'تنظیمات ماریا',click:()=>{const w=showChat();w.webContents.send('assistant:open-settings');}},{type:'separator'},{label:'آماده‌سازی کامل ابزارها',click:installAllFromTray},{label:'اجرا با دسترسی Administrator',click:()=>restartElevated().catch(()=>{})},{type:'separator'},{label:'خروج کامل',click:()=>{quitting=true;app.quit();}}]);}
function createTray(){if(tray)return;tray=new Tray(trayIcon());tray.setToolTip('Maria • Black Clover');const refresh=()=>tray.setContextMenu(desktopMenu());refresh();tray.on('right-click',refresh);tray.on('click',toggleAvatar);}
function psQuote(s){return `'${String(s).replaceAll("'","''")}'`;}
async function isAdmin(){try{const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command','([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)'],{windowsHide:true,timeout:10000});return stdout.trim().toLowerCase()==='true';}catch{return false;}}
async function restartElevated(){if(process.platform!=='win32')throw new Error('Administrator elevation is only available on Windows.');if(await isAdmin())return {ok:true,already:true};const args=app.isPackaged?[]:[app.getAppPath()],argList=args.length?` -ArgumentList ${args.map(psQuote).join(',')}`:'';await execFileAsync('powershell.exe',['-NoProfile','-Command',`Start-Process -FilePath ${psQuote(process.execPath)}${argList} -Verb RunAs`],{windowsHide:true,timeout:60000});setTimeout(()=>{quitting=true;app.quit();},350);return {ok:true};}
function startupStatus(){const s=app.getLoginItemSettings();return {openAtLogin:Boolean(s.openAtLogin),executableWillLaunchAtLogin:Boolean(s.executableWillLaunchAtLogin),path:process.execPath};}
function setStartup(enabled){if(!app.isPackaged)return {ok:false,message:'Start-with-Windows is enabled after installing the packaged app.',...startupStatus()};app.setLoginItemSettings({openAtLogin:Boolean(enabled),path:process.execPath,args:[]});return {ok:true,...startupStatus()};}
function startReminderPump(){if(reminderTimer)return;reminderTimer=setInterval(async()=>{try{for(const item of await reminders.takeDue()){const text=item.message||item.label||item.instruction||'یادآوری';send({type:'reminder',item,text});if(Notification.isSupported())new Notification({title:'یادآوری ماریا',body:text}).show();}}catch(e){console.warn('Reminder pump:',e.message);}},5000);}
function startIdleLearningPump(){if(learningTimer)return;learningTimer=setInterval(async()=>{try{if(provisioning)return;const idle=presence.status().idleSeconds;if(!Number.isFinite(idle)||idle<300)return;const dependencyState=await deps.status();if(!dependencyState.recommendedReady)return;await agent.improveOne({allowCurriculum:true});}catch(e){console.warn('Idle learning:',e.message);}},10*60*1000);}

const gotLock=app.requestSingleInstanceLock();if(!gotLock){app.quit();}else app.on('second-instance',()=>{showAvatar();showChat();});
app.whenReady().then(()=>{createAvatarWindow();createTray();presence.start();startReminderPump();startIdleLearningPump();globalShortcut.register('CommandOrControl+Shift+Space',toggleChat);app.on('activate',showAvatar);});
app.on('before-quit',()=>{quitting=true;});
app.on('will-quit',()=>{globalShortcut.unregisterAll();presence.stop();if(reminderTimer)clearInterval(reminderTimer);if(learningTimer)clearInterval(learningTimer);});
app.on('window-all-closed',()=>{});

ipcMain.handle('agent:chat',async(_e,payload)=>{const text=typeof payload==='object'&&payload!==null?payload.text:payload,options=typeof payload==='object'&&payload!==null?(payload.options||{}):{};const response=await agent.chat(String(text??''),{modelOverride:options.model||options.modelOverride||'auto',profile:options.profile||null});sendAvatar('assistant:response',response);return response;});
ipcMain.handle('agent:confirm',async(_e,payload)=>{const response=await agent.confirm(payload);sendAvatar('assistant:response',response);return response;});
ipcMain.handle('agent:status',()=>agent.status());
ipcMain.handle('agent:runtime-runs',(_e,options)=>agent.runtimeV2?.recentRuns?.(options||{})||[]);
ipcMain.handle('agent:runtime-error-report',(_e,options)=>agent.runtimeV2?.diagnosticReport?.(options||{})||{generatedAt:new Date().toISOString(),errors:[]});
ipcMain.handle('brain:catalog',()=>agent.modelCatalog());
ipcMain.handle('assistant:toggle',()=>{toggleChat();return true;});
ipcMain.handle('assistant:show-chat',()=>{showChat();return true;});
ipcMain.handle('assistant:hide-chat',()=>{hideChat();return true;});
ipcMain.handle('assistant:show-avatar',()=>{showAvatar();return true;});
ipcMain.handle('assistant:hide-avatar',()=>{hideAvatar();return true;});
ipcMain.handle('assistant:show-projects',()=>{showProjects();return true;});
ipcMain.handle('assistant:hide-projects',()=>{hideProjects();return true;});
ipcMain.handle('assistant:show-pins',()=>{showUtility('pins');return true;});
ipcMain.handle('assistant:hide-pins',()=>{hideUtility('pins');return true;});
ipcMain.handle('assistant:show-reminders',()=>{showUtility('reminders');return true;});
ipcMain.handle('assistant:hide-reminders',()=>{hideUtility('reminders');return true;});
ipcMain.handle('assistant:toggle-top',()=>toggleAlwaysOnTop());
ipcMain.handle('assistant:window-state',()=>({avatarVisible:Boolean(avatarWin&&!avatarWin.isDestroyed()&&avatarWin.isVisible()),chatVisible:Boolean(chatWin&&!chatWin.isDestroyed()&&chatWin.isVisible()),projectsVisible:Boolean(projectsWin&&!projectsWin.isDestroyed()&&projectsWin.isVisible()),alwaysOnTop:Boolean(avatarWin&&!avatarWin.isDestroyed()&&avatarWin.isAlwaysOnTop())}));
ipcMain.handle('assistant:minimize-chat',()=>{const w=createChatWindow();w.minimize();return true;});
ipcMain.handle('assistant:minimize-surface',(_e,surface)=>{const w=surface==='pins'?pinsWin:surface==='reminders'?remindersWin:surface==='projects'?projectsWin:chatWin;if(w&&!w.isDestroyed())w.minimize();return true;});
ipcMain.handle('assistant:open-settings',()=>{const w=showChat();w.webContents.send('assistant:open-settings');return true;});
ipcMain.handle('assistant:prompt',(_e,text)=>{const w=showChat();w.webContents.send('assistant:prefill-prompt',{text:String(text||''),submit:true});return true;});

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
