import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { memoryPolicy } from './memory/MemoryPolicy.js';

const words=text=>[...new Set(String(text||'').toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu,' ').split(/\s+/).filter(x=>x.length>1))];
const defaultDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)));

export class MemoryStore{
  constructor({directory=defaultDir(),maxItems=5000}={}){this.directory=directory;this.file=path.join(directory,'memory.json');this.backup=path.join(directory,'memory.backup.json');this.maxItems=maxItems;this.items=[];this.loaded=false;}
  async load(){if(this.loaded)return this.items;this.loaded=true;for(const candidate of [this.file,this.backup]){try{const raw=JSON.parse(await fs.readFile(candidate,'utf8'));if(Array.isArray(raw?.items)){this.items=raw.items;return this.items;}}catch(e){if(e.code!=='ENOENT')console.warn('Memory load failed:',candidate,e.message);}}this.items=[];return this.items;}
  async save(){await fs.mkdir(this.directory,{recursive:true});const snapshot={version:2,updatedAt:new Date().toISOString(),items:this.items.slice(0,this.maxItems)};const temp=`${this.file}.tmp`;try{await fs.copyFile(this.file,this.backup);}catch{}await fs.writeFile(temp,JSON.stringify(snapshot,null,2),'utf8');await fs.rename(temp,this.file);return snapshot;}
  async remember(text,{kind='fact',importance=.6,source='user',tags=[]}={}){await this.load();const value=String(text||'').trim();if(!value||value.length>2400)return null;const normalized=value.toLowerCase();const existing=this.items.find(x=>x.text.toLowerCase()===normalized);if(existing){existing.updatedAt=new Date().toISOString();existing.importance=Math.max(existing.importance||0,clamp(importance,0,1));existing.tags=[...new Set([...(existing.tags||[]),...tags])];await this.save();return existing;}const item={id:crypto.randomUUID(),text:value,kind:String(kind||'fact'),importance:clamp(importance,0,1),source:String(source||'user'),tags:[...new Set(tags.map(String))],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),keywords:words(value)};this.items.unshift(item);if(this.items.length>this.maxItems)this.items=this.items.sort((a,b)=>(b.importance||0)-(a.importance||0)||new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,this.maxItems);await this.save();return item;}
  async recall(query,{limit=8,kinds=null}={}){await this.load();const q=words(query);const allow=Array.isArray(kinds)&&kinds.length?new Set(kinds):null;const source=allow?this.items.filter(x=>allow.has(x.kind)):this.items;if(!q.length)return source.slice(0,limit);return source.map(item=>{const k=item.keywords||words(item.text);const overlap=q.filter(x=>k.some(y=>y===x||y.includes(x)||x.includes(y))).length;const phrase=String(item.text).toLowerCase().includes(String(query).toLowerCase())?3:0;const recency=Math.max(0,1-(Date.now()-new Date(item.updatedAt||item.createdAt).getTime())/(1000*60*60*24*365));return {item,score:overlap*2.2+phrase+(item.importance||0)*1.5+recency*.3};}).filter(x=>x.score>.7).sort((a,b)=>b.score-a.score).slice(0,Math.max(1,Math.min(Number(limit)||8,30))).map(x=>x.item);}
  async list(limit=50){await this.load();return this.items.slice(0,Math.max(1,Math.min(Number(limit)||50,500)));}
  async get(id){await this.load();return this.items.find(x=>x.id===id)||null;}
  async update(id,{text,kind,importance,tags}={}){await this.load();const item=this.items.find(x=>x.id===id);if(!item)return null;if(typeof text==='string'&&text.trim()){item.text=text.trim().slice(0,2400);item.keywords=words(item.text);}if(typeof kind==='string'&&kind.trim())item.kind=kind.trim();if(Number.isFinite(Number(importance)))item.importance=clamp(importance,0,1);if(Array.isArray(tags))item.tags=[...new Set(tags.map(String))];item.updatedAt=new Date().toISOString();await this.save();return item;}
  async remove(id){await this.load();const before=this.items.length;this.items=this.items.filter(x=>x.id!==id);if(this.items.length!==before)await this.save();return this.items.length!==before;}
  async removeByQuery(query,{limit=20}={}){const matches=await this.recall(query,{limit});const ids=new Set(matches.map(x=>x.id));if(!ids.size)return 0;this.items=this.items.filter(x=>!ids.has(x.id));await this.save();return ids.size;}
  async clear(){this.items=[];this.loaded=true;await this.save();}
  async maybeRememberUserStatement(text){const s=String(text||'').trim();if(!s)return null;const decision=memoryPolicy.evaluate(s,{explicit:false});if(!decision.eligible)return null;const kind=/(هیچ.?وقت|هرگز|فراموش نکن)/i.test(s)?'rule':'user_preference';return this.remember(decision.text,{kind,importance:kind==='rule'?.96:.86,tags:[kind,...(decision.tags||[]),decision.sensitivity==='private'?'local-private':'local']});}
}

export const memory=new MemoryStore();
