import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const words=text=>[...new Set(String(text||'').toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu,' ').split(/\s+/).filter(x=>x.length>1))];
const defaultDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');

export class MemoryStore{
  constructor({directory=defaultDir(),maxItems=600}={}){this.directory=directory;this.file=path.join(directory,'memory.json');this.maxItems=maxItems;this.items=[];this.loaded=false;}
  async load(){if(this.loaded)return;this.loaded=true;try{const raw=JSON.parse(await fs.readFile(this.file,'utf8'));this.items=Array.isArray(raw?.items)?raw.items:[];}catch(e){if(e.code!=='ENOENT')console.warn('Memory load failed:',e.message);this.items=[];}}
  async save(){await fs.mkdir(this.directory,{recursive:true});const temp=`${this.file}.tmp`;await fs.writeFile(temp,JSON.stringify({version:1,updatedAt:new Date().toISOString(),items:this.items.slice(-this.maxItems)},null,2),'utf8');await fs.rename(temp,this.file);}
  async remember(text,{kind='fact',importance=.6,source='user'}={}){await this.load();const value=String(text||'').trim();if(!value||value.length>1200)return null;const normalized=value.toLowerCase();const existing=this.items.find(x=>x.text.toLowerCase()===normalized);if(existing){existing.updatedAt=new Date().toISOString();existing.importance=Math.max(existing.importance||0,importance);await this.save();return existing;}const item={id:crypto.randomUUID(),text:value,kind,importance,source,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),keywords:words(value)};this.items.push(item);if(this.items.length>this.maxItems)this.items=this.items.sort((a,b)=>(b.importance||0)-(a.importance||0)).slice(0,this.maxItems);await this.save();return item;}
  async recall(query,{limit=6}={}){await this.load();const q=words(query);if(!q.length)return this.items.slice(-limit);return this.items.map(item=>{const k=item.keywords||words(item.text);const overlap=q.filter(x=>k.some(y=>y.includes(x)||x.includes(y))).length;const recency=Math.max(0,1-(Date.now()-new Date(item.updatedAt||item.createdAt).getTime())/(1000*60*60*24*180));return {item,score:overlap*2+(item.importance||0)+recency*.25};}).filter(x=>x.score>.5).sort((a,b)=>b.score-a.score).slice(0,limit).map(x=>x.item);}
  async list(limit=50){await this.load();return this.items.slice(-Math.max(1,Math.min(limit,200)));}
  async remove(id){await this.load();const before=this.items.length;this.items=this.items.filter(x=>x.id!==id);if(this.items.length!==before)await this.save();return this.items.length!==before;}
  async clear(){this.items=[];this.loaded=true;await this.save();}
  async maybeRememberUserStatement(text){const s=String(text||'').trim();if(!s)return null;const explicit=/(یادت باشه|یادت بمونه|به خاطر بسپار|فراموش نکن|من دوست دارم|من ترجیح میدم|ترجیح می‌دم|اسم من|اسمم|همیشه برام|از این به بعد)/i.test(s);if(!explicit)return null;return this.remember(s,{kind:'user_preference',importance:.85});}
}

export const memory=new MemoryStore();
