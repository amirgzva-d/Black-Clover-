import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { accountingWorkbookScanner } from './AccountingWorkbookScanner.js';

const unavailableStatuses=new Set(['evidence_unavailable','file_missing','read_error','scan_error']);

export class AccountingMonitorService{
  constructor({store,emit=()=>{}}={}){
    this.store=store;
    this.emit=emit;
    this.timer=null;
    this.watchers=new Map();
    this.scanQueue=new Map();
    this.running=false;
  }
  async start(){
    if(this.running)return;
    this.running=true;
    await this.rebuildWatchers();
    await this.refresh({force:true,reason:'startup'});
    const cfg=await this.store.config();
    this.timer=setInterval(
      ()=>this.refresh({reason:'fallback-integrity-scan'}).catch(()=>{}),
      Math.max(60000,cfg.refreshMinutes*60000)
    );
  }
  async stop(){
    this.running=false;
    if(this.timer)clearInterval(this.timer);
    this.timer=null;
    for(const w of this.watchers.values())try{w.close();}catch{}
    this.watchers.clear();
    for(const timer of this.scanQueue.values())clearTimeout(timer);
    this.scanQueue.clear();
  }
  async rebuildWatchers(){
    for(const w of this.watchers.values())try{w.close();}catch{}
    this.watchers.clear();
    const monitors=(await this.store.listMonitors()).filter(x=>x.enabled!==false&&!x.archived);
    const groups=new Map();
    const add=(dir,id,kind)=>{
      const key=String(dir||'').trim();
      if(!key)return;
      const group=groups.get(key)||new Map();
      const kinds=group.get(id)||new Set();
      kinds.add(kind);
      group.set(id,kinds);
      groups.set(key,group);
    };
    for(const m of monitors){
      add(path.dirname(m.path),m.id,'workbook');
      add(m.profile?.evidenceRoot||m.profile?.attachmentRoot,m.id,'attachment');
    }
    for(const [dir,monitorMap] of groups){
      try{
        const watcher=fs.watch(dir,{persistent:false},(_event,filename)=>{
          const changed=filename?String(filename).toLowerCase():'';
          for(const [id,kinds] of monitorMap){
            const monitor=monitors.find(x=>x.id===id);
            if(!monitor)continue;
            const workbookMatch=kinds.has('workbook')&&(!changed||path.basename(monitor.path).toLowerCase()===changed);
            if(workbookMatch)this.queueScan(id,'workbook-change');
            if(kinds.has('attachment'))this.queueScan(id,'attachment-change');
          }
        });
        watcher.on('error',error=>this.emit({type:'accounting-watch-error',directory:dir,error:String(error.message||error)}));
        this.watchers.set(dir,watcher);
      }catch(error){
        this.emit({type:'accounting-watch-unavailable',directory:dir,error:String(error.message||error)});
      }
    }
  }
  queueScan(id,reason='change'){
    clearTimeout(this.scanQueue.get(id));
    this.scanQueue.set(id,setTimeout(()=>{
      this.scanQueue.delete(id);
      this.refreshOne(id,{force:true,reason}).catch(()=>{});
    },1800));
  }
  async refreshOne(id,{force=false,reason='manual'}={}){
    const monitor=(await this.store.listMonitors()).find(x=>x.id===String(id));
    if(!monitor||monitor.enabled===false||monitor.archived)return null;
    const current=await this.store.getResult(id);
    if(!force&&current?.lastModified&&reason!=='attachment-change'){
      try{
        const stat=await fsp.stat(monitor.path);
        if(new Date(current.lastModified).getTime()===stat.mtime.getTime())return current;
      }catch{}
    }
    const probe=await accountingWorkbookScanner.scan(monitor);
    let stored={...probe,stale:false,reason};
    if(current&&unavailableStatuses.has(probe.status)){
      stored={
        ...current,
        ok:false,
        status:probe.status,
        stale:true,
        staleSince:current.staleSince||new Date().toISOString(),
        sourceFreshness:'stale_last_verified',
        scanError:probe.error||probe.evidenceSummary?.error||null,
        scannedAt:probe.scannedAt||new Date().toISOString(),
        reason,
        latestProbe:probe
      };
    }
    await this.store.setResult(id,stored);
    this.emit({type:'accounting-report-updated',monitorId:id,result:stored});
    return stored;
  }
  async refresh({force=false,reason='manual'}={}){
    const cfg=await this.store.config();
    const monitors=(await this.store.listMonitors()).filter(x=>x.enabled!==false&&!x.archived).slice(0,cfg.maxActive);
    const out=[];
    let cursor=0;
    const worker=async()=>{
      while(cursor<monitors.length){
        const m=monitors[cursor++];
        out.push(await this.refreshOne(m.id,{force,reason}));
      }
    };
    await Promise.all([worker(),worker()]);
    return out;
  }
}
