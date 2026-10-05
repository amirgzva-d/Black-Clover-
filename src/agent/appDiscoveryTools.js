import { execFile,spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import path from 'node:path';
const execFileAsync=promisify(execFile);
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const quote=s=>String(s??'').replaceAll("'","''");
async function ps(script,timeout=60000){const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout,maxBuffer:8_000_000});return stdout.trim();}
const parse=raw=>{if(!raw)return[];const x=JSON.parse(raw);return Array.isArray(x)?x:[x];};
const roots=`@($env:ProgramData+'\\Microsoft\\Windows\\Start Menu\\Programs',$env:APPDATA+'\\Microsoft\\Windows\\Start Menu\\Programs')`;
const discoveryCache=new Map();
const knownApp=name=>{
  const n=String(name||'').toLowerCase();
  const env=process.env,candidates=[];
  if(/chrome/.test(n))candidates.push(path.join(env.PROGRAMFILES||'','Google','Chrome','Application','chrome.exe'),path.join(env['PROGRAMFILES(X86)']||'','Google','Chrome','Application','chrome.exe'),path.join(env.LOCALAPPDATA||'','Google','Chrome','Application','chrome.exe'));
  else if(/telegram/.test(n))return {name:'Telegram Desktop',kind:'startapp',target:'TelegramMessengerLLP.TelegramDesktop_t4vj0pshhgkwm!Telegram.TelegramDesktop.Store'};
  else if(/visual studio code|vscode|vs code/.test(n))candidates.push(path.join(env.LOCALAPPDATA||'','Programs','Microsoft VS Code','Code.exe'));
  else if(/notepad/.test(n))return {name:'Notepad',kind:'direct',target:'notepad.exe'};
  else if(/calculator/.test(n))return {name:'Calculator',kind:'direct',target:'calc.exe'};
  else if(/file explorer|explorer/.test(n))return {name:'File Explorer',kind:'direct',target:'explorer.exe'};
  for(const target of candidates)if(target&&existsSync(target))return {name,kind:'direct',target};
  return null;
};

async function discover(name){
  const quick=knownApp(name);if(quick)return [quick];
  const key=String(name||'').trim().toLowerCase(),cached=discoveryCache.get(key);if(cached&&Date.now()-cached.at<10*60*1000)return cached.items;
  const q=quote(name);
  const script=`$q='${q}';$out=@();
  try{Get-StartApps|Where-Object {$_.Name -like ('*'+$q+'*')}|Select-Object -First 40|ForEach-Object {$out+=[pscustomobject]@{name=$_.Name;kind='startapp';target=$_.AppID}}}catch{}
  try{$roots=${roots};Get-ChildItem $roots -Recurse -Filter *.lnk -ErrorAction SilentlyContinue|Where-Object {$_.BaseName -like ('*'+$q+'*')}|Select-Object -First 40|ForEach-Object {$out+=[pscustomobject]@{name=$_.BaseName;kind='shortcut';target=$_.FullName}}}catch{}
  $reg=@('HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\*','HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\*','HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\*');
  foreach($r in $reg){try{Get-ItemProperty $r -ErrorAction SilentlyContinue|Where-Object {$_.PSChildName -like ('*'+$q+'*') -or $_.'(default)' -like ('*'+$q+'*')}|Select-Object -First 30|ForEach-Object {$out+=[pscustomobject]@{name=$_.PSChildName;kind='app-path';target=$_.'(default)'}}}catch{}}
  $out|Where-Object {$_.target}|Sort-Object name,kind -Unique|Select-Object -First 80|ConvertTo-Json -Depth 4 -Compress`;
  const items=parse(await ps(script));discoveryCache.set(key,{at:Date.now(),items});return items;
}

export const appDiscoveryTools={
  find_any_app:tool('read','Discover an installed Windows application by human name across Start Apps, Start Menu shortcuts and App Paths registry. Use when normal app lookup may miss the program.',{type:'object',properties:{name:{type:'string'}},required:['name']},async({name})=>{const items=await discover(name);return result('find_any_app',true,items.length?'Installed applications found':'No matching installed application found',items);}),
  launch_any_app:tool('low','Launch an installed Windows application discovered by human name, including Store/Start Apps and traditional desktop apps.',{type:'object',properties:{name:{type:'string'}},required:['name']},async({name})=>{
    const items=await discover(name),item=items[0];if(!item)return result('launch_any_app',false,'Application not found');
    if(item.kind==='direct'){const child=spawn(item.target,[],{detached:true,stdio:'ignore',windowsHide:false});child.unref();return result('launch_any_app',true,'Application launched',{...item});}
    if(item.kind==='startapp'){spawn('explorer.exe',[`shell:AppsFolder\\${item.target}`],{detached:true,windowsHide:true});return result('launch_any_app',true,'Application launched',{...item});}
    spawn('cmd.exe',['/c','start','',item.target],{detached:true,windowsHide:true});return result('launch_any_app',true,'Application launched',{...item});
  })
};
