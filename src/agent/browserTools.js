import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile,spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { chromeProfiles } from './browser/ChromeProfileResolver.js';

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
async function resolvedProfile(profile,profileKind='personal'){
  if(profile)return profile;
  return profileKind==='business'?chromeProfiles.business():chromeProfiles.personal();
}
export async function openChromeUrl(url,{profile=null,profileKind='personal'}={}){
  const u=new URL(url);if(!['http:','https:'].includes(u.protocol))throw new Error('Only http/https URLs are allowed');
  const exe=await chromeExe();if(!exe)throw new Error('Google Chrome is not installed or could not be discovered');
  const chosen=await resolvedProfile(profile,profileKind),args=[];if(chosen)args.push(`--profile-directory=${chosen}`);args.push(u.href);
  const child=spawn(exe,args,{detached:true,stdio:'ignore',windowsHide:false});child.unref();
  return {exe,url:u.href,profile:chosen,profileKind};
}
const serviceKind=service=>['whatsapp','rubika'].includes(String(service||'').toLowerCase())?'business':'personal';

export const browserTools={
  chrome_status:tool('read','Check Chrome and Maria Chrome profile routing. Personal search should resolve the account named Amir Mohamed; WhatsApp/Rubika should resolve the business account named شرکت.',schema({}),async()=>{const exe=await chromeExe(),profiles=await chromeProfiles.load({fresh:true});return result('chrome_status',Boolean(exe),exe?'Chrome ready':'Chrome not found',{exe,...profiles});}),
  chrome_profiles:tool('read','List Chrome profiles Maria discovered and show which profile is routed for personal search versus business WhatsApp/Rubika.',schema({}),async()=>result('chrome_profiles',true,'Chrome profiles resolved',await chromeProfiles.load({fresh:true}))),
  chrome_open_url:tool('low','Open a public http/https URL in Google Chrome. Uses the personal Amir Mohamed profile unless a profile is explicitly supplied.',schema({url:{type:'string'},profile:{type:'string'},profile_kind:{type:'string',enum:['personal','business']}},['url']),async({url,profile=null,profile_kind='personal'})=>result('chrome_open_url',true,'URL opened in Chrome',await openChromeUrl(url,{profile,profileKind:profile_kind}))),
  chrome_search:tool('low','Open real Google search results in Chrome using the personal Amir Mohamed profile. This must open /search?q=..., not only the Google homepage.',schema({query:{type:'string'}},['query']),async({query})=>{const q=String(query||'').trim();if(!q)return result('chrome_search',false,'Search query is empty');const url=`https://www.google.com/search?q=${encodeURIComponent(q)}`;return result('chrome_search',true,'Google search results opened in personal Chrome',{query:q,...await openChromeUrl(url,{profileKind:'personal'})});}),
  chrome_open_service:tool('low','Open a supported web service in the correct Chrome account. WhatsApp and Rubika use the business profile named شرکت; Google/search/AI sites use the personal profile named Amir Mohamed.',schema({service:{type:'string',enum:Object.keys(SERVICES)}},['service']),async({service})=>{const key=String(service).toLowerCase(),url=SERVICES[key];if(!url)return result('chrome_open_service',false,'Unsupported service');const profileKind=serviceKind(key);return result('chrome_open_service',true,`${service} opened in ${profileKind} Chrome`,{service,...await openChromeUrl(url,{profileKind})});})
};
