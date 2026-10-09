import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const defaultDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const TYPES=new Set(['text','prompt','url','file','folder','image','audio','video','excel','selection','webpage','message','conversation','command','routine','project','workspace','checklist','note']);
const clean=(v,max=12000)=>String(v??'').trim().slice(0,max);

export class PinnedNoteStore{
  constructor({directory=defaultDir()}={}){
    this.directory=directory;
    this.file=path.join(directory,'pinned-notes.json');
    this.backup=path.join(directory,'pinned-notes.backup.json');
    this.items=[];
    this.loaded=false;
    this.saveChain=Promise.resolve();
  }
  normalize(input={}){
    const body=clean(input.body??input.text);
    const type=TYPES.has(String(input.type||''))?String(input.type):(/^https?:\/\//i.test(body)?'url':'text');
    return {
      type,
      title:clean(input.title,160)||body.slice(0,80)||'پین',
      body,
      text:body,
      targetRef:input.targetRef&&typeof input.targetRef==='object'?structuredClone(input.targetRef):null,
      sourceContext:input.sourceContext&&typeof input.sourceContext==='object'?structuredClone(input.sourceContext):null,
      preview:clean(input.preview,1000),
      tags:[...new Set((input.tags||[]).map(x=>clean(x,80)).filter(Boolean))].slice(0,40),
      group:clean(input.group,100),
      icon:clean(input.icon||'◆',300),
      accent:clean(input.accent,40),
      order:Number.isFinite(Number(input.order))?Number(input.order):9999,
      pinned:input.pinned!==false,
      favorite:Boolean(input.favorite),
      locked:Boolean(input.locked),
      sensitivity:clean(input.sensitivity||'normal',40),
      health:clean(input.health||'unknown',40),
      healthDetail:clean(input.healthDetail,500),
      lastUsedAt:input.lastUsedAt||null,
      useCount:Math.max(0,Number(input.useCount)||0)
    };
  }
  async load(){
    if(this.loaded)return this.items;
    this.loaded=true;
    for(const f of [this.file,this.backup]){
      try{
        const j=JSON.parse(await fs.readFile(f,'utf8'));
        if(Array.isArray(j?.items)){
          this.items=j.items.map((x,index)=>({
            id:String(x.id||crypto.randomUUID()),
            ...this.normalize({...x,order:Number.isFinite(Number(x.order))?x.order:index}),
            createdAt:x.createdAt||new Date().toISOString(),
            updatedAt:x.updatedAt||x.createdAt||new Date().toISOString()
          }));
          return this.items;
        }
      }catch(e){if(e.code!=='ENOENT')console.warn('Pinned notes load failed:',e.message);}
    }
    return this.items;
  }
  save(){
    const snapshot=JSON.stringify({version:2,updatedAt:new Date().toISOString(),items:this.items},null,2);
    const run=this.saveChain.catch(()=>{}).then(async()=>{
      await fs.mkdir(this.directory,{recursive:true});
      try{await fs.copyFile(this.file,this.backup);}catch{}
      const tmp=this.file+'.tmp';
      await fs.writeFile(tmp,snapshot,'utf8');
      await fs.rename(tmp,this.file);
    });
    this.saveChain=run;
    return run;
  }
  async create(input={}){
    await this.load();
    const normalized=this.normalize({...input,order:Number.isFinite(Number(input.order))?input.order:this.items.length});
    if(!normalized.body&&!normalized.targetRef)throw new Error('Pin content or target reference is required');
    const now=new Date().toISOString();
    const item={id:crypto.randomUUID(),...normalized,createdAt:now,updatedAt:now};
    this.items.unshift(item);
    await this.save();
    return structuredClone(item);
  }
  async list({query='',limit=100,pinnedOnly=false,type='',group=''}={}){
    await this.load();
    const q=clean(query,300).toLowerCase(),ty=clean(type,40),gr=clean(group,100).toLowerCase();
    return this.items
      .filter(x=>(!pinnedOnly||x.pinned)&&(!ty||x.type===ty)&&(!gr||String(x.group||'').toLowerCase()===gr)&&(!q||`${x.title} ${x.body} ${(x.tags||[]).join(' ')} ${x.type}`.toLowerCase().includes(q)))
      .sort((a,b)=>Number(Boolean(b.favorite))-Number(Boolean(a.favorite))||Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||(a.order??9999)-(b.order??9999)||new Date(b.updatedAt)-new Date(a.updatedAt))
      .slice(0,Math.max(1,Math.min(Number(limit)||100,1000)))
      .map(x=>structuredClone(x));
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
    if(this.items.length===before)return false;
    await this.save();
    return true;
  }
  async markUsed(id){
    await this.load();
    const item=this.items.find(x=>x.id===String(id));
    if(!item)return null;
    item.useCount=(Number(item.useCount)||0)+1;
    item.lastUsedAt=new Date().toISOString();
    await this.save();
    return structuredClone(item);
  }
}
export const pinnedNotes=new PinnedNoteStore();
