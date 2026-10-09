import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

const defaultDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const clone=v=>structuredClone(v);
const text=(v,max=4000)=>String(v??'').trim().slice(0,max);

function normalizeAttachment(slot={}){
  const visibleId=text(slot.visibleId,120);
  const hyperlink=text(slot.hyperlink,4000);
  const resolvedTarget=text(slot.resolvedTarget,4000);
  const numericId=/^\d+$/.test(visibleId)?Number(visibleId):null;
  const targetBase=(resolvedTarget||hyperlink).split(/[\\/]/).pop()?.replace(/\.[^.]+$/,'')||'';
  let status='complete';
  if(!visibleId&&!hyperlink)status='missing';
  else if(!visibleId)status='visible_id_missing';
  else if(numericId===null)status='visible_id_invalid';
  else if(!hyperlink)status='hyperlink_missing';
  else if(slot.targetExists===false)status='target_missing';
  else if(/^\d+$/.test(targetBase)&&Number(targetBase)!==numericId)status='id_target_mismatch';
  return {...slot,visibleId,hyperlink,resolvedTarget,numericId,targetBase,status};
}

export function analyzeWorkbookSnapshot(profile,snapshot={}){
  const result={
    profileId:profile.id,
    workbookPath:profile.workbookPath,
    workbookIdentity:snapshot.workbookIdentity||null,
    displayName:profile.displayName||path.basename(profile.workbookPath||'Workbook'),
    invoiceNumber:snapshot.invoiceNumber||profile.invoiceNumber||null,
    kind:profile.workbookKind||'invoice',
    state:'complete',
    totalRecords:0,
    completeRecords:0,
    incompleteRecords:0,
    missingAttachments:0,
    brokenLinks:0,
    duplicateIds:0,
    idMismatches:0,
    perSheet:[],
    lastObservedOpenAt:snapshot.lastObservedOpenAt||null,
    lastModifiedAt:snapshot.lastModifiedAt||null,
    scannedAt:new Date().toISOString(),
    sourceFreshness:snapshot.sourceFreshness||'unknown',
    warnings:[],
    rowIssues:[]
  };
  if(snapshot.sourceAvailable===false){
    result.state='source_unavailable';
    result.warnings.push(snapshot.sourceError||'Workbook or share unavailable');
    return result;
  }

  const seenIds=new Map();
  for(const sheet of snapshot.sheets||[]){
    const sheetOut={name:sheet.name,totalRecords:0,completeRecords:0,incompleteRecords:0,validPhotoCount:0,brokenLinks:0};
    for(const row of sheet.rows||[]){
      if(row.ignored||row.recordPresent===false)continue;
      result.totalRecords++;sheetOut.totalRecords++;
      const requiredSlots=Array.isArray(row.requiredAttachments)?row.requiredAttachments:[];
      const checked=requiredSlots.map(normalizeAttachment);
      let rowComplete=true;
      for(const slot of checked){
        if(slot.numericId!==null){
          const prev=seenIds.get(slot.numericId);
          if(prev){
            result.duplicateIds++;
            result.rowIssues.push({sheet:sheet.name,row:row.row,recordType:row.recordType||'generic',slot:slot.name||slot.column,visibleId:slot.visibleId,issueType:'duplicate_id',severity:'error',duplicateOf:prev});
            rowComplete=false;
          }else seenIds.set(slot.numericId,{sheet:sheet.name,row:row.row,slot:slot.name||slot.column});
        }
        if(slot.status!=='complete'){
          rowComplete=false;
          if(slot.status==='missing'||slot.status==='visible_id_missing'||slot.status==='hyperlink_missing')result.missingAttachments++;
          if(slot.status==='target_missing'||slot.status==='hyperlink_missing')result.brokenLinks++;
          if(slot.status==='id_target_mismatch')result.idMismatches++;
          result.rowIssues.push({
            sheet:sheet.name,row:row.row,recordType:row.recordType||'generic',
            sourceSummary:text(row.sourceSummary,500),slot:slot.name||slot.column||'attachment',
            visibleId:slot.visibleId,hyperlink:slot.hyperlink,resolvedTarget:slot.resolvedTarget,
            issueType:slot.status,severity:slot.status==='missing'?'warning':'error'
          });
          if(['target_missing','hyperlink_missing'].includes(slot.status))sheetOut.brokenLinks++;
        }else sheetOut.validPhotoCount++;
      }
      if(rowComplete){
        result.completeRecords++;sheetOut.completeRecords++;
      }else{
        result.incompleteRecords++;sheetOut.incompleteRecords++;
      }
    }
    result.perSheet.push(sheetOut);
  }
  if(result.duplicateIds||result.brokenLinks||result.idMismatches)result.state='error';
  else if(result.incompleteRecords)result.state='incomplete';
  else result.state='complete';
  return result;
}

export class AccountingMonitorStore{
  constructor({directory=defaultDir()}={}){
    this.directory=directory;
    this.file=path.join(directory,'accounting-monitor-v1.json');
    this.profiles=[];
    this.results={};
    this.loaded=false;
    this.saveChain=Promise.resolve();
  }
  async load(){
    if(this.loaded)return this.snapshot();
    this.loaded=true;
    try{
      const raw=JSON.parse(await fs.readFile(this.file,'utf8'));
      this.profiles=Array.isArray(raw?.profiles)?raw.profiles:[];
      this.results=raw?.results&&typeof raw.results==='object'?raw.results:{};
    }catch(e){if(e.code!=='ENOENT')console.warn('AccountingMonitorStore load failed:',e.message);}
    return this.snapshot();
  }
  snapshot(){return {profiles:clone(this.profiles),results:clone(this.results)};}
  async save(){
    const payload=JSON.stringify({version:1,profiles:this.profiles,results:this.results,updatedAt:new Date().toISOString()},null,2);
    const run=this.saveChain.catch(()=>{}).then(async()=>{
      await fs.mkdir(this.directory,{recursive:true});
      const tmp=this.file+'.tmp';
      await fs.writeFile(tmp,payload,'utf8');
      await fs.rename(tmp,this.file);
    });
    this.saveChain=run;
    return run;
  }
  async listProfiles(){
    await this.load();
    return clone(this.profiles).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||(a.order??9999)-(b.order??9999));
  }
  async createProfile(input={}){
    await this.load();
    const now=new Date().toISOString();
    const workbookPath=text(input.workbookPath,4000);
    if(!workbookPath)throw new Error('workbookPath is required');
    const p={
      id:crypto.randomUUID(),
      workbookPath,
      displayName:text(input.displayName,180)||path.basename(workbookPath),
      workbookKind:['invoice','freight'].includes(input.workbookKind)?input.workbookKind:'invoice',
      enabled:input.enabled!==false,
      pinned:Boolean(input.pinned),
      invoiceNumber:text(input.invoiceNumber,80),
      watchedSheets:Array.isArray(input.watchedSheets)?clone(input.watchedSheets):[],
      headerRow:Number(input.headerRow)||1,
      dataStartRow:Math.max(1,Number(input.dataStartRow)||2),
      endRowPolicy:input.endRowPolicy||{mode:'used-range'},
      rowPresenceRule:clone(input.rowPresenceRule||{}),
      rowTypeClassifier:clone(input.rowTypeClassifier||{}),
      attachmentRules:clone(input.attachmentRules||[]),
      attachmentRoot:text(input.attachmentRoot,4000),
      archivePolicy:clone(input.archivePolicy||{mode:'manual'}),
      scanPolicy:clone(input.scanPolicy||{eventDriven:true,fallbackIntervalSeconds:180,debounceMs:1800}),
      order:Number.isFinite(Number(input.order))?Number(input.order):this.profiles.length,
      createdAt:now,updatedAt:now
    };
    this.profiles.push(p);
    await this.save();
    return clone(p);
  }
  async updateProfile(id,patch={}){
    await this.load();
    const p=this.profiles.find(x=>x.id===id);
    if(!p)return null;
    const scalar=['workbookPath','displayName','invoiceNumber','attachmentRoot','workbookKind'];
    for(const key of scalar)if(key in patch)p[key]=text(patch[key],key==='workbookPath'||key==='attachmentRoot'?4000:180);
    for(const key of ['enabled','pinned'])if(key in patch)p[key]=Boolean(patch[key]);
    for(const key of ['watchedSheets','endRowPolicy','rowPresenceRule','rowTypeClassifier','attachmentRules','archivePolicy','scanPolicy'])if(key in patch)p[key]=clone(patch[key]);
    if('dataStartRow' in patch)p.dataStartRow=Math.max(1,Number(patch.dataStartRow)||1);
    if('headerRow' in patch)p.headerRow=Math.max(1,Number(patch.headerRow)||1);
    if('order' in patch)p.order=Number(patch.order)||0;
    p.updatedAt=new Date().toISOString();
    await this.save();
    return clone(p);
  }
  async removeProfile(id){
    await this.load();
    const before=this.profiles.length;
    this.profiles=this.profiles.filter(x=>x.id!==id);
    delete this.results[id];
    if(before===this.profiles.length)return false;
    await this.save();
    return true;
  }
  async setResult(profileId,result){
    await this.load();
    this.results[profileId]=clone(result);
    await this.save();
    return clone(this.results[profileId]);
  }
  async getResult(profileId){await this.load();return clone(this.results[profileId]||null);}
}

export const accountingMonitorStore=new AccountingMonitorStore();
