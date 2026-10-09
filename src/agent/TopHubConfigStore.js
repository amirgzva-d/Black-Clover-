import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const defaultDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');

const DEFAULTS={
  version:1,
  settings:{
    enabled:true,
    monitorMode:'active',
    openOnHover:true,
    hoverDelayMs:180,
    autoCollapseMs:4500,
    alwaysOnTop:true,
    followActiveDisplay:false,
    reducedMotion:false,
    compactShortcutLimit:8,
    moduleOrder:['shortcuts','accounting','pins-automation','reserved-4']
  },
  shortcuts:[]
};

const cleanText=(v,max=300)=>String(v??'').trim().slice(0,max);

export class TopHubConfigStore{
  constructor({directory=defaultDir()}={}){
    this.directory=directory;
    this.file=path.join(directory,'top-hub-v1.json');
    this.state=structuredClone(DEFAULTS);
    this.loaded=false;
    this.saveChain=Promise.resolve();
  }
  async load(){
    if(this.loaded)return this.snapshot();
    this.loaded=true;
    try{
      const raw=JSON.parse(await fs.readFile(this.file,'utf8'));
      this.state={
        version:1,
        settings:{...DEFAULTS.settings,...(raw?.settings||{})},
        shortcuts:Array.isArray(raw?.shortcuts)?raw.shortcuts:[]
      };
    }catch(e){
      if(e.code!=='ENOENT')console.warn('TopHubConfigStore load failed:',e.message);
    }
    return this.snapshot();
  }
  snapshot(){return structuredClone(this.state);}
  async save(){
    const snapshot=JSON.stringify({...this.state,updatedAt:new Date().toISOString()},null,2);
    const run=this.saveChain.catch(()=>{}).then(async()=>{
      await fs.mkdir(this.directory,{recursive:true});
      const tmp=this.file+'.tmp';
      await fs.writeFile(tmp,snapshot,'utf8');
      await fs.rename(tmp,this.file);
    });
    this.saveChain=run;
    return run;
  }
  async updateSettings(patch={}){
    await this.load();
    const next={...this.state.settings,...patch};
    if(Array.isArray(patch.moduleOrder))next.moduleOrder=[...new Set(patch.moduleOrder.map(String))].slice(0,24);
    next.hoverDelayMs=Math.max(0,Math.min(Number(next.hoverDelayMs)||180,3000));
    next.autoCollapseMs=Math.max(0,Math.min(Number(next.autoCollapseMs)||4500,60000));
    next.compactShortcutLimit=Math.max(1,Math.min(Number(next.compactShortcutLimit)||8,20));
    this.state.settings=next;
    await this.save();
    return structuredClone(next);
  }
  async listShortcuts(){
    await this.load();
    return [...this.state.shortcuts].sort((a,b)=>(a.order??9999)-(b.order??9999)||new Date(b.lastUsedAt||0)-new Date(a.lastUsedAt||0));
  }
  async createShortcut(input={}){
    await this.load();
    const now=new Date().toISOString();
    const item={
      id:crypto.randomUUID(),
      label:cleanText(input.label||input.target,120)||'میان‌بر',
      targetType:cleanText(input.targetType||'file',40),
      target:cleanText(input.target,4000),
      iconSource:cleanText(input.iconSource,4000),
      customIcon:cleanText(input.customIcon,4000),
      accent:cleanText(input.accent,40),
      hotkey:cleanText(input.hotkey,80),
      openMode:cleanText(input.openMode||'default',40),
      arguments:Array.isArray(input.arguments)?input.arguments.map(x=>cleanText(x,500)).slice(0,32):[],
      workingDirectory:cleanText(input.workingDirectory,4000),
      account:cleanText(input.account,160),
      profile:cleanText(input.profile,160),
      group:cleanText(input.group,120),
      order:Number.isFinite(Number(input.order))?Number(input.order):this.state.shortcuts.length,
      pinned:Boolean(input.pinned),
      enabled:input.enabled!==false,
      health:'unknown',
      useCount:0,
      lastUsedAt:null,
      createdAt:now,
      updatedAt:now
    };
    if(!item.target)throw new Error('Shortcut target is required');
    this.state.shortcuts.push(item);
    await this.save();
    return structuredClone(item);
  }
  async updateShortcut(id,patch={}){
    await this.load();
    const item=this.state.shortcuts.find(x=>x.id===id);
    if(!item)return null;
    const allowed=['label','targetType','target','iconSource','customIcon','accent','hotkey','openMode','workingDirectory','account','profile','group','order','pinned','enabled','health'];
    for(const key of allowed){
      if(!(key in patch))continue;
      item[key]=['order'].includes(key)?Number(patch[key]):['pinned','enabled'].includes(key)?Boolean(patch[key]):cleanText(patch[key],key==='target'?4000:500);
    }
    if(Array.isArray(patch.arguments))item.arguments=patch.arguments.map(x=>cleanText(x,500)).slice(0,32);
    item.updatedAt=new Date().toISOString();
    await this.save();
    return structuredClone(item);
  }
  async removeShortcut(id){
    await this.load();
    const before=this.state.shortcuts.length;
    this.state.shortcuts=this.state.shortcuts.filter(x=>x.id!==id);
    if(this.state.shortcuts.length===before)return false;
    await this.save();
    return true;
  }
  async markShortcutUsed(id){
    await this.load();
    const item=this.state.shortcuts.find(x=>x.id===id);
    if(!item)return null;
    item.useCount=(Number(item.useCount)||0)+1;
    item.lastUsedAt=new Date().toISOString();
    await this.save();
    return structuredClone(item);
  }
}

export const topHubConfig=new TopHubConfigStore();
