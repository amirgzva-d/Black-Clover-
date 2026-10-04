import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DependencyManager } from './DependencyManager.js';
const execFileAsync=promisify(execFile);
const CHAT_MODEL=process.env.BLACK_CLOVER_MODEL||'qwen3:4b-instruct';
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function tags(){try{const r=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(4000)});if(!r.ok)return[];const j=await r.json();return (j.models||[]).map(x=>x.name);}catch{return[];}}
async function ollamaExe(){const candidates=[path.join(process.env.LOCALAPPDATA||'','Programs','Ollama','ollama.exe'),path.join(process.env.PROGRAMFILES||'','Ollama','ollama.exe')];for(const candidate of candidates)if(await exists(candidate))return candidate;try{const {stdout}=await execFileAsync('where.exe',['ollama.exe'],{windowsHide:true,timeout:5000});return stdout.trim().split(/\r?\n/)[0]||null;}catch{return null;}}
const hasModel=(models,name)=>models.some(x=>x===name||x.startsWith(`${name}:`)||name.startsWith(`${x}:`));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function pullModel(exe,model,onRetry=()=>{}){let last=null;for(let attempt=1;attempt<=3;attempt++){try{await execFileAsync(exe,['pull',model],{windowsHide:false,timeout:7200000,maxBuffer:30_000_000});return true;}catch(error){last=error;const text=[error?.stdout,error?.stderr,error?.message].filter(Boolean).join('\n');if(/lookup .* no such host|name resolution|dns/i.test(text)){try{await execFileAsync('ipconfig.exe',['/flushdns'],{windowsHide:true,timeout:15000});}catch{}}if(attempt<3){onRetry(attempt,text);await sleep(3500*attempt);}}}throw last||new Error(`Ollama could not pull ${model}`);}
export class Phase1DependencyManager extends DependencyManager{
  async status(){const base=await super.status(),models=await tags(),ready=hasModel(models,CHAT_MODEL),items=base.items.map(item=>item.id==='qwen'?{...item,name:'Qwen3 4B Instruct',installed:ready,detail:ready?'مغز محلی سریع و غیر-Thinking ماریا':`مدل گفت‌وگوی اصلی لازم است: ${CHAT_MODEL}`} : item);return {...base,items,recommendedReady:items.every(x=>x.installed||x.required===false),fullReady:items.every(x=>x.installed),primaryChatModelReady:ready,preferredChatModel:CHAT_MODEL};}
  async needsProvisioning(){return !(await this.status()).fullReady;}
  async install(id){if(id!=='qwen')return super.install(id);const exe=await ollamaExe();if(!exe)throw new Error('اول Ollama باید آماده شود');this.progress(id,`در حال نصب مغز گفت‌وگوی ${CHAT_MODEL}…`);await pullModel(exe,CHAT_MODEL,(attempt)=>this.progress(id,`اتصال دانلود مدل قطع شد؛ تلاش دوباره ${attempt+1}/3…`));this.progress(id,'مغز گفت‌وگوی سریع آماده شد',{done:true});return this.status();}
}
