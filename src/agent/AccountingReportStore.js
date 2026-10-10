import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {accountingInvoiceProfile,transportPendingProfile,supportedAccountingExtension,INVOICE_TEMPLATE_ID} from './AccountingWorkbookProfiles.js';

const defaultDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const clone=v=>structuredClone(v);
const clean=(v,max=4096)=>String(v??'').trim().slice(0,max);

export class AccountingReportStore{
  constructor({directory=defaultDir()}={}){
    this.directory=directory;
    this.file=path.join(directory,'accounting-watch.json');
    this.state={version:2,refreshMinutes:3,maxActive:20,monitors:[],results:{}};
    this.loaded=false;
    this.saveChain=Promise.resolve();
  }
  async load(){
    if(this.loaded)return this.state;
    this.loaded=true;
    try{
      const j=JSON.parse(await fs.readFile(this.file,'utf8'));
      this.state={
        ...this.state,
        ...j,
        version:2,
        refreshMinutes:Number(j?.refreshMinutes)||3,
        maxActive:Number(j?.maxActive)||20,
        monitors:Array.isArray(j?.monitors)?j.monitors.map((x,i)=>this.normalizeMonitor({...x,order:Number.isFinite(Number(x.order))?x.order:i},x)):[],
        results:j?.results&&typeof j.results==='object'?j.results:{}
      };
    }catch(e){if(e.code!=='ENOENT')console.warn('Accounting report load failed:',e.message);}
    return this.state;
  }
  save(){
    const snapshot=JSON.stringify({...this.state,version:2,updatedAt:new Date().toISOString()},null,2);
    const run=this.saveChain.catch(()=>{}).then(async()=>{
      await fs.mkdir(this.directory,{recursive:true});
      const tmp=this.file+'.tmp';
      await fs.writeFile(tmp,snapshot,'utf8');
      await fs.rename(tmp,this.file);
    });
    this.saveChain=run;
    return run;
  }
  async config(){await this.load();return {refreshMinutes:this.state.refreshMinutes,maxActive:this.state.maxActive};}
  async updateConfig(patch={}){
    await this.load();
    if(Number.isFinite(Number(patch.refreshMinutes)))this.state.refreshMinutes=Math.max(1,Math.min(60,Number(patch.refreshMinutes)));
    if(Number.isFinite(Number(patch.maxActive)))this.state.maxActive=Math.max(1,Math.min(200,Number(patch.maxActive)));
    await this.save();
    return this.config();
  }
  normalizeProfile(profile={}){
    const evidenceRoot=clean(profile.evidenceRoot||profile.attachmentRoot);
    return {
      ...clone(profile||{}),
      startRow:Math.max(1,Number(profile.startRow||profile.dataStartRow)||2),
      dataStartRow:Math.max(1,Number(profile.dataStartRow||profile.startRow)||2),
      anchorColumns:Array.isArray(profile.anchorColumns)?profile.anchorColumns.map(x=>clean(x,8).toUpperCase()):Array.isArray(profile.anchor?.columns)?profile.anchor.columns.map(x=>clean(x,8).toUpperCase()):['C'],
      sheets:Array.isArray(profile.sheets)?clone(profile.sheets):[],
      watchedSheets:Array.isArray(profile.watchedSheets)?clone(profile.watchedSheets):[],
      evidence:Array.isArray(profile.evidence)?clone(profile.evidence):[],
      attachmentRules:Array.isArray(profile.attachmentRules)?clone(profile.attachmentRules):[],
      evidenceRoot,
      attachmentRoot:evidenceRoot,
      requireVerifiedAttachment:profile.requireVerifiedAttachment===true,
      transportCountMode:clean(profile.transportCountMode||profile.countMode,40),
      scanPolicy:{
        eventDriven:profile.scanPolicy?.eventDriven!==false,
        fallbackIntervalSeconds:Math.max(60,Number(profile.scanPolicy?.fallbackIntervalSeconds)||180),
        debounceMs:Math.max(250,Number(profile.scanPolicy?.debounceMs)||1800),
        ...(profile.scanPolicy||{})
      }
    };
  }
  normalizeMonitor(input={},previous={}){
    const type=['invoice','transport','custom'].includes(input.type)?input.type:(['invoice','freight'].includes(input.workbookKind)?(input.workbookKind==='freight'?'transport':'invoice'):'invoice');
    return {
      id:previous.id||input.id,
      name:clean(input.name||input.displayName,180),
      displayName:clean(input.displayName||input.name,180),
      path:clean(input.path||input.workbookPath),
      workbookPath:clean(input.workbookPath||input.path),
      type,
      workbookKind:type==='transport'?'freight':'invoice',
      pinned:Boolean(input.pinned),
      enabled:input.enabled!==false,
      order:Number.isFinite(Number(input.order))?Number(input.order):9999,
      profile:this.normalizeProfile(input.profile||{}),
      archiveWhenComplete:input.archiveWhenComplete!==false,
      archived:Boolean(input.archived),
      lastOpenedByMaria:input.lastOpenedByMaria||previous.lastOpenedByMaria||null,
      createdAt:input.createdAt||previous.createdAt||new Date().toISOString(),
      updatedAt:input.updatedAt||previous.updatedAt||new Date().toISOString()
    };
  }
  async listMonitors(){
    await this.load();
    return this.state.monitors.slice().sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||(a.order??9999)-(b.order??9999)||String(a.name).localeCompare(String(b.name),'fa')).map(clone);
  }
  async createMonitor(input={}){
    await this.load();
    const kind=input.type==='transport'?'transport':'invoice';
    const filePath=clean(input.path||input.workbookPath);
    if(!filePath)throw new Error('Workbook path is required');
    if(!supportedAccountingExtension(filePath))throw new Error('فعلاً فقط فایل‌های Excel با پسوند xlsx یا xlsm قابل اسکن هستند.');
    const identity=process.platform==='win32'?path.win32.normalize(filePath).toLowerCase():path.resolve(filePath);
    const duplicate=this.state.monitors.find(x=>x.enabled!==false&&
      (process.platform==='win32'?path.win32.normalize(x.path).toLowerCase():path.resolve(x.path))===identity);
    if(duplicate){
      // Reuse its original ID and history; never create duplicate report cards.
      if(duplicate.type!==kind)throw new Error('این فایل قبلاً با نوع دیگری ثبت شده است.');
      return clone(duplicate);
    }
    const preset=kind==='invoice'?accountingInvoiceProfile():transportPendingProfile();
    const now=new Date().toISOString();
    const base=this.normalizeMonitor({
      ...input,type:kind,path:filePath,profile:preset,
      archiveWhenComplete:false,
      createdAt:now,updatedAt:now,
      order:this.state.monitors.length
    });
    const item={...base,id:crypto.randomUUID()};
    this.state.monitors.push(item);
    await this.save();
    return clone(item);
  }
  async applyFixedInvoiceTemplateToExisting(){
    await this.load();
    const targets=this.state.monitors.filter(m=>m.type==='invoice'&&m.profile?.preset!==INVOICE_TEMPLATE_ID);
    if(!targets.length)return {updated:0};
    // Reversible one-time migration: save the original monitor definitions,
    // including custom rules and existing results, before changing them.
    const backup=this.file+'.before-invoice-template-v1.backup';
    try{await fs.access(backup);}catch(e){
      if(e.code!=='ENOENT')throw e;
      await fs.mkdir(this.directory,{recursive:true});
      await fs.writeFile(backup,JSON.stringify(this.state,null,2),'utf8');
    }
    for(const monitor of targets){
      monitor.profile=this.normalizeProfile(accountingInvoiceProfile({
        evidenceRoot:monitor.profile?.evidenceRoot,
        sheets:monitor.profile?.sheets
      }));
      monitor.archiveWhenComplete=false;
      monitor.updatedAt=new Date().toISOString();
    }
    await this.save();
    return {updated:targets.length,backup};
  }
  async updateMonitor(id,patch={}){
    await this.load();
    const index=this.state.monitors.findIndex(x=>x.id===String(id));
    if(index<0)return null;
    const current=this.state.monitors[index];
    const item=this.normalizeMonitor({...current,...patch,profile:patch.profile?{...current.profile,...patch.profile}:current.profile,updatedAt:new Date().toISOString()},current);
    this.state.monitors[index]=item;
    await this.save();
    return clone(item);
  }
  async removeMonitor(id){
    await this.load();
    const before=this.state.monitors.length;
    this.state.monitors=this.state.monitors.filter(x=>x.id!==String(id));
    delete this.state.results[String(id)];
    if(before===this.state.monitors.length)return false;
    await this.save();
    return true;
  }
  async setResult(id,result){
    await this.load();
    this.state.results[String(id)]={...clone(result),monitorId:String(id),updatedAt:new Date().toISOString()};
    await this.save();
    return clone(this.state.results[String(id)]);
  }
  async getResult(id){await this.load();return clone(this.state.results[String(id)]||null);}
  async markOpened(id){
    await this.load();
    const item=this.state.monitors.find(x=>x.id===String(id));
    if(!item)return null;
    item.lastOpenedByMaria=new Date().toISOString();
    item.updatedAt=item.lastOpenedByMaria;
    await this.save();
    return clone(item);
  }
  async dashboard(){
    await this.load();
    const rows=this.state.monitors.filter(x=>x.enabled!==false&&!x.archived).map(m=>({monitor:clone(m),result:clone(this.state.results[m.id]||null)}));
    const rank=entry=>{
      if(entry.monitor.pinned)return 0;
      const r=entry.result;
      if(r?.status==='evidence_unavailable'||r?.status==='file_missing'||r?.stale)return 1;
      if((r?.brokenLinks||0)||(r?.duplicateIdCount||0)||(r?.idMismatches||0)||r?.status==='scan_error')return 2;
      if((r?.missing||0)>0||r?.status==='needs_configuration')return 3;
      if(r?.complete)return 5;
      return 4;
    };
    return rows.sort((a,b)=>Number(a.monitor.type==='transport')-Number(b.monitor.type==='transport')||rank(a)-rank(b)||(a.monitor.order??9999)-(b.monitor.order??9999));
  }
}
export const accountingReports=new AccountingReportStore();
