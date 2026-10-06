import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile,spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveDefaultChromeProfile,resolveBusinessChromeProfile,profileDisplayLabel } from './v2/ChromeProfileResolver.js';
const execFileAsync=promisify(execFile);
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const schema=(properties,required=[])=>({type:'object',properties,required});
const SERVICES={telegram:'https://web.telegram.org/',whatsapp:'https://web.whatsapp.com/',rubika:'https://web.rubika.ir/',chatgpt:'https://chatgpt.com/',qwen:'https://chat.qwen.ai/',deepseek:'https://chat.deepseek.com/',claude:'https://claude.ai/',youtube:'https://www.youtube.com/',google:'https://www.google.com/'};
const DEFAULT_PROFILE=process.env.BLACK_CLOVER_CHROME_DEFAULT_PROFILE||'Profile 1';
const BUSINESS_PROFILE=process.env.BLACK_CLOVER_CHROME_BUSINESS_PROFILE||'Profile 19';
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function where(exe){try{const {stdout}=await execFileAsync('where.exe',[exe],{windowsHide:true,timeout:8000});return stdout.trim().split(/\r?\n/)[0]||null;}catch{return null;}}
async function chromeExe(){
  const candidates=[path.join(process.env.PROGRAMFILES||'','Google','Chrome','Application','chrome.exe'),path.join(process.env['PROGRAMFILES(X86)']||'','Google','Chrome','Application','chrome.exe'),path.join(process.env.LOCALAPPDATA||'','Google','Chrome','Application','chrome.exe')];for(const p of candidates)if(await exists(p))return p;
  try{const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$p=(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe','HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty '(default)');if($p){$p}"],{windowsHide:true,timeout:10000});if(stdout.trim())return stdout.trim();}catch{}return where('chrome.exe');
}
export async function openChromeUrl(url,{profile=null,profileKind='default'}={}){const u=new URL(url);if(!['http:','https:'].includes(u.protocol))throw new Error('Only http/https URLs are allowed');const exe=await chromeExe();if(!exe)throw new Error('Google Chrome is not installed or could not be discovered');const profileDirectory=profileKind==='business'?await resolveBusinessChromeProfile(profile):await resolveDefaultChromeProfile(profile);const args=[];if(profileDirectory)args.push(`--profile-directory=${profileDirectory}`);args.push(u.href);const child=spawn(exe,args,{detached:true,stdio:'ignore',windowsHide:false});child.unref();return {exe,url:u.href,profile:profileDirectory,profileKind,profileLabel:profileDisplayLabel(profileKind)};}
const serviceKind=service=>['whatsapp','rubika'].includes(String(service||'').toLowerCase())?'business':'default';
export const browserTools={
  chrome_status:tool('read','Check Chrome and resolve the Amir Mohamed default profile and company profile routing used by Maria',schema({}),async()=>{const exe=await chromeExe();const [defaultProfile,businessProfile]=await Promise.all([resolveDefaultChromeProfile(),resolveBusinessChromeProfile()]);return result('chrome_status',Boolean(exe),exe?'Chrome ready':'Chrome not found',{exe,defaultProfile,businessProfile,defaultLabel:profileDisplayLabel('default'),businessLabel:profileDisplayLabel('business')});}),
  chrome_open_url:tool('low','Open a public http/https URL in Google Chrome using the resolved Amir Mohamed profile by default',schema({url:{type:'string'},profile:{type:'string'}},['url']),async({url,profile=null})=>result('chrome_open_url',true,'URL opened in Chrome',await openChromeUrl(url,{profile,profileKind:'default'}))),
  chrome_search:tool('low','Perform a real Google search in Chrome using the resolved Amir Mohamed profile',schema({query:{type:'string'}},['query']),async({query})=>{const url=`https://www.google.com/search?q=${encodeURIComponent(query)}`;return result('chrome_search',true,'Google search opened in Chrome',{query,...await openChromeUrl(url,{profileKind:'default'})});}),
  chrome_open_service:tool('low','Open a supported web service in Chrome. WhatsApp and Rubika use the resolved company profile; normal web/Google/AI sites use the resolved Amir Mohamed profile. Telegram desktop commands should use the installed app.',schema({service:{type:'string',enum:Object.keys(SERVICES)}},['service']),async({service})=>{const key=String(service).toLowerCase(),url=SERVICES[key];if(!url)return result('chrome_open_service',false,'Unsupported service');const profileKind=serviceKind(key);return result('chrome_open_service',true,`${service} opened in Chrome`,{service,...await openChromeUrl(url,{profileKind})});})
};
