import fs from 'node:fs';

let p='C:\\Users\\cibesabz\\Black-Clover-Live\\src\\agent\\ProjectService.js';
let s=fs.readFileSync(p,'utf8');
if(!s.includes('reloadBrains(){')){
  s=s.replace(
    "  async list(){return projects.list();}",
    "  reloadBrains(){this.router=new BrainRouter();for(const session of this.sessions.values())session.agent.client=new BrainRouter();return true;}\\n  async list(){return projects.list();}"
  );
  fs.writeFileSync(p,s,'utf8');
}

p='C:\\Users\\cibesabz\\Black-Clover-Live\\src\\main\\main.js';
s=fs.readFileSync(p,'utf8');

if(!s.includes("BrainProviderStore")){
  s=s.replace(
    "import { LocalAssetLibrary } from './LocalAssetLibrary.js';",
    "import { LocalAssetLibrary } from './LocalAssetLibrary.js';\\nimport { BrainProviderStore } from './BrainProviderStore.js';\\nimport { setRuntimeProviderConfig,onlineBrainPoolFromEnv } from '../agent/OnlineBrainPool.js';"
  );
}

if(!s.includes('brainStore=null')){
  s=s.replace(
    "let avatarWin=null,chatWin=null,pinsWin=null,remindersWin=null,projectsWin=null,motionsWin=null,wardrobeWin=null,tray=null,quitting=false,reminderTimer=null,learningTimer=null,autoProvisionStarted=false,provisioning=false;",
    "let avatarWin=null,chatWin=null,pinsWin=null,remindersWin=null,projectsWin=null,motionsWin=null,wardrobeWin=null,tray=null,quitting=false,reminderTimer=null,learningTimer=null,autoProvisionStarted=false,provisioning=false,brainStore=null;"
  );
}

if(!s.includes('async function refreshBrainProviders')){
  const marker="function startIdleLearningPump(){if(learningTimer)return;learningTimer=setInterval(async()=>{try{if(provisioning)return;const idle=presence.status().idleSeconds;if(!Number.isFinite(idle)||idle<300)return;const dependencyState=await deps.status();if(!dependencyState.recommendedReady)return;await agent.improveOne({allowCurriculum:true});}catch(e){console.warn('Idle learning:',e.message);}},10*60*1000);}";
  const repl=marker+"\\nasync function refreshBrainProviders(){if(!brainStore)brainStore=new BrainProviderStore();const cfg=await brainStore.runtimeConfig();setRuntimeProviderConfig(cfg);agent.client.online=onlineBrainPoolFromEnv();projectService.reloadBrains();return {settings:await brainStore.publicState(),catalog:await agent.modelCatalog()};}";
  if(!s.includes(marker))throw new Error('idle learning marker not found');
  s=s.replace(marker,repl);
}

s=s.replace(
  "app.whenReady().then(()=>{createAvatarWindow();createTray();presence.start();startReminderPump();startIdleLearningPump();globalShortcut.register('CommandOrControl+Shift+Space',toggleChat);app.on('activate',showAvatar);});",
  "app.whenReady().then(async()=>{brainStore=new BrainProviderStore();await refreshBrainProviders().catch(e=>console.warn('Brain providers:',e.message));createAvatarWindow();createTray();presence.start();startReminderPump();startIdleLearningPump();globalShortcut.register('CommandOrControl+Shift+Space',toggleChat);app.on('activate',showAvatar);});"
);

if(!s.includes("brain:settings")){
  s=s.replace(
    "ipcMain.handle('brain:catalog',()=>agent.modelCatalog());",
    "ipcMain.handle('brain:catalog',()=>agent.modelCatalog());\\nipcMain.handle('brain:settings',async()=>{if(!brainStore)brainStore=new BrainProviderStore();return brainStore.publicState();});\\nipcMain.handle('brain:save-provider',async(_e,payload)=>{if(!brainStore)brainStore=new BrainProviderStore();await brainStore.saveProvider(payload||{});return refreshBrainProviders();});\\nipcMain.handle('brain:remove-provider',async(_e,provider)=>{if(!brainStore)brainStore=new BrainProviderStore();await brainStore.removeProvider(String(provider||''));return refreshBrainProviders();});\\nipcMain.handle('brain:test-provider',async(_e,provider)=>{await refreshBrainProviders();const states=await agent.client.online.health();return {provider:String(provider||''),ok:Boolean(states?.[provider]),states};});"
  );
}

fs.writeFileSync(p,s,'utf8');
console.log('runtime brain settings wired');
