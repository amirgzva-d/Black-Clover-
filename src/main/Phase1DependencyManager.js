import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DependencyManager } from './DependencyManager.js';
const execFileAsync=promisify(execFile);
const CHAT_MODEL=process.env.BLACK_CLOVER_MODEL||'qwen2.5:3b';
const NATURAL_VOICE=process.env.BLACK_CLOVER_EDGE_VOICE||'fa-IR-DilaraNeural';
async function exists(p){try{await fs.access(p);return true;}catch{return false;}}
async function tags(){try{const r=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(4000)});if(!r.ok)return[];const j=await r.json();return (j.models||[]).map(x=>x.name);}catch{return[];}}
async function where(exe){try{const {stdout}=await execFileAsync('where.exe',[exe],{windowsHide:true,timeout:5000});const p=stdout.trim().split(/\r?\n/)[0]||null;return p&&!/WindowsApps\\python\.exe$/i.test(p)?p:null;}catch{return null;}}
async function pythonExe(){return await where('py.exe')||await where('python.exe');}
async function pythonModule(exe,name){if(!exe)return false;try{await execFileAsync(exe,['-c',`import ${name}; print('ok')`],{windowsHide:true,timeout:15000,maxBuffer:1_000_000});return true;}catch{return false;}}
async function ollamaExe(){const candidates=[path.join(process.env.LOCALAPPDATA||'','Programs','Ollama','ollama.exe'),path.join(process.env.PROGRAMFILES||'','Ollama','ollama.exe')];for(const candidate of candidates)if(await exists(candidate))return candidate;return where('ollama.exe');}
const hasModel=(models,name)=>models.some(x=>x===name||x.startsWith(`${name}:`)||name.startsWith(`${x}:`));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function pullModel(exe,model,onRetry=()=>{}){let last=null;for(let attempt=1;attempt<=3;attempt++){try{await execFileAsync(exe,['pull',model],{windowsHide:false,timeout:7200000,maxBuffer:30_000_000});return true;}catch(error){last=error;const text=[error?.stdout,error?.stderr,error?.message].filter(Boolean).join('\n');if(/lookup .* no such host|name resolution|dns/i.test(text)){try{await execFileAsync('ipconfig.exe',['/flushdns'],{windowsHide:true,timeout:15000});}catch{}}if(attempt<3){onRetry(attempt,text);await sleep(3500*attempt);}}}throw last||new Error(`Ollama could not pull ${model}`);}
async function installEdgeTts(exe){let last=null;for(let attempt=1;attempt<=3;attempt++){try{await execFileAsync(exe,['-m','pip','install','--disable-pip-version-check','--timeout','90','--retries','3','--prefer-binary','--upgrade','edge-tts'],{windowsHide:false,timeout:1800000,maxBuffer:20_000_000});if(await pythonModule(exe,'edge_tts'))return true;}catch(error){last=error;}if(attempt<3)await sleep(2500*attempt);}throw last||new Error('edge-tts نصب نشد');}

export class Phase1DependencyManager extends DependencyManager{
  async status(){
    const base=await super.status(),models=await tags(),ready=hasModel(models,CHAT_MODEL),py=await pythonExe(),naturalTts=await pythonModule(py,'edge_tts');
    const items=base.items.map(item=>item.id==='qwen'?{...item,name:'Qwen2.5 3B Agent',installed:ready,detail:ready?'مغز محلی سریع و non-thinking ماریا':`مدل گفت‌وگوی اصلی لازم است: ${CHAT_MODEL}`} : item);
    items.push({id:'natural_tts',name:'Maria Natural Persian Voice',required:true,installed:naturalTts,detail:naturalTts?`صدای طبیعی زن فارسی آماده است • ${NATURAL_VOICE}`:`صدای طبیعی رایگان فارسی • ${NATURAL_VOICE} • با اینترنت، Piper در حالت آفلاین پشتیبان است`});
    return {...base,items,recommendedReady:items.every(x=>x.installed||x.required===false),fullReady:items.every(x=>x.installed),primaryChatModelReady:ready,preferredChatModel:CHAT_MODEL,naturalTtsReady:naturalTts,preferredNaturalVoice:NATURAL_VOICE};
  }
  async needsProvisioning(){return !(await this.status()).fullReady;}
  async install(id){
    if(id==='natural_tts'){
      const py=await pythonExe();if(!py)throw new Error('اول Python باید آماده شود');
      this.progress(id,`در حال آماده‌سازی صدای طبیعی ${NATURAL_VOICE}…`);
      await installEdgeTts(py);
      this.progress(id,'صدای طبیعی فارسی ماریا آماده شد',{done:true});
      return this.status();
    }
    if(id!=='qwen')return super.install(id);
    const exe=await ollamaExe();if(!exe)throw new Error('اول Ollama باید آماده شود');
    this.progress(id,`در حال نصب مغز گفت‌وگوی ${CHAT_MODEL}…`);
    await pullModel(exe,CHAT_MODEL,(attempt)=>this.progress(id,`اتصال دانلود مدل قطع شد؛ تلاش دوباره ${attempt+1}/3…`));
    this.progress(id,'مغز گفت‌وگوی سریع آماده شد',{done:true});
    return this.status();
  }
  async installAll(options={}){
    const baseResult=await super.installAll(options);
    const results=[...(baseResult?.results||[])];
    try{
      const state=await this.status();
      if(!state.naturalTtsReady){await this.install('natural_tts');results.push({id:'natural_tts',ok:true});}
      else results.push({id:'natural_tts',ok:true,skipped:true});
    }catch(error){results.push({id:'natural_tts',ok:false,error:error.message||String(error)});this.emit({type:'provision',state:'error',id:'natural_tts',message:error.message||String(error)});}
    const status=await this.status(),result={...baseResult,ok:options.includeOptional===false?status.recommendedReady:status.fullReady,results,status};
    await this.markProvisioned(result);
    return result;
  }
}
