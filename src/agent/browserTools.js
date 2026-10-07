import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile,spawn } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync=promisify(execFile);
const result=(name,success,message,data=null)=>({tool_name:name,success,message,data});
const tool=(risk,description,schema,run)=>({risk,description,schema,run});
const schema=(properties,required=[])=>({type:'object',properties,required});
const SERVICES={telegram:'https://web.telegram.org/',whatsapp:'https://web.whatsapp.com/',rubika:'https://web.rubika.ir/',chatgpt:'https://chatgpt.com/',qwen:'https://chat.qwen.ai/',deepseek:'https://chat.deepseek.com/',claude:'https://claude.ai/',youtube:'https://www.youtube.com/',google:'https://www.google.com/'};
const SITES={github:'github.com',گیتهاب:'github.com',wikipedia:'wikipedia.org',ویکیپدیا:'wikipedia.org',youtube:'youtube.com',یوتیوب:'youtube.com',instagram:'instagram.com',اینستاگرام:'instagram.com',digikala:'digikala.com',دیجیکالا:'digikala.com',stackoverflow:'stackoverflow.com',استکاورفلو:'stackoverflow.com',microsoft:'microsoft.com',مایکروسافت:'microsoft.com',openai:'openai.com',اوپنای:'openai.com'};
const PERSONAL_PROFILE=process.env.BLACK_CLOVER_CHROME_PERSONAL_PROFILE||process.env.BLACK_CLOVER_CHROME_DEFAULT_PROFILE||'Profile 1';
const BUSINESS_PROFILE=process.env.BLACK_CLOVER_CHROME_BUSINESS_PROFILE||'Profile 19';
const PROFILE_ALIASES=new Map([
  ['personal',PERSONAL_PROFILE],['default',PERSONAL_PROFILE],['amir',PERSONAL_PROFILE],['amir mohamed',PERSONAL_PROFILE],['amir mohmd',PERSONAL_PROFILE],
  ['business',BUSINESS_PROFILE],['company',BUSINESS_PROFILE],['شرکت',BUSINESS_PROFILE]
]);
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function where(exe){try{const {stdout}=await execFileAsync('where.exe',[exe],{windowsHide:true,timeout:8000});return stdout.trim().split(/\r?\n/)[0]||null;}catch{return null;}}
async function chromeExe(){
  const candidates=[path.join(process.env.PROGRAMFILES||'','Google','Chrome','Application','chrome.exe'),path.join(process.env['PROGRAMFILES(X86)']||'','Google','Chrome','Application','chrome.exe'),path.join(process.env.LOCALAPPDATA||'','Google','Chrome','Application','chrome.exe')];for(const p of candidates)if(await exists(p))return p;
  try{const {stdout}=await execFileAsync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$p=(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe','HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe' -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty '(default)');if($p){$p}"],{windowsHide:true,timeout:10000});if(stdout.trim())return stdout.trim();}catch{}return where('chrome.exe');
}
const normalizeProfile=profile=>PROFILE_ALIASES.get(String(profile||'personal').trim().toLowerCase())||String(profile||PERSONAL_PROFILE);
const profileRole=dir=>dir===BUSINESS_PROFILE?'business':'personal';
const siteDomain=site=>{const raw=String(site||'').trim().toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0];return SITES[raw]||(/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(raw)?raw:'');};
export const chromeProfileForService=service=>['whatsapp','rubika'].includes(String(service||'').toLowerCase())?BUSINESS_PROFILE:PERSONAL_PROFILE;
async function profileSummary(dir){
  try{const p=path.join(process.env.LOCALAPPDATA||'','Google','Chrome','User Data','Local State'),raw=JSON.parse(await fs.readFile(p,'utf8')),v=raw?.profile?.info_cache?.[dir]||{};return {directory:dir,role:profileRole(dir),name:v.name||v.gaia_given_name||v.gaia_name||profileRole(dir)};}catch{return {directory:dir,role:profileRole(dir),name:profileRole(dir)};}
}
export async function openChromeUrl(url,{profile='personal'}={}){
  const u=new URL(url);if(!['http:','https:'].includes(u.protocol))throw new Error('Only http/https URLs are allowed');
  const exe=await chromeExe();if(!exe)throw new Error('Google Chrome is not installed or could not be discovered');
  const dir=normalizeProfile(profile),args=['--profile-directory='+dir,u.href];
  const child=spawn(exe,args,{detached:true,stdio:'ignore',windowsHide:false});child.unref();
  return {exe,url:u.href,profile:dir,profileRole:profileRole(dir)};
}
export const browserTools={
  chrome_status:tool('read','Check Chrome and the personal/business profile routing used by Maria. Personal is used for Google/search; business is used for WhatsApp Web and Rubika Web.',schema({}),async()=>{const exe=await chromeExe(),personal=await profileSummary(PERSONAL_PROFILE),business=await profileSummary(BUSINESS_PROFILE);return result('chrome_status',Boolean(exe),exe?'Chrome profile routing ready':'Chrome not found',{exe,personal,business});}),
  chrome_open_url:tool('low','Open a public http/https URL in Google Chrome. profile may be personal/default/Amir or business/company.',schema({url:{type:'string'},profile:{type:'string'}},['url']),async({url,profile='personal'})=>result('chrome_open_url',true,'URL opened in Chrome',await openChromeUrl(url,{profile}))),
  chrome_search:tool('low','Run a real Google results search in Chrome using Amir/personal profile by default. Opens the results page, not only Google home.',schema({query:{type:'string'},profile:{type:'string'}},['query']),async({query,profile='personal'})=>{const q=String(query||'').trim();if(!q)throw new Error('Search query is empty');const url='https://www.google.com/search?q='+encodeURIComponent(q);return result('chrome_search',true,'Google results opened in Chrome',{query:q,...await openChromeUrl(url,{profile})});}),
  chrome_search_site:tool('low','Search inside a specific named site/domain through Google in Amir Chrome profile and open the real results page.',schema({site:{type:'string'},query:{type:'string'},profile:{type:'string'}},['site','query']),async({site,query,profile='personal'})=>{const domain=siteDomain(site),q=String(query||'').trim();if(!q)throw new Error('Search query is empty');const final=domain?'site:'+domain+' '+q:String(site||'').trim()+' '+q,url='https://www.google.com/search?q='+encodeURIComponent(final);return result('chrome_search_site',true,'Site-specific Google results opened',{site,domain,query:q,...await openChromeUrl(url,{profile})});}),
  chrome_open_named_site:tool('low','Open a named public site or domain in Amir Chrome. Known names such as GitHub, Wikipedia, YouTube, OpenAI and Digikala are resolved directly.',schema({site:{type:'string'},profile:{type:'string'}},['site']),async({site,profile='personal'})=>{const domain=siteDomain(site);if(!domain){const q=String(site||'').trim();const url='https://www.google.com/search?q='+encodeURIComponent(q);return result('chrome_open_named_site',true,'Site name searched because no direct domain mapping was available',{site,...await openChromeUrl(url,{profile})});}const url='https://'+domain+'/';return result('chrome_open_named_site',true,'Site opened in Chrome',{site,domain,...await openChromeUrl(url,{profile})});}),
  chrome_open_service:tool('low','Open a supported web service in Chrome. WhatsApp and Rubika route to company profile; Google and normal web services route to Amir/personal.',schema({service:{type:'string',enum:Object.keys(SERVICES)},profile:{type:'string'}},['service']),async({service,profile=''})=>{const key=String(service).toLowerCase(),url=SERVICES[key];if(!url)return result('chrome_open_service',false,'Unsupported service');const chosen=profile||chromeProfileForService(key);return result('chrome_open_service',true,service+' opened in Chrome',{service,...await openChromeUrl(url,{profile:chosen})});})
};