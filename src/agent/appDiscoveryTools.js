import { execFile,spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const execFileAsync=promisify(execFile);
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const quote=s=>String(s??'').replaceAll("'","''");
const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\u200c/g,' ').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
const tokens=s=>[...new Set(norm(s).split(' ').filter(x=>x.length>1))];
const bigrams=s=>{const x=norm(s).replace(/\s+/g,'');if(x.length<2)return new Set([x]);const out=new Set();for(let i=0;i<x.length-1;i++)out.add(x.slice(i,i+2));return out;};
const similarity=(a,b)=>{const A=bigrams(a),B=bigrams(b);if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;return (2*hit)/(A.size+B.size);};
async function ps(script,timeout=60000){const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout,maxBuffer:12_000_000});return stdout.trim();}
const parse=raw=>{if(!raw)return[];const x=JSON.parse(raw);return Array.isArray(x)?x:[x];};
const roots=`@($env:ProgramData+'\\Microsoft\\Windows\\Start Menu\\Programs',$env:APPDATA+'\\Microsoft\\Windows\\Start Menu\\Programs')`;
const aliasMap=new Map([
 ['کروم','Google Chrome'],['گوگل کروم','Google Chrome'],['chrome','Google Chrome'],
 ['اج','Microsoft Edge'],['مایکروسافت اج','Microsoft Edge'],['edge','Microsoft Edge'],
 ['اکسل','Excel'],['ورد','Word'],['پاورپوینت','PowerPoint'],['وی اس کد','Visual Studio Code'],['وی اس کود','Visual Studio Code'],['vscode','Visual Studio Code'],
 ['تلگرام','Telegram'],['واتساپ','WhatsApp'],['روبیکا','Rubika'],['اینستاگرام','Instagram'],['فتوشاپ','Adobe Photoshop'],['ایلوستریتور','Adobe Illustrator'],
 ['نوت پد','Notepad'],['ماشین حساب','Calculator'],['فایل اکسپلورر','File Explorer']
]);
const appDataDir=()=>process.env.BLACK_CLOVER_DATA_DIR||path.join(process.env.APPDATA||path.join(os.homedir(),'.black-clover'),'BlackClover');
const catalogFile=()=>path.join(appDataDir(),'app-catalog.json');
let catalogCache={at:0,items:[]};
async function loadDiskCatalog(){try{const raw=JSON.parse(await fs.readFile(catalogFile(),'utf8'));if(Array.isArray(raw?.items)&&raw.items.length&&Date.now()-Number(raw.savedAt||0)<24*60*60*1000){catalogCache={at:Number(raw.savedAt)||Date.now(),items:raw.items};return raw.items;}}catch{}return[];}
async function saveDiskCatalog(items){try{await fs.mkdir(appDataDir(),{recursive:true});await fs.writeFile(catalogFile(),JSON.stringify({savedAt:Date.now(),items},null,2),'utf8');}catch{}}

const knownApp=name=>{
  const n=norm(name),env=process.env,candidates=[];
  if(/chrome|کروم/.test(n))candidates.push(path.join(env.PROGRAMFILES||'','Google','Chrome','Application','chrome.exe'),path.join(env['PROGRAMFILES(X86)']||'','Google','Chrome','Application','chrome.exe'),path.join(env.LOCALAPPDATA||'','Google','Chrome','Application','chrome.exe'));
  else if(/edge|مایکروسافت اج|^اج$/.test(n))candidates.push(path.join(env['PROGRAMFILES(X86)']||'','Microsoft','Edge','Application','msedge.exe'),path.join(env.PROGRAMFILES||'','Microsoft','Edge','Application','msedge.exe'));
  else if(/excel|اکسل/.test(n))candidates.push(path.join(env.PROGRAMFILES||'','Microsoft Office','root','Office16','EXCEL.EXE'),path.join(env['PROGRAMFILES(X86)']||'','Microsoft Office','root','Office16','EXCEL.EXE'));
  else if(/word|ورد/.test(n))candidates.push(path.join(env.PROGRAMFILES||'','Microsoft Office','root','Office16','WINWORD.EXE'),path.join(env['PROGRAMFILES(X86)']||'','Microsoft Office','root','Office16','WINWORD.EXE'));
  else if(/powerpoint|پاورپوینت/.test(n))candidates.push(path.join(env.PROGRAMFILES||'','Microsoft Office','root','Office16','POWERPNT.EXE'),path.join(env['PROGRAMFILES(X86)']||'','Microsoft Office','root','Office16','POWERPNT.EXE'));
  else if(/visual studio code|vscode|vs code|وی اس کد/.test(n))candidates.push(path.join(env.LOCALAPPDATA||'','Programs','Microsoft VS Code','Code.exe'));
  else if(/notepad|نوت پد/.test(n))return {name:'Notepad',kind:'direct',target:'notepad.exe',source:'builtin'};
  else if(/calculator|ماشین حساب/.test(n))return {name:'Calculator',kind:'direct',target:'calc.exe',source:'builtin'};
  else if(/file explorer|explorer|فایل اکسپلورر/.test(n))return {name:'File Explorer',kind:'direct',target:'explorer.exe',source:'builtin'};
  for(const target of candidates)if(target&&existsSync(target))return {name,kind:'direct',target,source:'known-path'};
  return null;
};
async function catalog({fresh=false}={}){
  if(!fresh&&catalogCache.items.length&&Date.now()-catalogCache.at<15*60*1000)return catalogCache.items;
  if(!fresh){const disk=await loadDiskCatalog();if(disk.length)return disk;}
  // Keep the blocking inventory intentionally small. Recursive Start Menu scanning took
  // ~28s on the real target machine; Get-StartApps + App Paths cover normal installed apps.
  const script=`$out=@();
  try{Get-StartApps|ForEach-Object {$out+=[pscustomobject]@{name=$_.Name;kind='startapp';target=$_.AppID;source='startapps'}}}catch{}
  $reg=@('HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\*','HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\*','HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\*');
  foreach($r in $reg){try{Get-ItemProperty $r -ErrorAction SilentlyContinue|ForEach-Object {if($_.'(default)'){$out+=[pscustomobject]@{name=$_.PSChildName;kind='app-path';target=$_.'(default)';source='registry'}}}}catch{}}
  $out|Where-Object {$_.name -and $_.target}|Sort-Object name,kind,target -Unique|Select-Object -First 3000|ConvertTo-Json -Depth 4 -Compress`;
  const items=parse(await ps(script,30000)).map(x=>({...x,norm:norm(x.name)}));catalogCache={at:Date.now(),items};await saveDiskCatalog(items);return items;
}
function rank(items,name){
  const q0=norm(name),q=norm(aliasMap.get(q0)||name),qt=tokens(q);
  return items.map(item=>{const n=item.norm||norm(item.name),nt=tokens(n);let score=0;if(n===q)score+=100;if(n.includes(q)||q.includes(n))score+=45;for(const t of qt)if(nt.some(x=>x===t||x.includes(t)||t.includes(x)))score+=12;score+=similarity(q,n)*30;if(/uninstall|remove|helper|updater/i.test(item.name))score-=15;return {...item,score};}).filter(x=>x.score>=12).sort((a,b)=>b.score-a.score||a.name.length-b.name.length);
}
async function discover(name,{limit=20}={}){
  const quick=knownApp(name);if(quick)return [{...quick,score:160}];
  let items=rank(await catalog(),name);
  if(!items.length)items=rank(await catalog({fresh:true}),name);
  const seen=new Set(),out=[];for(const x of items){const k=`${x.kind}|${x.target}`;if(seen.has(k))continue;seen.add(k);out.push(x);if(out.length>=limit)break;}return out;
}
function launch(item){
  if(item.kind==='direct'||item.kind==='app-path'){const child=spawn(item.target,[],{detached:true,stdio:'ignore',windowsHide:false});child.unref();return;}
  if(item.kind==='startapp'){spawn('explorer.exe',[`shell:AppsFolder\\${item.target}`],{detached:true,stdio:'ignore',windowsHide:true}).unref();return;}
  spawn('cmd.exe',['/c','start','',item.target],{detached:true,stdio:'ignore',windowsHide:true}).unref();
}
export const appDiscoveryTools={
  find_any_app:tool('read','Resolve an installed Windows application from a human name using a cached full app catalog, aliases and fuzzy matching across Start Apps, Start Menu and App Paths.',{type:'object',properties:{name:{type:'string'},limit:{type:'number'}},required:['name']},async({name,limit=20})=>{const items=await discover(name,{limit:Math.max(1,Math.min(Number(limit)||20,80))});return result('find_any_app',true,items.length?'Installed applications found':'No matching installed application found',items);}),
  list_known_apps:tool('read','List Maria’s discovered installed-app catalog. Optional filter accepts a partial/fuzzy app name.',{type:'object',properties:{filter:{type:'string'},limit:{type:'number'}},required:[]},async({filter='',limit=200})=>{const all=await catalog(),items=filter?rank(all,filter):all;return result('list_known_apps',true,'Application catalog loaded',{total:all.length,items:items.slice(0,Math.max(1,Math.min(Number(limit)||200,1000)))});}),
  refresh_app_catalog:tool('low','Refresh Maria’s local installed-application catalog after software installation or removal.',{type:'object',properties:{},required:[]},async()=>{const items=await catalog({fresh:true});return result('refresh_app_catalog',true,'Application catalog refreshed',{total:items.length});}),
  find_running_app:tool('read','Check whether an application is currently running by matching its process name or visible window title.',{type:'object',properties:{name:{type:'string'},target:{type:'string'}},required:['name']},async({name,target=''})=>{const base=path.basename(String(target||'')).replace(/\.exe$/i,''),terms=[name,base,...tokens(name)].map(x=>String(x||'').trim()).filter(x=>x.length>1).slice(0,8),arr=terms.map(x=>`'${quote(x)}'`).join(',');const raw=await ps(`$terms=@(${arr});Get-Process -ErrorAction SilentlyContinue|Where-Object {$n=$_.ProcessName;$t=$_.MainWindowTitle;$hit=$false;foreach($q in $terms){if($n -like ('*'+$q+'*') -or $t -like ('*'+$q+'*')){$hit=$true;break}};$hit}|Select-Object -First 20 ProcessName,Id,MainWindowTitle|ConvertTo-Json -Compress`,15000);const items=parse(raw);return result('find_running_app',true,items.length?'Running application found':'Application is not currently visible/running',{running:items.length>0,items,terms});}),
  launch_any_app:tool('low','Launch any installed Windows application by approximate human name using Maria’s fuzzy app catalog.',{type:'object',properties:{name:{type:'string'}},required:['name']},async({name})=>{const items=await discover(name,{limit:10}),item=items[0];if(!item)return result('launch_any_app',false,'Application not found',{query:name});launch(item);return result('launch_any_app',true,'Application launched',{...item,candidates:items.slice(0,5)});})
};
export { catalog as discoverAppCatalog, discover as discoverInstalledApp };
