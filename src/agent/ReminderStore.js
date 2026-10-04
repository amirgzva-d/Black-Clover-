import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const defaultDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
export class ReminderStore{
  constructor({directory=defaultDir()}={}){this.file=path.join(directory,'reminders.json');this.directory=directory;this.items=[];this.loaded=false;}
  async load(){if(this.loaded)return this.items;this.loaded=true;try{const j=JSON.parse(await fs.readFile(this.file,'utf8'));this.items=Array.isArray(j?.items)?j.items:[];}catch(e){if(e.code!=='ENOENT')console.warn('Reminder load failed',e.message);}return this.items;}
  async save(){await fs.mkdir(this.directory,{recursive:true});const tmp=`${this.file}.tmp`;await fs.writeFile(tmp,JSON.stringify({version:1,items:this.items,updatedAt:new Date().toISOString()},null,2),'utf8');await fs.rename(tmp,this.file);}
  async create({message,dueAt,intervalMinutes=0}){await this.load();const when=new Date(dueAt);if(!String(message||'').trim()||Number.isNaN(when.getTime()))throw new Error('Valid message and dueAt are required');const item={id:crypto.randomUUID(),message:String(message).trim(),dueAt:when.toISOString(),intervalMinutes:Math.max(0,Number(intervalMinutes)||0),enabled:true,createdAt:new Date().toISOString()};this.items.push(item);await this.save();return item;}
  async list(){await this.load();return this.items.filter(x=>x.enabled).sort((a,b)=>new Date(a.dueAt)-new Date(b.dueAt));}
  async cancel(id){await this.load();const item=this.items.find(x=>x.id===id);if(!item)return false;item.enabled=false;await this.save();return true;}
  async takeDue(now=Date.now()){await this.load();const due=[];let changed=false;for(const item of this.items){if(!item.enabled||new Date(item.dueAt).getTime()>now)continue;due.push({...item});if(item.intervalMinutes>0){let next=new Date(item.dueAt).getTime();const step=item.intervalMinutes*60000;while(next<=now)next+=step;item.dueAt=new Date(next).toISOString();}else item.enabled=false;changed=true;}if(changed)await this.save();return due;}
}
export const reminders=new ReminderStore();
