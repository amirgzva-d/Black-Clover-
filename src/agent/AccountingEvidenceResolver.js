import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const decodeXml=s=>String(s??'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const attr=(tag,name)=>{const m=String(tag).match(new RegExp('(?:^|\\s)'+name.replace(':','\\:')+'="([^"]*)"'));return m?decodeXml(m[1]):'';};
const cache=new Map();

function relationshipPath(sheetTarget=''){
  const target=String(sheetTarget).replace(/\\/g,'/');
  return path.posix.join(path.posix.dirname(target),'_rels',path.posix.basename(target)+'.rels');
}
function parseRelationships(xml=''){
  const out=new Map();
  for(const m of String(xml).matchAll(/<Relationship\b([^>]*)\/?\s*>/g)){
    const id=attr(m[1],'Id'),target=attr(m[1],'Target'),targetMode=attr(m[1],'TargetMode');
    if(id)out.set(id,{target,targetMode});
  }
  return out;
}
function formulaTarget(formula=''){
  const m=String(formula).match(/^HYPERLINK\s*\(\s*"([^"]+)"/i);
  return m?m[1].replace(/""/g,'"'):'';
}
function isWeb(target=''){return /^(?:https?|mailto):/i.test(String(target));}
function localTarget(workbookPath,target,basePath=''){
  let raw=String(target||'').trim();
  if(!raw||isWeb(raw))return null;
  try{raw=decodeURIComponent(raw);}catch{}
  if(/^file:/i.test(raw)){
    try{return fileURLToPath(raw);}catch{}
  }
  raw=raw.split('/').join(path.sep);
  if(process.platform==='win32'&&(raw.startsWith('\\\\')||path.win32.isAbsolute(raw)))return path.win32.normalize(raw);
  if(path.isAbsolute(raw))return path.normalize(raw);
  const base=String(basePath||'').trim()||path.dirname(workbookPath);
  return path.resolve(base,raw);
}
async function exists(file){
  if(!file)return null;
  try{const s=await fs.stat(file);return s.isFile()||s.isDirectory();}catch{return false;}
}
async function evidenceDirectory(root='',extensions=[]){
  const dir=String(root||'').trim();if(!dir)return null;
  const extSet=new Set((extensions||[]).map(x=>String(x).toLowerCase().replace(/^\./,'')));
  try{
    const stat=await fs.stat(dir),prior=cache.get(dir);
    if(prior&&prior.mtimeMs===stat.mtimeMs&&Date.now()-prior.cachedAt<30000)return prior;
    const entries=await fs.readdir(dir,{withFileTypes:true});
    const stems=new Map(),numericIds=[],duplicates=[];
    for(const entry of entries){
      if(!entry.isFile())continue;
      const ext=path.extname(entry.name).slice(1).toLowerCase();
      if(extSet.size&&!extSet.has(ext))continue;
      const stem=path.basename(entry.name,path.extname(entry.name)).trim();
      if(!stem)continue;
      const key=stem.toLowerCase();
      const arr=stems.get(key)||[];arr.push(entry.name);stems.set(key,arr);
      if(/^\d+$/.test(stem))numericIds.push(Number(stem));
    }
    for(const [stem,names] of stems)if(names.length>1)duplicates.push({stem,names});
    numericIds.sort((a,b)=>a-b);
    const maxId=numericIds.length?numericIds[numericIds.length-1]:0;
    const data={root:dir,mtimeMs:stat.mtimeMs,cachedAt:Date.now(),stems,numericIds,duplicates,maxId,nextCandidate:maxId+1,count:entries.filter(x=>x.isFile()).length};
    cache.set(dir,data);return data;
  }catch(e){
    return {root:dir,error:String(e.message||e),stems:new Map(),numericIds:[],duplicates:[],maxId:0,nextCandidate:1,count:0,cachedAt:Date.now()};
  }
}
function numericStem(value=''){
  const s=String(value??'').trim();
  if(/^\d+(?:\.0+)?$/.test(s))return String(Math.trunc(Number(s)));
  return s;
}
function cellState(cell,index){
  const value=String(cell?.value??'').trim(),stem=numericStem(value);
  return {
    ref:cell?.ref||null,
    value,
    hasHyperlink:Boolean(cell?.hasHyperlink),
    hyperlinkTarget:cell?.hyperlinkTarget||null,
    hyperlinkTargetExists:cell?.hyperlinkTargetExists??null,
    numericFileExists:Boolean(index&&stem&&index.stems.has(stem.toLowerCase())),
    numericFileMatches:index&&stem?(index.stems.get(stem.toLowerCase())||[]):[]
  };
}

export class AccountingEvidenceResolver{
  async prepare({zip,sheetTarget,cells,workbookPath,profile={}}={}){
    const relEntry=zip?.file?.(relationshipPath(sheetTarget));
    const relationships=relEntry?parseRelationships(await relEntry.async('string')):new Map();
    for(const cell of cells.values()){
      const rid=cell.hyperlink?.rid;
      const relation=rid?relationships.get(rid):null;
      const target=relation?.target||formulaTarget(cell.formula);
      if(!target)continue;
      cell.hyperlinkTarget=target;
      cell.hyperlinkTargetMode=relation?.targetMode||'';
      const local=localTarget(workbookPath,target,profile.hyperlinkBasePath||profile.evidenceRoot||'');
      cell.hyperlinkResolvedPath=local;
      cell.hyperlinkTargetExists=await exists(local);
    }
    const index=await evidenceDirectory(profile.evidenceRoot||'',profile.evidenceExtensions||['jpg','jpeg','png','webp','pdf']);
    return {
      evidenceIndex:index,
      summary:index?{rootAvailable:!index.error,fileCount:index.count,numericCount:index.numericIds.length,maxNumericId:index.maxId,nextCandidate:index.nextCandidate,duplicateNumericIds:index.duplicates,error:index.error||null}:null
    };
  }
  evaluate(cells,row,rule={},ctx={}){
    const columns=(Array.isArray(rule.columns)?rule.columns:[rule.column]).filter(Boolean).map(x=>String(x).toUpperCase());
    const required=Math.max(1,Number(rule.required)||1),mode=rule.mode||'hyperlink';
    const states=columns.map(col=>cellState(cells.get(col+row),ctx.evidenceIndex));
    const passed=states.filter(s=>{
      if(mode==='value')return Boolean(s.value);
      if(mode==='hyperlink')return s.hasHyperlink;
      if(mode==='hyperlink_existing')return s.hasHyperlink&&s.hyperlinkTargetExists===true;
      if(mode==='numeric_file')return s.numericFileExists;
      if(mode==='hyperlink_or_value')return s.hasHyperlink||Boolean(s.value);
      if(mode==='hyperlink_or_numeric_file')return s.hasHyperlink||s.numericFileExists;
      if(mode==='strict_evidence')return (s.hasHyperlink&&s.hyperlinkTargetExists!==false)||s.numericFileExists;
      return s.hasHyperlink;
    }).length;
    return {label:String(rule.label||rule.name||columns.join('+')||'attachment'),mode,required,passed,ok:passed>=required,cells:states};
  }
}
export const accountingEvidenceResolver=new AccountingEvidenceResolver();
