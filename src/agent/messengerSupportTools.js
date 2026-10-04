import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile,spawn } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const schema=(properties,required=[])=>({type:'object',properties,required});
const appRoots=`@($env:ProgramData+'\\Microsoft\\Windows\\Start Menu\\Programs',$env:APPDATA+'\\Microsoft\\Windows\\Start Menu\\Programs')`;
const serviceNames={telegram:['Telegram'],whatsapp:['WhatsApp'],rubika:['Rubika','روبیکا']};
const webFallback={telegram:'https://web.telegram.org/',whatsapp:'https://web.whatsapp.com/',rubika:'https://web.rubika.ir/'};
const quote=s=>String(s??'').replaceAll("'","''");
async function ps(script,timeout=60000){const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout,maxBuffer:4_000_000});return stdout.trim();}
async function openMessenger(service){const key=String(service||'').toLowerCase(),names=serviceNames[key];if(!names)throw new Error('Unsupported messenger');const patterns=names.map(n=>`$_.BaseName -like '*${quote(n)}*'`).join(' -or ');const raw=await ps(`$p=${appRoots};$x=Get-ChildItem $p -Recurse -Filter *.lnk -ErrorAction SilentlyContinue | Where-Object {${patterns}} | Select-Object -First 1;if($x){Start-Process $x.FullName;$x.FullName}`);if(raw)return {service:key,mode:'desktop',target:raw};const url=webFallback[key];if(url){spawn('cmd.exe',['/c','start','',url],{detached:true,windowsHide:true});return {service:key,mode:'web',target:url};}return {service:key,mode:'missing',target:null};}
async function putFilesOnClipboard(files){const resolved=[];for(const f of files||[]){const p=path.resolve(String(f));const s=await fs.stat(p);if(!s.isFile())throw new Error(`Not a file: ${p}`);resolved.push(p);}if(!resolved.length)throw new Error('No files supplied');const arr=resolved.map(x=>`'${quote(x)}'`).join(',');await ps(`Add-Type -AssemblyName System.Windows.Forms;$c=New-Object System.Collections.Specialized.StringCollection;@(${arr})|ForEach-Object{[void]$c.Add($_)};[System.Windows.Forms.Clipboard]::SetFileDropList($c)`);return resolved;}
export const messengerSupportTools={
  messenger_open:tool('low','Open Telegram, WhatsApp or Rubika. Prefer an installed desktop app; all three can fall back to their web client',schema({service:{type:'string',enum:['telegram','whatsapp','rubika']}},['service']),async({service})=>{const data=await openMessenger(service);return result('messenger_open',data.mode!=='missing',data.mode==='missing'?'Messenger app not found':'Messenger opened',data);}),
  copy_files_to_clipboard:tool('low','Put one or more local files on the Windows file-drop clipboard so a selected chat can receive them with paste',schema({files:{type:'array',items:{type:'string'}}},['files']),async({files})=>result('copy_files_to_clipboard',true,'Files staged on clipboard',{files:await putFilesOnClipboard(files)})),
  messenger_stage_files:tool('low','Open Telegram, WhatsApp or Rubika and stage local files on the Windows clipboard. If the desktop app is missing, use the web client; then use UI inspection/vision to select the exact requested contact before pasting',schema({service:{type:'string',enum:['telegram','whatsapp','rubika']},files:{type:'array',items:{type:'string'}}},['service','files']),async({service,files})=>{const opened=await openMessenger(service),staged=await putFilesOnClipboard(files);return result('messenger_stage_files',opened.mode!=='missing',opened.mode==='missing'?'Messenger app not found; files are staged':'Messenger opened and files staged',{opened,files:staged,next:'Use UI Automation or vision to verify and select the requested chat, then paste with existing keyboard/UI tools.'});})
};
