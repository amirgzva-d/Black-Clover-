import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const defaultDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const KINDS=new Set(['auto','url','file','folder','app','media','agent','routine']);

export class QuickShortcutStore{
  constructor({directory=defaultDir()}={}){
    this.directory=directory;
    this.file=path.join(directory,'quick-shortcuts.json');
    this.items=[];
    this.loaded=false;
  }
  async load(){
    if(this.loaded)return this.items;
    this.loaded=true;
    try{
      const j=JSON.parse(await fs.readFile(this.file,'utf8'));
      this.items=Array.isArray(j?.items)?j.items:[];
    }catch(e){if(e.code!=='ENOENT')console.warn('Quick shortcuts load failed:',e.message);}
    return this.items;
  }
  async save(){
    await fs.mkdir(this.directory,{recursive:true});
    const tmp=this.file+'.tmp';
    await fs.writeFile(tmp,JSON.stringify({version:1,updatedAt:new Date().toISOString(),items:this.items},null,2),'utf8');
    await fs.rename(tmp,this.file);
  }
  normalize(input={}){
    const target=String(input.target||'').trim();
    const label=String(input.label||'').trim()||path.basename(target)||'میان‌بر';
    const kind=KINDS.has(String(input.kind||''))?String(input.kind):'auto';
    return {
      label:label.slice(0,120),
      target:target.slice(0,4096),
      kind,
      icon:String(input.icon||'').slice(0,2048),
      accent:String(input.accent||'').slice(0,40),
      group:String(input.group||'').trim().slice(0,80),
      order:Number.isFinite(Number(input.order))?Number(input.order):9999,
      enabled:input.enabled!==false
    };
  }
  async list({limit=500}={}){
    await this.load();
    return this.items.filter(x=>x.enabled!==false).sort((a,b)=>(a.order??9999)-(b.order??9999)||new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,Math.max(1,Math.min(Number(limit)||500,1000)));
  }
  async create(input={}){
    await this.load();
    const x=this.normalize(input);
    if(!x.target)throw new Error('Shortcut target is required');
    const now=new Date().toISOString();
    const item={id:crypto.randomUUID(),...x,createdAt:now,updatedAt:now};
    this.items.push(item);await this.save();return item;
  }
  async update(id,patch={}){
    await this.load();
    const item=this.items.find(x=>x.id===id);if(!item)return null;
    const next=this.normalize({...item,...patch});
    Object.assign(item,next,{updatedAt:new Date().toISOString()});
    await this.save();return item;
  }
  async remove(id){
    await this.load();
    const n=this.items.length;this.items=this.items.filter(x=>x.id!==id);
    if(n!==this.items.length)await this.save();
    return n!==this.items.length;
  }
  async reorder(ids=[]){
    await this.load();
    const rank=new Map(ids.map((id,i)=>[String(id),i]));
    for(const item of this.items)if(rank.has(item.id))item.order=rank.get(item.id);
    await this.save();return this.list();
  }
}
export const quickShortcuts=new QuickShortcutStore();
