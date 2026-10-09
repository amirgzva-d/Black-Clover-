import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const defaultDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');

export class AccountingReportStore{
  constructor({directory=defaultDir()}={}){
    this.directory=directory;
    this.file=path.join(directory,'accounting-watch.json');
    this.state={version:1,refreshMinutes:3,maxActive:20,monitors:[],results:{}};
    this.loaded=false;
  }
  async load(){
    if(this.loaded)return this.state;
    this.loaded=true;
    try{
      const j=JSON.parse(await fs.readFile(this.file,'utf8'));
      this.state={...this.state,...j,monitors:Array.isArray(j?.monitors)?j.monitors:[],results:j?.results&&typeof j.results==='object'?j.results:{}};
    }catch(e){if(e.code!=='ENOENT')console.warn('Accounting report load failed:',e.message);}
    return this.state;
  }
  async save(){
    await fs.mkdir(this.directory,{recursive:true});
    const tmp=this.file+'.tmp';
    await fs.writeFile(tmp,JSON.stringify({...this.state,updatedAt:new Date().toISOString()},null,2),'utf8');
    await fs.rename(tmp,this.file);
  }
  async config(){await this.load();return {refreshMinutes:this.state.refreshMinutes,maxActive:this.state.maxActive};}
  async updateConfig(patch={}){
    await this.load();
    if(Number.isFinite(Number(patch.refreshMinutes)))this.state.refreshMinutes=Math.max(1,Math.min(60,Number(patch.refreshMinutes)));
    if(Number.isFinite(Number(patch.maxActive)))this.state.maxActive=Math.max(1,Math.min(200,Number(patch.maxActive)));
    await this.save();return this.config();
  }
  async listMonitors(){
    await this.load();
    return this.state.monitors.slice().sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||(a.order??9999)-(b.order??9999)||String(a.name).localeCompare(String(b.name),'fa'));
  }
  normalizeMonitor(input={}){
    return {
      name:String(input.name||'').trim().slice(0,180),
      path:String(input.path||'').trim().slice(0,4096),
      type:['invoice','transport','custom'].includes(input.type)?input.type:'invoice',
      pinned:Boolean(input.pinned),
      enabled:input.enabled!==false,
      order:Number.isFinite(Number(input.order))?Number(input.order):9999,
      profile:input.profile&&typeof input.profile==='object'?input.profile:{},
      archiveWhenComplete:input.archiveWhenComplete!==false
    };
  }
  async createMonitor(input={}){
    await this.load();const m=this.normalizeMonitor(input);
    if(!m.path)throw new Error('Workbook path is required');
    const now=new Date().toISOString();
    const item={id:crypto.randomUUID(),...m,createdAt:now,updatedAt:now,lastOpenedByMaria:null};
    this.state.monitors.push(item);await this.save();return item;
  }
  async updateMonitor(id,patch={}){
    await this.load();const item=this.state.monitors.find(x=>x.id===id);if(!item)return null;
    Object.assign(item,this.normalizeMonitor({...item,...patch}),{updatedAt:new Date().toISOString()});
    await this.save();return item;
  }
  async removeMonitor(id){
    await this.load();const before=this.state.monitors.length;
    this.state.monitors=this.state.monitors.filter(x=>x.id!==id);delete this.state.results[id];
    if(before!==this.state.monitors.length)await this.save();
    return before!==this.state.monitors.length;
  }
  async setResult(id,result){
    await this.load();
    this.state.results[id]={...result,monitorId:id,updatedAt:new Date().toISOString()};
    await this.save();return this.state.results[id];
  }
  async markOpened(id){
    await this.load();const item=this.state.monitors.find(x=>x.id===id);if(!item)return null;
    item.lastOpenedByMaria=new Date().toISOString();await this.save();return item;
  }
  async dashboard(){
    await this.load();
    const rows=this.state.monitors.filter(x=>x.enabled!==false).map(m=>({monitor:m,result:this.state.results[m.id]||null}));
    return rows.sort((a,b)=>{
      const ac=Boolean(a.result?.complete),bc=Boolean(b.result?.complete);
      if(ac!==bc)return Number(ac)-Number(bc);
      if(Boolean(a.monitor.pinned)!==Boolean(b.monitor.pinned))return Number(Boolean(b.monitor.pinned))-Number(Boolean(a.monitor.pinned));
      return (a.monitor.order??9999)-(b.monitor.order??9999);
    });
  }
}
export const accountingReports=new AccountingReportStore();
