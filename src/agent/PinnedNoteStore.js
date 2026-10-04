import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const defaultDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
export class PinnedNoteStore{
  constructor({directory=defaultDir()}={}){this.directory=directory;this.file=path.join(directory,'pinned-notes.json');this.backup=path.join(directory,'pinned-notes.backup.json');this.items=[];this.loaded=false;}
  async load(){if(this.loaded)return this.items;this.loaded=true;for(const f of [this.file,this.backup]){try{const j=JSON.parse(await fs.readFile(f,'utf8'));if(Array.isArray(j?.items)){this.items=j.items;return this.items;}}catch(e){if(e.code!=='ENOENT')console.warn('Pinned notes load failed:',e.message);}}return this.items;}
  async save(){await fs.mkdir(this.directory,{recursive:true});try{await fs.copyFile(this.file,this.backup);}catch{}const tmp=`${this.file}.tmp`;await fs.writeFile(tmp,JSON.stringify({version:1,updatedAt:new Date().toISOString(),items:this.items},null,2),'utf8');await fs.rename(tmp,this.file);}
  async create({title,text,tags=[],pinned=true}={}){await this.load();const body=String(text||'').trim(),name=String(title||'').trim()||body.slice(0,80)||'یادداشت';if(!body)throw new Error('Note text is required');const item={id:crypto.randomUUID(),title:name.slice(0,160),text:body.slice(0,12000),tags:[...new Set((tags||[]).map(String))].slice(0,20),pinned:Boolean(pinned),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};this.items.unshift(item);await this.save();return item;}
  async list({query='',limit=100,pinnedOnly=false}={}){await this.load();const q=String(query||'').trim().toLowerCase();return this.items.filter(x=>(!pinnedOnly||x.pinned)&&(!q||`${x.title} ${x.text} ${(x.tags||[]).join(' ')}`.toLowerCase().includes(q))).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,Math.max(1,Math.min(Number(limit)||100,500)));}
  async update(id,{title,text,tags,pinned}={}){await this.load();const item=this.items.find(x=>x.id===id);if(!item)return null;if(typeof title==='string'&&title.trim())item.title=title.trim().slice(0,160);if(typeof text==='string'&&text.trim())item.text=text.trim().slice(0,12000);if(Array.isArray(tags))item.tags=[...new Set(tags.map(String))].slice(0,20);if(typeof pinned==='boolean')item.pinned=pinned;item.updatedAt=new Date().toISOString();await this.save();return item;}
  async remove(id){await this.load();const n=this.items.length;this.items=this.items.filter(x=>x.id!==id);if(this.items.length!==n)await this.save();return this.items.length!==n;}
}
export const pinnedNotes=new PinnedNoteStore();
