import { OllamaClient } from './OllamaClient.js';
import { onlineBrainPoolFromEnv } from './OnlineBrainPool.js';

const ping=async(url,timeoutMs=2500)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{const r=await fetch(url,{method:'GET',cache:'no-store',signal:controller.signal});return r.ok||r.status===204;}catch{return false;}finally{clearTimeout(timer);}};
const inferProfile=(tools,requested='general')=>{if(requested&&requested!=='general')return requested;const names=(tools||[]).map(x=>x?.function?.name||'').join(' ');if(/project_|coding|git_|run_project|inspect_project|write_project|replace_project/i.test(names))return 'coding';if(/research|web_|wikipedia|read_web/i.test(names))return 'research';if((tools||[]).length>36)return 'complex';return 'general';};
const modelText=name=>String(name||'').toLowerCase();
const badGeneralModel=name=>/(embed|embedding|rerank|vision-only|whisper|stable-diffusion|flux|nomic)/i.test(name);
const scoreModel=(name,profile='general')=>{
  const n=modelText(name);if(!n||badGeneralModel(n))return -1000;
  let score=0;
  if(profile==='coding'){
    if(/qwen3[-.:]?coder/.test(n))score+=120;
    else if(/qwen2\.5[-.:]?coder/.test(n))score+=110;
    else if(/deepseek[-.:]?coder/.test(n))score+=100;
    else if(/coder|code/.test(n))score+=55;
  }
  if(/qwen3\.5/.test(n))score+=96;
  else if(/qwen3/.test(n))score+=92;
  else if(/qwen2\.5/.test(n))score+=82;
  else if(/llama3/.test(n))score+=76;
  else if(/gemma3/.test(n))score+=72;
  else if(/mistral/.test(n))score+=66;
  else if(/deepseek/.test(n))score+=64;
  if(/instruct|chat/.test(n))score+=18;
  if(/thinking|reasoning/.test(n)&&profile!=='coding')score-=10;
  const size=n.match(/(?:^|[:_-])(\d+(?:\.\d+)?)b(?:$|[-_:])/i);if(size){const b=Number(size[1]);if(Number.isFinite(b)){if(b>=4&&b<=14)score+=Math.min(16,b);else if(b<2)score-=18;else if(b>32)score-=12;}}
  return score;
};
export function pickBestLocalModel(models=[],profile='general'){
  return [...new Set((models||[]).map(String).filter(Boolean))].sort((a,b)=>scoreModel(b,profile)-scoreModel(a,profile)||a.localeCompare(b))[0]||null;
}
export async function internetAvailable(){const checks=await Promise.all(['https://www.msftconnecttest.com/connecttest.txt','https://www.google.com/generate_204'].map(u=>ping(u)));return checks.some(Boolean);}

export class BrainRouter{
  constructor({
    local=new OllamaClient({model:process.env.BLACK_CLOVER_MODEL||'qwen3:4b-instruct',keepAlive:'15m',numCtx:8192,temperature:.5,timeoutMs:90000,think:false,numPredict:900}),
    legacyLocal=new OllamaClient({model:process.env.BLACK_CLOVER_LEGACY_MODEL||'qwen3:4b',keepAlive:'2m',numCtx:6144,temperature:.42,timeoutMs:120000,think:false,numPredict:640}),
    codingLocal=new OllamaClient({model:process.env.BLACK_CLOVER_CODING_MODEL||'qwen2.5-coder:3b',keepAlive:'2m',numCtx:8192,temperature:.28,timeoutMs:180000,think:false,numPredict:1200}),
    online=onlineBrainPoolFromEnv(),networkTtlMs=15000
  }={}){this.local=local;this.legacyLocal=legacyLocal;this.codingLocal=codingLocal;this.online=online;this.networkTtlMs=networkTtlMs;this.lastMode='local';this.lastProfile='general';this.networkState=null;this.networkCheckedAt=0;this.lastFallbackReason='';this.lastProvider=null;this.lastModel=local.model;this.adaptiveLocal=null;}
  get model(){return this.lastModel||this.local.model;}
  async network({fresh=false}={}){const now=Date.now();if(!fresh&&this.networkState!==null&&now-this.networkCheckedAt<this.networkTtlMs)return this.networkState;this.networkState=await internetAvailable();this.networkCheckedAt=now;return this.networkState;}
  cloneLocal(base,model){return new OllamaClient({baseUrl:base?.baseUrl,model,timeoutMs:base?.timeoutMs||120000,keepAlive:base?.keepAlive||'10m',numCtx:base?.numCtx||8192,temperature:base?.temperature??.5,think:false,numPredict:base?.numPredict||900});}
  async chooseLocal(profile){
    if(profile==='coding'&&await this.codingLocal.hasModel())return this.codingLocal;
    if(await this.local.hasModel())return this.local;
    if(await this.legacyLocal.hasModel()){this.lastFallbackReason='primary-local-model-missing';return this.legacyLocal;}
    let installed=[];try{installed=await this.local.models();}catch{}
    const picked=pickBestLocalModel(installed,profile);
    if(picked){this.lastFallbackReason=`adaptive-local-model: ${picked}`;this.adaptiveLocal=this.cloneLocal(profile==='coding'?this.codingLocal:this.local,picked);return this.adaptiveLocal;}
    throw new Error(`No local Ollama chat model is installed. Install ${this.local.model} (free/local) or configure an online provider.`);
  }
  async chat(messages,tools=[],{allowOnline=true,privacyReason='',profile='general'}={}){
    profile=inferProfile(tools,profile);this.lastProfile=profile;const policy=String(process.env.BLACK_CLOVER_BRAIN_POLICY||'online-first').toLowerCase();const wantsOnline=allowOnline&&this.online?.configured&&(policy==='online-first'||profile==='coding'||profile==='research'||profile==='complex');
    if(wantsOnline){const connected=await this.network();if(connected){try{const out=await this.online.chat(messages,tools,{profile});this.lastMode='online';this.lastProvider=out.provider||this.online.provider;this.lastModel=out.model||this.online.model;this.lastFallbackReason='';return out;}catch(e){this.lastFallbackReason=`online-failed: ${e.message}`;}}else this.lastFallbackReason='internet-offline';}
    if(this.online?.configured&&!allowOnline)this.lastFallbackReason=`privacy-local${privacyReason?`: ${privacyReason}`:''}`;
    const local=await this.chooseLocal(profile),notice=this.lastFallbackReason==='internet-offline'?'[HOST NOTICE: Internet is unavailable. Briefly acknowledge this once in Maria’s natural Persian/isekaI style if relevant, then continue locally. Never claim online research succeeded.]':this.lastFallbackReason.startsWith('online-failed')?'[HOST NOTICE: Online brains failed. Continue with the local brain and mention fallback only if relevant.]':this.lastFallbackReason==='primary-local-model-missing'?'[HOST NOTICE: The preferred fast local instruct model is not installed. A compatible local fallback is active.]':this.lastFallbackReason.startsWith('adaptive-local-model:')?`[HOST NOTICE: The preferred local model is unavailable. You are running on ${this.lastFallbackReason.slice('adaptive-local-model: '.length)}. Continue normally and do not bother the user unless quality is affected.]`:'';
    this.lastMode=profile==='coding'&&local===this.codingLocal?'local-coding':local===this.legacyLocal?'local-legacy':local===this.adaptiveLocal?'local-adaptive':'local';this.lastProvider='ollama';this.lastModel=local.model;return local.chat(notice?[...messages,{role:'system',content:notice}]:messages,tools);
  }
  async health(){
    const [internet,localService,primaryModelAvailable,legacyModelAvailable,codingModelAvailable,installedModels]=await Promise.all([this.network({fresh:true}),this.local.health(),this.local.hasModel(),this.legacyLocal.hasModel(),this.codingLocal.hasModel(),this.local.models()]);
    const onlineStates=this.online?.configured&&internet?await this.online.health():{},bestAvailableLocalModel=pickBestLocalModel(installedModels,this.lastProfile);
    return {local:localService,primaryModelAvailable,legacyModelAvailable,codingLocal:localService,codingModelAvailable,bestAvailableLocalModel,installedLocalModels:installedModels,onlineConfigured:Boolean(this.online?.configured),online:onlineStates,internet,mode:this.lastMode,profile:this.lastProfile,provider:this.lastProvider||this.online?.provider||null,model:this.model,preferredModel:this.local.model,fallbackReason:this.lastFallbackReason};
  }
  async models(){return this.local.models();}
}
