import { OllamaClient } from './OllamaClient.js';
import { onlineBrainPoolFromEnv } from './OnlineBrainPool.js';

const ping=async(url,timeoutMs=2500)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{const r=await fetch(url,{method:'GET',cache:'no-store',signal:controller.signal});return r.ok||r.status===204;}catch{return false;}finally{clearTimeout(timer);}};
export async function internetAvailable(){const checks=await Promise.all(['https://www.msftconnecttest.com/connecttest.txt','https://www.google.com/generate_204'].map(u=>ping(u)));return checks.some(Boolean);}

export class BrainRouter{
  constructor({local=new OllamaClient(),codingLocal=new OllamaClient({model:process.env.BLACK_CLOVER_CODING_MODEL||'qwen2.5-coder:3b',keepAlive:'2m',numCtx:8192,temperature:.28,timeoutMs:180000}),online=onlineBrainPoolFromEnv(),networkTtlMs=15000}={}){this.local=local;this.codingLocal=codingLocal;this.online=online;this.networkTtlMs=networkTtlMs;this.lastMode='local';this.lastProfile='general';this.networkState=null;this.networkCheckedAt=0;this.lastFallbackReason='';this.lastProvider=null;this.lastModel=local.model;}
  get model(){return this.lastModel||this.local.model;}
  async network({fresh=false}={}){const now=Date.now();if(!fresh&&this.networkState!==null&&now-this.networkCheckedAt<this.networkTtlMs)return this.networkState;this.networkState=await internetAvailable();this.networkCheckedAt=now;return this.networkState;}
  async chooseLocal(profile){if(profile==='coding'&&await this.codingLocal.hasModel())return this.codingLocal;return this.local;}
  async chat(messages,tools=[],{allowOnline=true,privacyReason='',profile='general'}={}){
    this.lastProfile=profile;const policy=String(process.env.BLACK_CLOVER_BRAIN_POLICY||'hybrid').toLowerCase();const wantsOnline=allowOnline&&this.online?.configured&&(policy==='online-first'||profile==='coding'||profile==='research'||profile==='complex');
    if(wantsOnline){const connected=await this.network();if(connected){try{const out=await this.online.chat(messages,tools,{profile});this.lastMode='online';this.lastProvider=out.provider||this.online.provider;this.lastModel=out.model||this.online.model;this.lastFallbackReason='';return out;}catch(e){this.lastFallbackReason=`online-failed: ${e.message}`;}}else this.lastFallbackReason='internet-offline';}
    if(this.online?.configured&&!allowOnline)this.lastFallbackReason=`privacy-local${privacyReason?`: ${privacyReason}`:''}`;
    const local=await this.chooseLocal(profile),notice=this.lastFallbackReason==='internet-offline'?'[HOST NOTICE: Internet is unavailable. Briefly acknowledge this once in Maria’s natural Persian/isekaI style if relevant, then continue locally. Never claim online research succeeded.]':this.lastFallbackReason.startsWith('online-failed')?'[HOST NOTICE: Online brains failed. Continue with the local brain and mention fallback only if relevant.]':'';
    this.lastMode=profile==='coding'&&local===this.codingLocal?'local-coding':'local';this.lastProvider='ollama';this.lastModel=local.model;return local.chat(notice?[...messages,{role:'system',content:notice}]:messages,tools);
  }
  async health(){const internet=await this.network({fresh:true}),onlineStates=this.online?.configured&&internet?await this.online.health():{};return {local:await this.local.health(),codingLocal:await this.codingLocal.health(),codingModelAvailable:await this.codingLocal.hasModel(),onlineConfigured:Boolean(this.online?.configured),online:onlineStates,internet,mode:this.lastMode,profile:this.lastProfile,provider:this.lastProvider||this.online?.provider||null,model:this.model,fallbackReason:this.lastFallbackReason};}
  async models(){return this.local.models();}
}
