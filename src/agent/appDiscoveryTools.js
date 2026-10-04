import { execFile,spawn } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const quote=s=>String(s??'').replaceAll("'","''");
async function ps(script,timeout=60000){const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout,maxBuffer:8_000_000});return stdout.trim();}
const parse=raw=>{if(!raw)return[];const x=JSON.parse(raw);return Array.isArray(x)?x:[x];};
const roots=`@($env:ProgramData+'\\Microsoft\\Windows\\Start Menu\\Programs',$env:APPDATA+'\\Microsoft\\Windows\\Start Menu\\Programs')`;

async function discover(name){
  const q=quote(name);
  const script=`$q='${q}';$out=@();
  try{Get-StartApps|Where-Object {$_.Name -like ('*'+$q+'*')}|Select-Object -First 40|ForEach-Object {$out+=[pscustomobject]@{name=$_.Name;kind='startapp';target=$_.AppID}}}catch{}
  try{$roots=${roots};Get-ChildItem $roots -Recurse -Filter *.lnk -ErrorAction SilentlyContinue|Where-Object {$_.BaseName -like ('*'+$q+'*')}|Select-Object -First 40|ForEach-Object {$out+=[pscustomobject]@{name=$_.BaseName;kind='shortcut';target=$_.FullName}}}catch{}
  $reg=@('HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\*','HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\*','HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths\\*');
  foreach($r in $reg){try{Get-ItemProperty $r -ErrorAction SilentlyContinue|Where-Object {$_.PSChildName -like ('*'+$q+'*') -or $_.'(default)' -like ('*'+$q+'*')}|Select-Object -First 30|ForEach-Object {$out+=[pscustomobject]@{name=$_.PSChildName;kind='app-path';target=$_.'(default)'}}}catch{}}
  $out|Where-Object {$_.target}|Sort-Object name,kind -Unique|Select-Object -First 80|ConvertTo-Json -Depth 4 -Compress`;
  return parse(await ps(script));
}

export const appDiscoveryTools={
  find_any_app:tool('read','Discover an installed Windows application by human name across Start Apps, Start Menu shortcuts and App Paths registry. Use when normal app lookup may miss the program.',{type:'object',properties:{name:{type:'string'}},required:['name']},async({name})=>{const items=await discover(name);return result('find_any_app',true,items.length?'Installed applications found':'No matching installed application found',items);}),
  launch_any_app:tool('low','Launch an installed Windows application discovered by human name, including Store/Start Apps and traditional desktop apps.',{type:'object',properties:{name:{type:'string'}},required:['name']},async({name})=>{
    const items=await discover(name),item=items[0];if(!item)return result('launch_any_app',false,'Application not found');
    if(item.kind==='startapp'){spawn('explorer.exe',[`shell:AppsFolder\\${item.target}`],{detached:true,windowsHide:true});return result('launch_any_app',true,'Application launched',{...item});}
    spawn('cmd.exe',['/c','start','',item.target],{detached:true,windowsHide:true});return result('launch_any_app',true,'Application launched',{...item});
  })
};
