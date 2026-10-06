import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile,spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { rankFileCandidates,bestFileCandidate } from './files/FileResolver.js';
const execFileAsync=promisify(execFile);
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const schema=(properties,required=[])=>({type:'object',properties,required});
const q=s=>String(s??'').replaceAll("'","''");
const appData=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
async function where(exe){try{const {stdout}=await execFileAsync('where.exe',[exe],{windowsHide:true,timeout:10000});return stdout.trim().split(/\r?\n/)[0]||null;}catch{return null;}}
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function resolveEs(){const candidates=[path.join(appData(),'runtime','everything','es.exe'),path.join(process.env.LOCALAPPDATA||'','Microsoft','WinGet','Links','es.exe')];for(const p of candidates)if(await exists(p))return p;return where('es.exe');}
async function resolveEverything(){const candidates=[path.join(process.env.PROGRAMFILES||'','Everything','Everything.exe'),path.join(process.env.LOCALAPPDATA||'','Everything','Everything.exe')];for(const p of candidates)if(await exists(p))return p;return where('Everything.exe');}
async function ensureEverything(){const exe=await resolveEverything();if(!exe)return false;try{const {stdout}=await execFileAsync('tasklist.exe',['/FI','IMAGENAME eq Everything.exe','/NH'],{windowsHide:true,timeout:10000});if(!/Everything\.exe/i.test(stdout)){const child=spawn(exe,['-startup'],{detached:true,stdio:'ignore',windowsHide:true});child.unref();await new Promise(r=>setTimeout(r,1200));}return true;}catch{return false;}}
async function fixedDrives(){try{const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object DeviceID,VolumeName,FileSystem,Size,FreeSpace | ConvertTo-Json -Compress"],{windowsHide:true,timeout:15000,maxBuffer:2_000_000});if(!stdout.trim())return[];const x=JSON.parse(stdout);return (Array.isArray(x)?x:[x]).map(d=>({drive:d.DeviceID,label:d.VolumeName||'',fileSystem:d.FileSystem||'',size:Number(d.Size||0),free:Number(d.FreeSpace||0)}));}catch{return[];}}
async function everythingSearch(query,{extensions=[],limit=50,pathRoot=''}={}){const es=await resolveEs();if(!es)return null;await ensureEverything();const max=Math.max(1,Math.min(Number(limit)||50,500)),fetchMax=Math.min(2000,Math.max(max,max*5));let search=String(query||'').trim();const exts=(extensions||[]).map(x=>String(x).replace(/^\./,'').replace(/[^a-z0-9]/gi,'')).filter(Boolean);if(exts.length)search+=` ext:${exts.join(';')}`;try{const args=['-n',String(fetchMax),'-full-path-and-name'];if(pathRoot)args.push('-path',pathRoot);args.push(search);const {stdout}=await execFileAsync(es,args,{windowsHide:true,timeout:25000,maxBuffer:12_000_000});return stdout.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,fetchMax);}catch{return null;}}
async function fallbackSearch(query,{extensions=[],limit=50,kind='file'}={}){const max=Math.max(1,Math.min(Number(limit)||50,200)),needle=q(query),exts=(extensions||[]).map(x=>String(x).replace(/^\./,'').replace(/[^a-z0-9]/gi,'')).filter(Boolean);const filter=exts.length?`$ext=@(${exts.map(x=>`'.${q(x)}'`).join(',')});`:'$ext=@();';const kindExpr=kind==='folder'?'$_.PSIsContainer':kind==='any'?'$true':'!$_.PSIsContainer';const script=`$ErrorActionPreference='SilentlyContinue';${filter}$max=${max};$out=New-Object System.Collections.Generic.List[string];$drives=Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3'|Select-Object -ExpandProperty DeviceID;foreach($d in $drives){Get-ChildItem ($d+'\\') -Force -Recurse -ErrorAction SilentlyContinue | Where-Object { ${kindExpr} -and $_.Name -like '*${needle}*' -and ($ext.Count -eq 0 -or $_.Extension -in $ext) } | ForEach-Object {if($out.Count -lt $max){$out.Add($_.FullName)}};if($out.Count -ge $max){break}};$out|ConvertTo-Json -Compress`;
  try{const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:120000,maxBuffer:12_000_000});if(!stdout.trim())return[];const x=JSON.parse(stdout);return (Array.isArray(x)?x:[x]).filter(Boolean);}catch(e){if(e.killed||e.signal)return[];throw e;}}
async function resolveHintRoot(hint=''){const h=String(hint||'').trim();if(!h)return'';const paths=await everythingSearch(h,{limit:80});if(!paths)return'';const dirs=[];for(const p of paths){try{const s=await fs.stat(p);if(s.isDirectory())dirs.push(p);}catch{}}dirs.sort((a,b)=>{const an=path.basename(a).toLowerCase(),bn=path.basename(b).toLowerCase(),hl=h.toLowerCase();return Number(bn===hl)-Number(an===hl)||a.length-b.length;});return dirs[0]||'';}
async function globalSearch(query,opts={}){let engine='everything',paths=null;if(opts.path_hint){const root=await resolveHintRoot(opts.path_hint);if(root){paths=await everythingSearch(query,{...opts,pathRoot:root});engine='everything-scoped';}}if(paths===null)paths=await everythingSearch(query,opts);if(paths===null){paths=await fallbackSearch(query,opts);engine='powershell-fallback';}const out=[],kind=opts.kind||'file',max=Math.max(1,Math.min(Number(opts.limit)||50,500));for(const p of paths){try{const s=await fs.stat(p),isDir=s.isDirectory(),isFile=s.isFile();if(kind==='file'&&!isFile)continue;if(kind==='folder'&&!isDir)continue;out.push({name:path.basename(p),path:p,type:isDir?'directory':'file',size:isFile?s.size:0,modified:s.mtime.toISOString(),extension:isFile?path.extname(p).toLowerCase():''});if(out.length>=max)break;}catch{} }return {engine,items:out};}
function rankSearch(data,query,{extensions=[],pathHint='',kind='file'}={}){data.items=rankFileCandidates(data.items,{query,extensions,pathHint,kind});return data;}
export const storageTools={
  storage_overview:tool('read','List fixed local Windows drives and capacity so Maria understands the machine storage layout',schema({}),async()=>result('storage_overview',true,'Storage overview loaded',{drives:await fixedDrives(),everythingCli:Boolean(await resolveEs()),everything:Boolean(await resolveEverything())})),
  global_find_files:tool('read','Find and rank files/folders across fixed drives. Exact basename, requested extension and path hints outrank weak partial matches.',schema({query:{type:'string'},extensions:{type:'array',items:{type:'string'}},limit:{type:'number'},kind:{type:'string',enum:['file','folder','any']},path_hint:{type:'string'}},['query']),async({query,extensions=[],limit=50,kind='file',path_hint=''})=>{
    const wanted=Math.max(1,Math.min(Number(limit)||50,500)),searchLimit=Math.max(wanted,path_hint?300:Math.min(200,wanted*4)),data=rankSearch(await globalSearch(query,{extensions,limit:searchLimit,kind,path_hint}),query,{extensions,pathHint:path_hint,kind});
    data.items=data.items.slice(0,wanted);const best=data.items[0]?.path||'';
    return result('global_find_files',true,best?`${data.items.length} نتیجه رتبه‌بندی شد؛ بهترین نتیجه: ${best}`:`چیزی با نام ${query} پیدا نشد`,data);
  }),
  open_named_file:tool('low','Find, rank and open the best matching file. Refuses weak ambiguous matches rather than opening a random file.',schema({name:{type:'string'},extensions:{type:'array',items:{type:'string'}},path_hint:{type:'string'}},['name']),async({name,extensions=[],path_hint=''})=>{
    const raw=await globalSearch(name,{extensions,limit:path_hint?400:160,kind:'file',path_hint}),picked=bestFileCandidate(raw.items,{query:name,extensions,pathHint:path_hint,kind:'file'}),ranked=picked.ranked.slice(0,30),item=picked.best;
    if(!item)return result('open_named_file',false,'No matching file found',{query:name,engine:raw.engine,candidates:[]});
    if(picked.ambiguous&&item._matchScore<95)return result('open_named_file',false,'Several similar files were found; the best match is not reliable enough to open automatically',{query:name,engine:raw.engine,ambiguous:true,candidates:ranked.slice(0,10)});
    spawn('explorer.exe',[item.path],{detached:true,windowsHide:true});
    return result('open_named_file',true,'Best matching file opened',{...item,engine:raw.engine,ambiguous:picked.ambiguous,candidates:ranked.slice(0,10)});
  }),
  reveal_named_file:tool('low','Find, rank and reveal the best matching file in Windows Explorer',schema({name:{type:'string'},extensions:{type:'array',items:{type:'string'}},path_hint:{type:'string'}},['name']),async({name,extensions=[],path_hint=''})=>{
    const raw=await globalSearch(name,{extensions,limit:path_hint?300:120,kind:'file',path_hint}),picked=bestFileCandidate(raw.items,{query:name,extensions,pathHint:path_hint,kind:'file'}),item=picked.best;
    if(!item)return result('reveal_named_file',false,'No matching file found',{query:name,engine:raw.engine});
    if(picked.ambiguous&&item._matchScore<90)return result('reveal_named_file',false,'Several similar files were found; choose a more specific name or folder hint',{query:name,engine:raw.engine,ambiguous:true,candidates:picked.ranked.slice(0,10)});
    spawn('explorer.exe',['/select,',item.path],{detached:true,windowsHide:true});
    return result('reveal_named_file',true,'Best matching file revealed',{...item,engine:raw.engine,candidates:picked.ranked.slice(0,10)});
  }),
  open_named_folder:tool('low','Find, rank and open the best matching folder. Exact names and folder path hints are preferred.',schema({name:{type:'string'},path_hint:{type:'string'}},['name']),async({name,path_hint=''})=>{
    const raw=await globalSearch(name,{limit:path_hint?300:120,kind:'folder',path_hint}),picked=bestFileCandidate(raw.items,{query:name,pathHint:path_hint,kind:'folder'}),item=picked.best;
    if(!item)return result('open_named_folder',false,'No matching folder found',{query:name,engine:raw.engine});
    if(picked.ambiguous&&item._matchScore<90)return result('open_named_folder',false,'Several similar folders were found; use a more specific folder name or path hint',{query:name,engine:raw.engine,ambiguous:true,candidates:picked.ranked.slice(0,10)});
    spawn('explorer.exe',[item.path],{detached:true,windowsHide:true});
    return result('open_named_folder',true,`پوشه پیدا و باز شد: ${item.path}`,{...item,engine:raw.engine,candidates:picked.ranked.slice(0,10)});
  })
};
