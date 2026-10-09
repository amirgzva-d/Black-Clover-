import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

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
      const ref=range.toUpperCase();const c=map.get(ref)||{ref,value:'',formula:'',hasHyperlink:false,hyperlink:null};c.hasHyperlink=true;c.hyperlink=info;map.set(ref,c);
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
const evidenceCount=(cells,row,rule)=>{
  const cols=Array.isArray(rule.columns)?rule.columns:[rule.column].filter(Boolean);
  let count=0;
  for(const col of cols){
    const c=cells.get(String(col).toUpperCase()+row);
    const mode=rule.mode||'hyperlink';
    if(mode==='value'&&nonEmpty(c))count++;
    else if(mode==='hyperlink'&&c?.hasHyperlink)count++;
    else if(mode==='hyperlink_or_value'&&(c?.hasHyperlink||nonEmpty(c)))count++;
  }
  return count;
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

export class AccountingWorkbookScanner{
  async scan(monitor={}){
    const filePath=String(monitor.path||'');
    const ext=path.extname(filePath).toLowerCase();
    const identity=parseInvoiceIdentity(filePath);
    if(!['.xlsx','.xlsm'].includes(ext))return {ok:false,status:'unsupported_format',...identity,path:filePath,extension:ext,complete:false};
    let stat;
    try{stat=await fs.stat(filePath);}catch(e){return {ok:false,status:e.code==='ENOENT'?'file_missing':'read_error',error:String(e.message||e),...identity,path:filePath,complete:false};}
    try{
      const zip=await JSZip.loadAsync(await fs.readFile(filePath));
      const sharedEntry=zip.file('xl/sharedStrings.xml');
      const shared=sharedEntry?parseSharedStrings(await sharedEntry.async('string')):[];
      const workbook=zip.file('xl/workbook.xml'),rels=zip.file('xl/_rels/workbook.xml.rels');
      if(!workbook||!rels)throw new Error('Workbook structure is incomplete');
      const sheets=parseWorkbookSheets(await workbook.async('string'),await rels.async('string'));
      const profile=monitor.profile||{};
      const selected=sheets.filter(s=>{
        const names=Array.isArray(profile.sheets)?profile.sheets.filter(Boolean):[];
        if(names.length&&!names.includes(s.name))return false;
        if(profile.sheetRegex){try{return new RegExp(profile.sheetRegex,profile.sheetRegexFlags||'i').test(s.name);}catch{return false;}}
        return true;
      });
      if(!selected.length)return {ok:false,status:'sheet_not_found',...identity,path:filePath,lastModified:stat.mtime.toISOString(),complete:false};
      const sheetResults=[];
      for(const sheet of selected){
        const entry=zip.file(sheet.target);
        if(!entry){sheetResults.push({sheet:sheet.name,status:'sheet_xml_missing',total:0,registered:0,missing:0,missingRows:[]});continue;}
        const cells=parseCells(await entry.async('string'),shared);
        const startRow=Math.max(1,Number(profile.startRow)||1),endRow=Math.min(Number(profile.endRow)||Number.MAX_SAFE_INTEGER,maxRowFromCells(cells));
        const anchorColumns=(profile.anchorColumns||profile.anchor?.columns||['C']).map(x=>String(x).toUpperCase());
        const rules=Array.isArray(profile.rules)?profile.rules:[];
        const fallbackEvidence=Array.isArray(profile.evidence)?profile.evidence:[];
        let total=0,registered=0;
        const missingRows=[];
        for(let row=startRow;row<=endRow;row++){
          const isRecord=anchorColumns.some(col=>nonEmpty(cells.get(col+row)));
          if(!isRecord)continue;
          total++;
          const chosen=rules.find(r=>conditionMatches(cells,row,r.when))||null;
          const evidence=Array.isArray(chosen?.evidence)?chosen.evidence:fallbackEvidence;
          const missing=[];
          if(!evidence.length)missing.push('needs_configuration');
          for(const rule of evidence){
            const required=Math.max(1,Number(rule.required)||1),count=evidenceCount(cells,row,rule);
            if(count<required)missing.push(String(rule.label||rule.name||rule.columns?.join('+')||rule.column||'attachment'));
          }
          if(!missing.length)registered++;
          else missingRows.push({row,missing,anchor:Object.fromEntries(anchorColumns.map(col=>[col,String(cells.get(col+row)?.value??'')]))});
        }
        sheetResults.push({sheet:sheet.name,status:'ok',total,registered,missing:Math.max(0,total-registered),missingRows});
      }
      const total=sheetResults.reduce((n,x)=>n+x.total,0),registered=sheetResults.reduce((n,x)=>n+x.registered,0),missing=Math.max(0,total-registered);
      const configured=sheetResults.every(s=>!s.missingRows.some(r=>r.missing.includes('needs_configuration')));
      return {
        ok:true,status:configured?'ok':'needs_configuration',...identity,path:filePath,
        type:monitor.type||'invoice',lastModified:stat.mtime.toISOString(),size:stat.size,
        total,registered,missing,complete:configured&&total>0&&missing===0,
        completion:total?Math.round((registered/total)*100):0,
        sheets:sheetResults,scannedAt:new Date().toISOString()
      };
    }catch(e){
      return {ok:false,status:'scan_error',error:String(e.message||e),...identity,path:filePath,lastModified:stat.mtime.toISOString(),complete:false};
    }
  }
}
export const accountingWorkbookScanner=new AccountingWorkbookScanner();
