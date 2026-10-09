import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { accountingWorkbookScanner } from './AccountingWorkbookScanner.js';

export class AccountingMonitorService{
  constructor({store,emit=()=>{}}={}){
    this.store=store;this.emit=emit;this.timer=null;this.watchers=new Map();this.scanQueue=new Map();this.running=false;
  }
  async start(){
    if(this.running)return;this.running=true;
    await this.rebuildWatchers();
    await this.refresh({force:true,reason:'startup'});
    const cfg=await this.store.config();
    this.timer=setInterval(()=>this.refresh({reason:'fallback-poll'}).catch(()=>{}),Math.max(60000,cfg.refreshMinutes*60000));
  }
  async stop(){
    this.running=false;if(this.timer)clearInterval(this.timer);this.timer=null;
    for(const w of this.watchers.values())try{w.close();}catch{}
    this.watchers.clear();
  }
  async rebuildWatchers(){
    for(const w of this.watchers.values())try{w.close();}catch{}
    this.watchers.clear();
    const monitors=(await this.store.listMonitors()).filter(x=>x.enabled!==false);
    const groups=new Map();
    for(const m of monitors){
      const dir=path.dirname(m.path),items=groups.get(dir)||[];
      items.push(m);groups.set(dir,items);
    }
    for(const [dir,items] of groups){
      try{
        const w=fs.watch(dir,{persistent:false},(_event,filename)=>{
          const changed=filename?String(filename).toLowerCase():'';
          for(const m of items){
            if(!changed||path.basename(m.path).toLowerCase()===changed)this.queueScan(m.id,'file-change');
          }
        });
        w.on('error',()=>{});
        this.watchers.set(dir,w);
      }catch{}
    }
  }
  queueScan(id,reason='change'){
    clearTimeout(this.scanQueue.get(id));
    this.scanQueue.set(id,setTimeout(()=>{this.scanQueue.delete(id);this.refreshOne(id,{force:true,reason}).catch(()=>{});},1800));
  }
  async refreshOne(id,{force=false,reason='manual'}={}){
    const monitor=(await this.store.listMonitors()).find(x=>x.id===id);if(!monitor||monitor.enabled===false)return null;
    const current=(await this.store.dashboard()).find(x=>x.monitor.id===id)?.result||null;
    if(!force&&current?.lastModified){
      try{const st=await fsp.stat(monitor.path);if(new Date(current.lastModified).getTime()===st.mtime.getTime())return current;}catch{}
    }
    const result=await accountingWorkbookScanner.scan(monitor);
    await this.store.setResult(id,{...result,reason});
    this.emit({type:'accounting-report-updated',monitorId:id,result});
    return result;
  }
  async refresh({force=false,reason='manual'}={}){
    const cfg=await this.store.config();
    const monitors=(await this.store.listMonitors()).filter(x=>x.enabled!==false).slice(0,cfg.maxActive);
    const out=[];let cursor=0;
    const worker=async()=>{while(cursor<monitors.length){const m=monitors[cursor++];out.push(await this.refreshOne(m.id,{force,reason}));}};
    await Promise.all([worker(),worker()]);
    return out;
  }
}
