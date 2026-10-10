import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { accountingEvidenceResolver } from './AccountingEvidenceResolver.js';

const xmlDecode=s=>String(s??'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const attr=(tag,name)=>{const m=String(tag).match(new RegExp('(?:^|\\s)'+name.replace(':','\\:')+'="([^"]*)"'));return m?xmlDecode(m[1]):'';};
const colIndex=letters=>{let n=0;for(const ch of String(letters||'').toUpperCase())if(ch>='A'&&ch<='Z')n=n*26+(ch.charCodeAt(0)-64);return n;};
const splitRef=ref=>{const m=String(ref||'').toUpperCase().match(/^([A-Z]+)(\d+)$/);return m?{col:m[1],colIndex:colIndex(m[1]),row:Number(m[2])}:null;};
const cellInRange=(ref,range)=>{
  const p=splitRef(ref);if(!p)return false;
  const [a,b=a]=String(range||'').split(':').map(splitRef);
  if(!a||!b)return false;
  return p.row>=Math.min(a.row,b.row)&&p.row<=Math.max(a.row,b.row)&&p.colIndex>=Math.min(a.colIndex,b.colIndex)&&p.colIndex<=Math.max(a.colIndex,b.colIndex);
};
const stripTags=s=>xmlDecode(String(s||'').replace(/<[^>]+>/g,''));
const parseSharedStrings=xml=>{
  const out=[];
  for(const m of String(xml||'').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)){
    const parts=[...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x=>stripTags(x[1]));
    out.push(parts.join(''));
  }
  return out;
};
const parseCells=(xml,shared)=>{
  const map=new Map();
  for(const m of String(xml||'').matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)){
    const ref=attr(m[1],'r');if(!ref)continue;
    const type=attr(m[1],'t'),body=m[2];
    const formula=(body.match(/<f\b[^>]*>([\s\S]*?)<\/f>/)||[])[1]||'';
    let raw=(body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)||[])[1];
    if(raw==null)raw=(body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/)||[])[1];
    let value=raw==null?'':stripTags(raw);
    if(type==='s'&&/^\d+$/.test(value))value=shared[Number(value)]??value;
    map.set(ref.toUpperCase(),{ref:ref.toUpperCase(),value:String(value??''),formula:xmlDecode(formula),hasHyperlink:false,hyperlink:null});
  }
  for(const m of String(xml||'').matchAll(/<hyperlink\b([^>]*)\/?\s*>/g)){
    const range=attr(m[1],'ref');if(!range)continue;
    const info={rid:attr(m[1],'r:id'),location:attr(m[1],'location'),display:attr(m[1],'display')};
    if(range.includes(':')){
      for(const [ref,c] of map)if(cellInRange(ref,range)){c.hasHyperlink=true;c.hyperlink=info;}
    }else{
      const ref=range.toUpperCase(),c=map.get(ref)||{ref,value:'',formula:'',hasHyperlink:false,hyperlink:null};
      c.hasHyperlink=true;c.hyperlink=info;map.set(ref,c);
    }
  }
  for(const c of map.values())if(/^HYPERLINK\s*\(/i.test(c.formula||''))c.hasHyperlink=true;
  return map;
};
const nonEmpty=c=>Boolean(String(c?.value??'').trim()||String(c?.formula??'').trim());
const conditionMatches=(cells,row,when)=>{
  if(!when)return true;
  const c=cells.get(String(when.column||'').toUpperCase()+row),v=String(c?.value??'').trim();
  if(when.nonEmpty===true&&!v)return false;
  if(when.empty===true&&v)return false;
  if(when.equals!=null&&v!==String(when.equals))return false;
  if(when.includes!=null&&!v.includes(String(when.includes)))return false;
  if(when.regex){try{if(!new RegExp(String(when.regex),when.flags||'i').test(v))return false;}catch{return false;}}
  return true;
};
const maxRowFromCells=cells=>{let max=0;for(const ref of cells.keys()){const p=splitRef(ref);if(p)max=Math.max(max,p.row);}return max;};

function parseWorkbookSheets(workbookXml,relsXml){
  const relTargets=new Map();
  for(const m of String(relsXml||'').matchAll(/<Relationship\b([^>]*)\/?\s*>/g)){
    const id=attr(m[1],'Id'),target=attr(m[1],'Target');if(id&&target)relTargets.set(id,target);
  }
  const sheets=[];
  for(const m of String(workbookXml||'').matchAll(/<sheet\b([^>]*)\/?\s*>/g)){
    const name=attr(m[1],'name'),rid=attr(m[1],'r:id'),target=relTargets.get(rid);
    if(name&&target)sheets.push({name,rid,target:target.startsWith('/')?target.slice(1):path.posix.join('xl',target).replace(/^xl\/\.\.\//,'')});
  }
  return sheets;
}
function parseInvoiceIdentity(filePath){
  const base=path.basename(filePath,path.extname(filePath));
  const m=base.match(/^(.*?)[\s_-]*(\d+)\s*$/u);
  return {displayName:base,partyName:m?.[1]?.trim()||base,invoiceNumber:m?.[2]||null};
}
function issueTypeFromCheck(check){
  const set=new Set((check.failures||[]).map(x=>x.reason));
  if(set.has('visible_id_missing_or_invalid'))return 'visible_id_missing_or_invalid';
  if(set.has('hyperlink_missing'))return 'hyperlink_missing';
  if(set.has('target_missing'))return 'target_missing';
  if(set.has('id_target_mismatch'))return 'id_target_mismatch';
  if(set.has('duplicate_numeric_file'))return 'duplicate_numeric_file';
  if(set.has('numeric_file_missing'))return 'numeric_file_missing';
  return 'evidence_missing';
}
function rowSourceSummary(cells,row,columns=[]){
  return columns.map(col=>String(cells.get(String(col).toUpperCase()+row)?.value??'').trim()).filter(Boolean).join(' • ').slice(0,500);
}

export class AccountingWorkbookScanner{
  async scan(monitor={}){
    const filePath=String(monitor.path||monitor.workbookPath||'');
    const ext=path.extname(filePath).toLowerCase(),identity=parseInvoiceIdentity(filePath);
    if(!['.xlsx','.xlsm'].includes(ext))return {ok:false,status:'unsupported_format',...identity,path:filePath,extension:ext,complete:false};
    let stat;
    try{stat=await fs.stat(filePath);}
    catch(e){return {ok:false,status:e.code==='ENOENT'?'file_missing':'read_error',error:String(e.message||e),...identity,path:filePath,complete:false};}
    try{
      const zip=await JSZip.loadAsync(await fs.readFile(filePath));
      const sharedEntry=zip.file('xl/sharedStrings.xml');
      const shared=sharedEntry?parseSharedStrings(await sharedEntry.async('string')):[];
      const workbook=zip.file('xl/workbook.xml'),rels=zip.file('xl/_rels/workbook.xml.rels');
      if(!workbook||!rels)throw new Error('Workbook structure is incomplete');
      const sheets=parseWorkbookSheets(await workbook.async('string'),await rels.async('string'));
      const profile=monitor.profile||{};
      const configuredSheets=Array.isArray(profile.sheets)?profile.sheets:Array.isArray(profile.watchedSheets)?profile.watchedSheets:[];
      const selected=sheets.filter(s=>{
        const names=configuredSheets.filter(Boolean).map(x=>typeof x==='string'?x:x.name).filter(Boolean);
        if(names.length&&!names.includes(s.name))return false;
        if(profile.sheetRegex){try{return new RegExp(profile.sheetRegex,profile.sheetRegexFlags||'i').test(s.name);}catch{return false;}}
        return true;
      });
      if(!selected.length)return {ok:false,status:'sheet_not_found',...identity,path:filePath,lastModified:stat.mtime.toISOString(),complete:false};

      const rowStates=[],contexts=[],attachmentIdOccurrences=new Map();
      for(const sheet of selected){
        const entry=zip.file(sheet.target);
        if(!entry){rowStates.push({sheet:sheet.name,sheetError:'sheet_xml_missing',rows:[]});continue;}
        const cells=parseCells(await entry.async('string'),shared);
        const evidenceContext=await accountingEvidenceResolver.prepare({zip,sheetTarget:sheet.target,cells,workbookPath:filePath,profile});
        contexts.push(evidenceContext);
        const startRow=Math.max(1,Number(profile.startRow||profile.dataStartRow)||1);
        const endRow=Math.min(Number(profile.endRow)||Number.MAX_SAFE_INTEGER,maxRowFromCells(cells));
        const anchorColumns=(profile.anchorColumns||profile.anchor?.columns||profile.rowPresenceRule?.columns||['C']).map(x=>String(x).toUpperCase());
        const rules=Array.isArray(profile.rules)?profile.rules:[];
        const fallbackEvidence=Array.isArray(profile.evidence)?profile.evidence:(Array.isArray(profile.attachmentRules)?profile.attachmentRules:[]);
        const rows=[];
        for(let row=startRow;row<=endRow;row++){
          const isRecord=anchorColumns.some(col=>nonEmpty(cells.get(col+row)));
          if(!isRecord)continue;
          const chosen=rules.find(r=>conditionMatches(cells,row,r.when))||null;
          const evidence=Array.isArray(chosen?.evidence)?chosen.evidence:fallbackEvidence;
          const recordType=String(chosen?.type||chosen?.recordType||'generic_record');
          const missing=[],checks=[],issues=[];
          if(!evidence.length)missing.push('needs_configuration');
          for(const rule of evidence){
            const normalizedRule={...rule};
            if(!normalizedRule.mode&&profile.requireVerifiedAttachment===true)normalizedRule.mode='verified_numeric_hyperlink';
            const check=accountingEvidenceResolver.evaluate(cells,row,normalizedRule,evidenceContext);
            checks.push(check);
            for(const state of check.cells||[]){
              if(state.numericId!==null){
                const arr=attachmentIdOccurrences.get(state.numericId)||[];
                arr.push({sheet:sheet.name,row,ref:state.ref,check});
                attachmentIdOccurrences.set(state.numericId,arr);
              }
            }
            if(!check.ok){
              missing.push(check.label);
              issues.push({type:issueTypeFromCheck(check),label:check.label,failures:check.failures||[]});
            }
          }
          rows.push({
            row,
            recordType,
            fields:{
              plate:String(cells.get('C'+row)?.value??'').trim(),
              receiptAmount:String(cells.get('D'+row)?.value??'').trim(),
              photoCell:'H'+row,
              photoLinked:Boolean(cells.get('H'+row)?.hasHyperlink),
              photoTarget:cells.get('H'+row)?.hyperlinkTarget||null,
              photoTargetExists:cells.get('H'+row)?.hyperlinkTargetExists??null
            },
            sourceSummary:rowSourceSummary(cells,row,anchorColumns),
            anchor:Object.fromEntries(anchorColumns.map(col=>[col,String(cells.get(col+row)?.value??'')])),
            checks,
            issues,
            missing
          });
        }
        rowStates.push({sheet:sheet.name,rows});
      }

      const duplicateIds=[];
      for(const [id,occurrences] of attachmentIdOccurrences){
        if(occurrences.length<2)continue;
        duplicateIds.push({id,occurrences:occurrences.map(x=>({sheet:x.sheet,row:x.row,ref:x.ref}))});
        for(const occurrence of occurrences){
          const sheetState=rowStates.find(x=>x.sheet===occurrence.sheet),rowState=sheetState?.rows.find(x=>x.row===occurrence.row);
          if(rowState&&!rowState.missing.includes('duplicate_id')){
            rowState.missing.push('duplicate_id');
            rowState.issues.push({type:'duplicate_id',label:'شماره تکراری',id,ref:occurrence.ref});
          }
        }
      }

      const rootUnavailable=contexts.some(ctx=>ctx.summary&&ctx.summary.rootAvailable===false);
      const sheetResults=[];
      let brokenLinks=0,idMismatches=0,missingAttachments=0;
      for(const state of rowStates){
        if(state.sheetError){
          sheetResults.push({sheet:state.sheet,status:state.sheetError,total:0,registered:0,missing:0,missingRows:[],rowIssues:[],validPhotoCount:0});
          continue;
        }
        const total=state.rows.length;
        const completeRows=state.rows.filter(x=>x.missing.length===0);
        const missingRows=state.rows.filter(x=>x.missing.length>0).map(x=>({row:x.row,recordType:x.recordType,fields:x.fields,sourceSummary:x.sourceSummary,missing:x.missing,checks:x.checks,issues:x.issues,anchor:x.anchor}));
        for(const row of missingRows){
          for(const issue of row.issues||[]){
            if(['hyperlink_missing','target_missing'].includes(issue.type))brokenLinks++;
            if(issue.type==='id_target_mismatch')idMismatches++;
            if(['visible_id_missing_or_invalid','hyperlink_missing','target_missing','numeric_file_missing','evidence_missing'].includes(issue.type))missingAttachments++;
          }
        }
        const validPhotoCount=state.rows.reduce((n,row)=>n+(row.checks||[]).reduce((m,ch)=>m+(ch.cells||[]).filter(cell=>cell.hasNumericId&&cell.hasHyperlink&&cell.hyperlinkTargetExists===true&&cell.idMatchesTarget).length,0),0);
        sheetResults.push({
          sheet:state.sheet,
          status:'ok',
          total,
          registered:completeRows.length,
          missing:Math.max(0,total-completeRows.length),
          validPhotoCount,
          missingRows,
          rowIssues:missingRows.flatMap(x=>(x.issues||[]).map(issue=>({row:x.row,recordType:x.recordType,sourceSummary:x.sourceSummary,...issue}))),
          evidenceSummary:contexts.find(ctx=>ctx.summary)?.summary||null
        });
      }

      const total=sheetResults.reduce((n,x)=>n+x.total,0);
      const registered=sheetResults.reduce((n,x)=>n+x.registered,0);
      const missing=Math.max(0,total-registered);
      const configured=sheetResults.every(s=>!s.missingRows.some(r=>r.missing.includes('needs_configuration')));
      const type=monitor.type||monitor.workbookKind||'invoice';
      const transportPhotoOnly=type==='transport'&&(profile.transportCountMode==='photo_count'||profile.countMode==='photo_count');
      const status=rootUnavailable?'evidence_unavailable':configured?'ok':'needs_configuration';
      const evidenceSummary=contexts.find(x=>x.summary)?.summary||null;
      return {
        ok:!rootUnavailable,
        status,
        ...identity,
        path:filePath,
        type,
        lastModified:stat.mtime.toISOString(),
        size:stat.size,
        total,
        registered,
        missing,
        missingAttachments,
        brokenLinks,
        duplicateIds,
        duplicateIdCount:duplicateIds.length,
        idMismatches,
        complete:configured&&!rootUnavailable&&total>0&&missing===0,
        completion:total?Math.round((registered/total)*100):0,
        transportPhotoOnly,
        photoCount:sheetResults.reduce((n,x)=>n+(x.validPhotoCount||0),0),
        evidenceSummary,
        sheets:sheetResults,
        sourceFreshness:rootUnavailable?'stale_source':'disk_snapshot',
        scannedAt:new Date().toISOString()
      };
    }catch(e){
      return {ok:false,status:'scan_error',error:String(e.message||e),...identity,path:filePath,lastModified:stat.mtime.toISOString(),complete:false,scannedAt:new Date().toISOString()};
    }
  }
}
export const accountingWorkbookScanner=new AccountingWorkbookScanner();
