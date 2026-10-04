import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const dir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const now=()=>new Date().toISOString();

export class PinnedNoteStore{
  constructor({directory=dir()}={}){this.directory=directory;this.file=path.join(directory,'pinned-notes.json');this.items=[];this.loaded=false;}
  async load(){if(this.loaded)return this.items;this.loaded=true;try{const j=JSON.parse(await fs.readFile(this.file,'utf8'));this.items=Array.isArray(j?.items)?j.items:[];}catch(e){if(e.code!=='ENOENT')console.warn('Pinned notes load failed',e.message);}return this.items;}
  async save(){await fs.mkdir(this.directory,{recursive:true});const tmp=`${this.file}.tmp`;await fs.writeFile(tmp,JSON.stringify({version:1,updatedAt:now(),items:this.items},null,2),'utf8');await fs.rename(tmp,this.file);}
  async create({title='',text='',pinned=true,tags=[]}={}){await this.load();const body=String(text||'').trim().slice(0,12000),name=String(title||'').trim().slice(0,180);if(!body&&!name)throw new Error('Note is empty');const item={id:crypto.randomUUID(),title:name||body.slice(0,70),text:body,pinned:Boolean(pinned),archived:false,tags:[...new Set(tags.map(String))].slice(0,30),createdAt:now(),updatedAt:now()};this.items.unshift(item);await this.save();return item;}
  async list({includeArchived=false,limit=300}={}){await this.load();return this.items.filter(x=>includeArchived||!x.archived).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,limit);}
  async update(id,patch={}){await this.load();const item=this.items.find(x=>x.id===id);if(!item)return null;for(const k of ['title','text'])if(typeof patch[k]==='string')item[k]=String(patch[k]).trim().slice(0,k==='title'?180:12000);for(const k of ['pinned','archived'])if(typeof patch[k]==='boolean')item[k]=patch[k];if(Array.isArray(patch.tags))item.tags=[...new Set(patch.tags.map(String))].slice(0,30);item.updatedAt=now();await this.save();return item;}
  async remove(id){await this.load();const n=this.items.length;this.items=this.items.filter(x=>x.id!==id);if(n===this.items.length)return false;await this.save();return true;}
  async search(query,{limit=30}={}){await this.load();const q=String(query||'').toLowerCase().trim();return this.items.filter(x=>!x.archived&&(!q||`${x.title} ${x.text} ${(x.tags||[]).join(' ')}`.toLowerCase().includes(q))).slice(0,limit);}
}

export const pinnedNotes=new PinnedNoteStore();
