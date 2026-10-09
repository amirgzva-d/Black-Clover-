import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const defaultDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const KINDS=new Set(['auto','url','file','folder','app','media','webapp','conversation','contact','project','agent','routine','workspace','command','system_action','pin']);
const clean=(v,max=4096)=>String(v??'').trim().slice(0,max);

export class QuickShortcutStore{
  constructor({directory=defaultDir()}={}){
    this.directory=directory;
    this.file=path.join(directory,'quick-shortcuts.json');
    this.items=[];
    this.loaded=false;
    this.saveChain=Promise.resolve();
  }
  normalize(input={}){
    const target=clean(input.target);
    const kind=KINDS.has(String(input.kind||input.targetType||''))?String(input.kind||input.targetType):'auto';
    const label=clean(input.label,120)||path.basename(target)||'میان‌بر';
    return {
      label,
      target,
      kind,
      targetType:kind,
      icon:clean(input.icon||'◆',2048),
      customIcon:clean(input.customIcon,4096),
      accent:clean(input.accent,40),
      group:clean(input.group,100),
      order:Number.isFinite(Number(input.order))?Number(input.order):9999,
      enabled:input.enabled!==false,
      pinned:Boolean(input.pinned),
      hotkey:clean(input.hotkey,120),
      openMode:clean(input.openMode||'default',40),
      arguments:Array.isArray(input.arguments)?input.arguments.map(x=>clean(x,500)).slice(0,32):[],
      workingDirectory:clean(input.workingDirectory),
      account:clean(input.account,160),
      profile:clean(input.profile,160),
      health:clean(input.health||'unknown',40)||'unknown',
      healthDetail:clean(input.healthDetail,500),
      useCount:Math.max(0,Number(input.useCount)||0),
      lastUsedAt:input.lastUsedAt||null
    };
  }
  async load(){
    if(this.loaded)return this.items;
    this.loaded=true;
    try{
      const j=JSON.parse(await fs.readFile(this.file,'utf8'));
      const raw=Array.isArray(j?.items)?j.items:[];
      this.items=raw.map((x,index)=>({
        id:String(x.id||crypto.randomUUID()),
        ...this.normalize({...x,order:Number.isFinite(Number(x.order))?x.order:index}),
        createdAt:x.createdAt||new Date().toISOString(),
        updatedAt:x.updatedAt||x.createdAt||new Date().toISOString()
      }));
    }catch(e){if(e.code!=='ENOENT')console.warn('Quick shortcuts load failed:',e.message);}
    return this.items;
  }
  save(){
    const snapshot=JSON.stringify({version:2,updatedAt:new Date().toISOString(),items:this.items},null,2);
    const run=this.saveChain.catch(()=>{}).then(async()=>{
      await fs.mkdir(this.directory,{recursive:true});
      const tmp=this.file+'.tmp';
      await fs.writeFile(tmp,snapshot,'utf8');
      await fs.rename(tmp,this.file);
    });
    this.saveChain=run;
    return run;
  }
  async list({limit=500,includeDisabled=false,query='',group=''}={}){
    await this.load();
    const q=clean(query,300).toLowerCase(),g=clean(group,100).toLowerCase();
    return this.items
      .filter(x=>(includeDisabled||x.enabled!==false)&&(!g||String(x.group||'').toLowerCase()===g)&&(!q||`${x.label} ${x.target} ${x.kind} ${x.group}`.toLowerCase().includes(q)))
      .sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||(a.order??9999)-(b.order??9999)||new Date(b.lastUsedAt||b.updatedAt)-new Date(a.lastUsedAt||a.updatedAt))
      .slice(0,Math.max(1,Math.min(Number(limit)||500,2000)))
      .map(x=>structuredClone(x));
  }
  async create(input={}){
    await this.load();
    const normalized=this.normalize({...input,order:Number.isFinite(Number(input.order))?input.order:this.items.length});
    if(!normalized.target)throw new Error('Shortcut target is required');
    const now=new Date().toISOString();
    const item={id:crypto.randomUUID(),...normalized,createdAt:now,updatedAt:now};
    this.items.push(item);
    await this.save();
    return structuredClone(item);
  }
  async update(id,patch={}){
    await this.load();
    const item=this.items.find(x=>x.id===String(id));
    if(!item)return null;
    const normalized=this.normalize({...item,...patch});
    Object.assign(item,normalized,{updatedAt:new Date().toISOString()});
    await this.save();
    return structuredClone(item);
  }
  async remove(id){
    await this.load();
    const before=this.items.length;
    this.items=this.items.filter(x=>x.id!==String(id));
    if(before===this.items.length)return false;
    await this.save();
    return true;
  }
  async reorder(ids=[]){
    await this.load();
    const rank=new Map(ids.map((id,i)=>[String(id),i]));
    for(const item of this.items)if(rank.has(item.id))item.order=rank.get(item.id);
    await this.save();
    return this.list({includeDisabled:true,limit:2000});
  }
  async markUsed(id){
    await this.load();
    const item=this.items.find(x=>x.id===String(id));
    if(!item)return null;
    item.useCount=(Number(item.useCount)||0)+1;
    item.lastUsedAt=new Date().toISOString();
    item.updatedAt=item.lastUsedAt;
    await this.save();
    return structuredClone(item);
  }
  async setHealth(id,{health='unknown',detail=''}={}){
    return this.update(id,{health,healthDetail:detail});
  }
}
export const quickShortcuts=new QuickShortcutStore();
