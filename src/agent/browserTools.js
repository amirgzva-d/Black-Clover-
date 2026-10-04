import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile,spawn } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const schema=(properties,required=[])=>({type:'object',properties,required});
const SERVICES={telegram:'https://web.telegram.org/',whatsapp:'https://web.whatsapp.com/',rubika:'https://web.rubika.ir/',chatgpt:'https://chatgpt.com/',qwen:'https://chat.qwen.ai/',deepseek:'https://chat.deepseek.com/',claude:'https://claude.ai/',youtube:'https://www.youtube.com/',google:'https://www.google.com/'};
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function where(exe){try{const {stdout}=await execFileAsync('where.exe',[exe],{windowsHide:true,timeout:8000});return stdout.trim().split(/\r?\n/)[0]||null;}catch{return null;}}
async function chromeExe(){
  const candidates=[path.join(process.env.PROGRAMFILES||'','Google','Chrome','Application','chrome.exe'),path.join(process.env['PROGRAMFILES(X86)']||'','Google','Chrome','Application','chrome.exe'),path.join(process.env.LOCALAPPDATA||'','Google','Chrome','Application','chrome.exe')];
  for(const p of candidates)if(await exists(p))return p;
  try{const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$p=(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe','HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty '(default)');if($p){$p}"],{windowsHide:true,timeout:10000});if(stdout.trim())return stdout.trim();}catch{}
  return where('chrome.exe');
}
export async function openChromeUrl(url){const u=new URL(url);if(!['http:','https:'].includes(u.protocol))throw new Error('Only http/https URLs are allowed');const exe=await chromeExe();if(!exe)throw new Error('Google Chrome is not installed or could not be discovered');const child=spawn(exe,[u.href],{detached:true,stdio:'ignore',windowsHide:false});child.unref();return {exe,url:u.href};}

export const browserTools={
  chrome_status:tool('read','Check whether Google Chrome can be discovered for workflows that must run in Chrome',schema({}),async()=>{const exe=await chromeExe();return result('chrome_status',Boolean(exe),exe?'Chrome ready':'Chrome not found',{exe});}),
  chrome_open_url:tool('low','Open a public http/https URL specifically in Google Chrome, not merely the default browser',schema({url:{type:'string'}},['url']),async({url})=>result('chrome_open_url',true,'URL opened in Chrome',await openChromeUrl(url))),
  chrome_search:tool('low','Search Google specifically in Google Chrome',schema({query:{type:'string'}},['query']),async({query})=>{const url=`https://www.google.com/search?q=${encodeURIComponent(query)}`;return result('chrome_search',true,'Google search opened in Chrome',{query,...await openChromeUrl(url)});}),
  chrome_open_service:tool('low','Open a supported web service specifically in Google Chrome. Supported: Telegram, WhatsApp, Rubika, ChatGPT, Qwen, DeepSeek, Claude, YouTube and Google.',schema({service:{type:'string',enum:Object.keys(SERVICES)}},['service']),async({service})=>{const key=String(service).toLowerCase(),url=SERVICES[key];if(!url)return result('chrome_open_service',false,'Unsupported service');return result('chrome_open_service',true,`${service} opened in Chrome`,{service,...await openChromeUrl(url)});})
};
