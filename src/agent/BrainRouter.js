import { OllamaClient } from './OllamaClient.js';
import { onlineBrainPoolFromEnv } from './OnlineBrainPool.js';

const ping=async(url,timeoutMs=2500)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{const r=await fetch(url,{method:'GET',cache:'no-store',signal:controller.signal});return r.ok||r.status===204;}catch{return false;}finally{clearTimeout(timer);}};
const inferProfile=(tools,requested='general')=>{if(requested&&requested!=='general')return requested;const names=(tools||[]).map(x=>x?.function?.name||'').join(' ');if(/project_|coding|git_|run_project|inspect_project|write_project|replace_project/i.test(names))return 'coding';if(/research|web_|wikipedia|read_web/i.test(names))return 'research';if((tools||[]).length>36)return 'complex';return 'general';};
export async function internetAvailable(){const checks=await Promise.all(['https://www.msftconnecttest.com/connecttest.txt','https://www.google.com/generate_204'].map(u=>ping(u)));return checks.some(Boolean);}

export class BrainRouter{
  constructor({
    local=new OllamaClient({model:process.env.BLACK_CLOVER_MODEL||'qwen3:4b-instruct',keepAlive:'15m',numCtx:4096,temperature:.5,timeoutMs:90000,think:false,numPredict:640}),
    legacyLocal=new OllamaClient({model:process.env.BLACK_CLOVER_LEGACY_MODEL||'qwen3:4b',keepAlive:'2m',numCtx:4096,temperature:.42,timeoutMs:120000,think:false,numPredict:320}),
    codingLocal=new OllamaClient({model:process.env.BLACK_CLOVER_CODING_MODEL||'qwen2.5-coder:3b',keepAlive:'2m',numCtx:8192,temperature:.28,timeoutMs:180000,think:false,numPredict:1200}),
    online=onlineBrainPoolFromEnv(),networkTtlMs=15000
  }={}){this.local=local;this.legacyLocal=legacyLocal;this.codingLocal=codingLocal;this.online=online;this.networkTtlMs=networkTtlMs;this.lastMode='local';this.lastProfile='general';this.networkState=null;this.networkCheckedAt=0;this.lastFallbackReason='';this.lastProvider=null;this.lastModel=local.model;}
  get model(){return this.lastModel||this.local.model;}
  async network({fresh=false}={}){const now=Date.now();if(!fresh&&this.networkState!==null&&now-this.networkCheckedAt<this.networkTtlMs)return this.networkState;this.networkState=await internetAvailable();this.networkCheckedAt=now;return this.networkState;}
  async chooseLocal(profile){
    if(profile==='coding'&&await this.codingLocal.hasModel())return this.codingLocal;
    if(await this.local.hasModel())return this.local;
    if(await this.legacyLocal.hasModel()){this.lastFallbackReason='primary-local-model-missing';return this.legacyLocal;}
    return this.local;
  }
  async chat(messages,tools=[],{allowOnline=true,privacyReason='',profile='general'}={}){
    profile=inferProfile(tools,profile);this.lastProfile=profile;const policy=String(process.env.BLACK_CLOVER_BRAIN_POLICY||'online-first').toLowerCase();const wantsOnline=allowOnline&&this.online?.configured&&(policy==='online-first'||profile==='coding'||profile==='research'||profile==='complex');
    if(wantsOnline){const connected=await this.network();if(connected){try{const out=await this.online.chat(messages,tools,{profile});this.lastMode='online';this.lastProvider=out.provider||this.online.provider;this.lastModel=out.model||this.online.model;this.lastFallbackReason='';return out;}catch(e){this.lastFallbackReason=`online-failed: ${e.message}`;}}else this.lastFallbackReason='internet-offline';}
    if(this.online?.configured&&!allowOnline)this.lastFallbackReason=`privacy-local${privacyReason?`: ${privacyReason}`:''}`;
    const local=await this.chooseLocal(profile),notice=this.lastFallbackReason==='internet-offline'?'[HOST NOTICE: Internet is unavailable. Briefly acknowledge this once in Maria’s natural Persian/isekaI style if relevant, then continue locally. Never claim online research succeeded.]':this.lastFallbackReason.startsWith('online-failed')?'[HOST NOTICE: Online brains failed. Continue with the local brain and mention fallback only if relevant.]':this.lastFallbackReason==='primary-local-model-missing'?'[HOST NOTICE: The preferred fast local instruct model is not installed yet. Keep the answer concise because the temporary fallback model may be slower.]':'';
    this.lastMode=profile==='coding'&&local===this.codingLocal?'local-coding':local===this.legacyLocal?'local-legacy':'local';this.lastProvider='ollama';this.lastModel=local.model;return local.chat(notice?[...messages,{role:'system',content:notice}]:messages,tools);
  }
  async health(){
    const [internet,localService,primaryModelAvailable,legacyModelAvailable,codingModelAvailable]=await Promise.all([this.network({fresh:true}),this.local.health(),this.local.hasModel(),this.legacyLocal.hasModel(),this.codingLocal.hasModel()]);
    const onlineStates=this.online?.configured&&internet?await this.online.health():{};
    return {local:localService,primaryModelAvailable,legacyModelAvailable,codingLocal:localService,codingModelAvailable,onlineConfigured:Boolean(this.online?.configured),online:onlineStates,internet,mode:this.lastMode,profile:this.lastProfile,provider:this.lastProvider||this.online?.provider||null,model:this.model,preferredModel:this.local.model,fallbackReason:this.lastFallbackReason};
  }
  async models(){return this.local.models();}
}
