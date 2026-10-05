import { OllamaClient } from './OllamaClient.js';
import { onlineBrainPoolFromEnv } from './OnlineBrainPool.js';

const ping=async(url,timeoutMs=2500)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{const r=await fetch(url,{method:'GET',cache:'no-store',signal:controller.signal});return r.ok||r.status===204;}catch{return false;}finally{clearTimeout(timer);}};
const inferProfile=(tools,requested='general')=>{if(requested&&requested!=='general')return requested;const list=tools||[],names=list.map(x=>x?.function?.name||'').join(' ');if(!list.length)return 'chat';if(/project_|coding|git_|run_project|inspect_project|write_project|replace_project/i.test(names))return 'coding';if(/research|web_|wikipedia|read_web/i.test(names))return 'research';if(list.length>36)return 'complex';return 'general';};
const modelText=name=>String(name||'').toLowerCase();
const badGeneralModel=name=>/(embed|embedding|rerank|vision-only|whisper|stable-diffusion|flux|nomic)/i.test(name);
const scoreModel=(name,profile='general')=>{
  const n=modelText(name);if(!n||badGeneralModel(n))return -1000;let score=0;
  if(profile==='coding'){if(/qwen3[-.:]?coder/.test(n))score+=120;else if(/qwen2\.5[-.:]?coder/.test(n))score+=110;else if(/deepseek[-.:]?coder/.test(n))score+=100;else if(/coder|code/.test(n))score+=55;}
  if(/qwen2\.5/.test(n))score+=98;else if(/llama3/.test(n))score+=76;else if(/gemma4/.test(n))score+=75;else if(/gemma3/.test(n))score+=74;else if(/qwen3\.5/.test(n))score+=72;else if(/qwen3/.test(n))score+=68;else if(/mistral/.test(n))score+=66;else if(/deepseek/.test(n))score+=64;
  if(/instruct|chat/.test(n))score+=18;if(/thinking|reasoning/.test(n)&&profile!=='coding')score-=20;
  const size=n.match(/(?:^|[:_-])(\d+(?:\.\d+)?)b(?:$|[-_:])/i);if(size){const b=Number(size[1]);if(Number.isFinite(b)){if(b>=2&&b<=14)score+=Math.min(12,b);else if(b<1.5)score-=18;else if(b>32)score-=12;}}
  return score;
};
export function pickBestLocalModel(models=[],profile='general'){return [...new Set((models||[]).map(String).filter(Boolean))].map(name=>({name,score:scoreModel(name,profile)})).filter(x=>x.score>-500).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name))[0]?.name||null;}
export async function internetAvailable(){const checks=await Promise.all(['https://www.msftconnecttest.com/connecttest.txt','https://www.google.com/generate_204'].map(u=>ping(u)));return checks.some(Boolean);}

export class BrainRouter{
  constructor({local=new OllamaClient({model:process.env.BLACK_CLOVER_MODEL||'qwen2.5:3b',keepAlive:'15m',numCtx:4096,temperature:.38,timeoutMs:90000,think:false,numPredict:700}),chatLocal=new OllamaClient({model:process.env.BLACK_CLOVER_CHAT_MODEL||process.env.BLACK_CLOVER_MODEL||'qwen2.5:3b',keepAlive:'15m',numCtx:3072,temperature:.42,timeoutMs:60000,think:false,numPredict:280}),legacyLocal=new OllamaClient({model:process.env.BLACK_CLOVER_LEGACY_MODEL||'qwen2.5:1.5b',keepAlive:'2m',numCtx:4096,temperature:.35,timeoutMs:60000,think:false,numPredict:480}),researchLocal=new OllamaClient({model:process.env.BLACK_CLOVER_RESEARCH_MODEL||'qwen2.5:1.5b',keepAlive:'8m',numCtx:3072,temperature:.22,timeoutMs:45000,think:false,numPredict:320}),codingLocal=new OllamaClient({model:process.env.BLACK_CLOVER_CODING_MODEL||'qwen2.5-coder:3b',keepAlive:'10m',numCtx:8192,temperature:.28,timeoutMs:180000,think:false,numPredict:1400}),online=onlineBrainPoolFromEnv(),networkTtlMs=15000}={}){
    this.local=local;this.chatLocal=chatLocal;this.legacyLocal=legacyLocal;this.researchLocal=researchLocal;this.codingLocal=codingLocal;this.online=online;this.networkTtlMs=networkTtlMs;this.lastMode='local';this.lastProfile='general';this.networkState=null;this.networkCheckedAt=0;this.lastFallbackReason='';this.lastProvider=null;this.lastModel=local.model;this.adaptiveLocal=null;this.selectedLocals=new Map();
  }
  get model(){return this.lastModel||this.local.model;}
  async network({fresh=false}={}){const now=Date.now();if(!fresh&&this.networkState!==null&&now-this.networkCheckedAt<this.networkTtlMs)return this.networkState;this.networkState=await internetAvailable();this.networkCheckedAt=now;return this.networkState;}
  cloneLocal(base,model){return new OllamaClient({baseUrl:base?.baseUrl,model,timeoutMs:base?.timeoutMs||120000,keepAlive:base?.keepAlive||'10m',numCtx:base?.numCtx||4096,temperature:base?.temperature??.4,think:false,numPredict:base?.numPredict||700});}
  async chooseLocal(profile,requestedModel='auto'){
    if(requestedModel&&requestedModel!=='auto'){
      const key=`${profile}:${requestedModel}`;if(this.selectedLocals.has(key))return this.selectedLocals.get(key);
      const installed=await this.local.models();if(!installed.some(x=>x===requestedModel||x.startsWith(`${requestedModel}:`)||requestedModel.startsWith(`${x}:`)))throw new Error(`Ollama model is not installed: ${requestedModel}`);
      const base=profile==='coding'?this.codingLocal:profile==='chat'?this.chatLocal:profile==='research'?this.researchLocal:this.local,client=this.cloneLocal(base,requestedModel);this.selectedLocals.set(key,client);return client;
    }
    if(profile==='coding'&&await this.codingLocal.hasModel())return this.codingLocal;
    if(profile==='research'&&await this.researchLocal.hasModel())return this.researchLocal;
    if(profile==='chat'&&await this.chatLocal.hasModel())return this.chatLocal;
    if(await this.local.hasModel())return this.local;
    if(await this.legacyLocal.hasModel()){this.lastFallbackReason='primary-local-model-missing';return this.legacyLocal;}
    let installed=[];try{installed=await this.local.models();}catch{}const picked=pickBestLocalModel(installed,profile);
    if(picked){this.lastFallbackReason=`adaptive-local-model: ${picked}`;this.adaptiveLocal=this.cloneLocal(profile==='coding'?this.codingLocal:profile==='research'?this.researchLocal:this.local,picked);return this.adaptiveLocal;}
    throw new Error(`No local Ollama chat model is installed. Install ${this.local.model} or choose another provider.`);
  }
  async catalog(){const installed=await this.local.models(),online=(this.online?.catalog?.()||[]).filter(x=>x.configured).map(x=>({id:`online:${x.provider}`,provider:x.provider,model:x.model||'auto',label:`${x.label||x.provider}${x.model?` • ${x.model}`:''}`,available:true}));return [{id:'auto',provider:'auto',model:'auto',label:'Auto • Maria',available:true},...installed.map(model=>({id:`ollama:${model}`,provider:'ollama',model,label:`Ollama • ${model}`,available:true})),...online];}
  async chat(messages,tools=[],{allowOnline=true,privacyReason='',profile='general',provider='auto',model='auto',modelOverride='auto'}={}){
    profile=inferProfile(tools,profile);this.lastProfile=profile;
    if(modelOverride&&modelOverride!=='auto'){const selected=String(modelOverride);if(selected.startsWith('ollama:')){provider='ollama';model=selected.slice(7);}else if(selected.startsWith('online:')){provider=selected.slice(7);model='auto';}}
    provider=String(provider||'auto').toLowerCase();model=String(model||'auto');
    const forceLocal=provider==='ollama'||provider==='local',forceOnline=!['auto','ollama','local'].includes(provider),policy=String(process.env.BLACK_CLOVER_BRAIN_POLICY||'online-first').toLowerCase();
    if(forceOnline){if(!allowOnline)throw new Error('This project contains private/local context, so cloud model use is blocked for this turn.');if(!await this.network())throw new Error('Internet is unavailable for the selected cloud provider.');const out=await this.online.chat(messages,tools,{profile,provider,model});this.lastMode='online';this.lastProvider=out.provider;this.lastModel=out.model;this.lastFallbackReason='';return out;}
    const wantsOnline=!forceLocal&&allowOnline&&this.online?.configured&&(policy==='online-first'||profile==='coding'||profile==='research'||profile==='complex');
    if(wantsOnline){const connected=await this.network();if(connected){try{const out=await this.online.chat(messages,tools,{profile,provider:'auto',model:'auto'});this.lastMode='online';this.lastProvider=out.provider;this.lastModel=out.model;this.lastFallbackReason='';return out;}catch(e){this.lastFallbackReason=`online-failed: ${e.message}`;}}else this.lastFallbackReason='internet-offline';}
    if(this.online?.configured&&!allowOnline)this.lastFallbackReason=`privacy-local${privacyReason?`: ${privacyReason}`:''}`;
    const local=await this.chooseLocal(profile,forceLocal?model:'auto'),notice=this.lastFallbackReason==='internet-offline'?'[HOST NOTICE: Internet is unavailable. Continue locally and never claim online research succeeded.]':this.lastFallbackReason.startsWith('online-failed')?'[HOST NOTICE: Online brains failed. Continue with the local brain.]':this.lastFallbackReason==='primary-local-model-missing'?'[HOST NOTICE: The preferred local model is unavailable; use this compatible fallback.]':this.lastFallbackReason.startsWith('adaptive-local-model:')?`[HOST NOTICE: Preferred local model unavailable. Running on ${this.lastFallbackReason.slice('adaptive-local-model: '.length)}.]`:'';
    this.lastMode=profile==='coding'?'local-coding':profile==='chat'?'local-chat':local===this.legacyLocal?'local-legacy':local===this.adaptiveLocal?'local-adaptive':forceLocal&&model!=='auto'?'local-selected':'local';this.lastProvider='ollama';this.lastModel=local.model;return local.chat(notice?[...messages,{role:'system',content:notice}]:messages,tools);
  }
  async health(){
    const [internet,localService,primaryModelAvailable,legacyModelAvailable,codingModelAvailable,installedModels]=await Promise.all([this.network({fresh:true}),this.local.health(),this.local.hasModel(),this.legacyLocal.hasModel(),this.codingLocal.hasModel(),this.local.models()]);
    const onlineStates=this.online?.configured&&internet?await this.online.health():{},bestAvailableLocalModel=pickBestLocalModel(installedModels,this.lastProfile);
    return {local:localService,primaryModelAvailable,legacyModelAvailable,codingLocal:localService,codingModelAvailable,bestAvailableLocalModel,installedLocalModels:installedModels,providers:this.online?.catalog?.()||[],onlineConfigured:Boolean(this.online?.configured),online:onlineStates,internet,mode:this.lastMode,profile:this.lastProfile,provider:this.lastProvider||this.online?.provider||'ollama',model:this.model,preferredModel:this.local.model,fallbackReason:this.lastFallbackReason};
  }
  async models(){return this.local.models();}
}
