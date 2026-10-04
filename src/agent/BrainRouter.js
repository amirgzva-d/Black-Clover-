import { OllamaClient } from './OllamaClient.js';
import { onlineBrainFromEnv } from './OnlineBrainClient.js';

const ping=async(url,timeoutMs=2500)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{const r=await fetch(url,{method:'GET',cache:'no-store',signal:controller.signal});return r.ok||r.status===204;}catch{return false;}finally{clearTimeout(timer);}};
export async function internetAvailable(){const checks=await Promise.all(['https://www.msftconnecttest.com/connecttest.txt','https://www.google.com/generate_204'].map(u=>ping(u)));return checks.some(Boolean);}
const inferredProfile=(tools,requested)=>{if(requested&&requested!=='general')return requested;const names=(tools||[]).map(x=>x?.function?.name||'');if(names.some(x=>/^(project_|git_|node_check|inspect_project|run_project_task|list_project_scripts)/.test(x)))return 'coding';if(names.some(x=>/(repair_windows|repair_system|recent_system_errors|problem_devices|scan_windows_image|research_topic)/.test(x)))return 'reasoning';return 'general';};

export class BrainRouter{
  constructor({local=new OllamaClient(),coder=new OllamaClient({model:process.env.BLACK_CLOVER_CODER_MODEL||'qwen2.5-coder:7b',timeoutMs:240000}),reasoner=new OllamaClient({model:process.env.BLACK_CLOVER_REASONING_MODEL||'deepseek-r1:7b',timeoutMs:240000}),online=onlineBrainFromEnv(),networkTtlMs=15000}={}){this.local=local;this.coder=coder;this.reasoner=reasoner;this.online=online;this.networkTtlMs=networkTtlMs;this.lastMode='local';this.lastProfile='general';this.lastModel=local.model;this.networkState=null;this.networkCheckedAt=0;this.lastFallbackReason='';}
  get model(){return this.lastModel||this.local.model;}
  localFor(profile='general'){if(profile==='coding')return this.coder;if(profile==='reasoning')return this.reasoner;return this.local;}
  async network({fresh=false}={}){const now=Date.now();if(!fresh&&this.networkState!==null&&now-this.networkCheckedAt<this.networkTtlMs)return this.networkState;this.networkState=await internetAvailable();this.networkCheckedAt=now;return this.networkState;}
  async localChat(messages,tools,profile){const preferred=this.localFor(profile);try{const out=await preferred.chat(messages,tools);this.lastModel=preferred.model;return out;}catch(e){if(preferred===this.local)throw e;this.lastFallbackReason=`specialist-local-failed: ${preferred.model}: ${e.message}`;const out=await this.local.chat(messages,tools);this.lastModel=this.local.model;return out;}}
  async chat(messages,tools=[],{allowOnline=true,privacyReason='',profile='general'}={}){
    profile=inferredProfile(tools,profile);this.lastProfile=profile;
    if(this.online?.configured&&allowOnline){
      const connected=await this.network();
      if(connected){try{const out=await this.online.chat(messages,tools,{profile});this.lastMode='online';this.lastModel=this.online.model||out?.model||this.local.model;this.lastFallbackReason='';return out;}catch(e){this.lastFallbackReason=`online-failed: ${e.message}`;}}
      else this.lastFallbackReason='internet-offline';
      const notice=this.lastFallbackReason==='internet-offline'?'[HOST NOTICE: Internet is unavailable. Briefly acknowledge this once in Maria’s natural Persian/isekaI style, then continue locally. Never claim online research succeeded.]':'[HOST NOTICE: The configured online brain failed. Continue with the local brain and mention the fallback only if relevant.]';
      this.lastMode='local';return this.localChat([...messages,{role:'system',content:notice}],tools,profile);
    }
    if(this.online?.configured&&!allowOnline)this.lastFallbackReason=`privacy-local${privacyReason?`: ${privacyReason}`:''}`;
    this.lastMode='local';return this.localChat(messages,tools,profile);
  }
  async health(){const internet=await this.network({fresh:true}),models=await this.local.models();return {local:await this.local.health(),onlineConfigured:Boolean(this.online?.configured),online:this.online?.configured&&internet?await this.online.health():false,internet,mode:this.lastMode,profile:this.lastProfile,provider:this.online?.provider||null,model:this.model,installedModels:models,specialists:{general:this.local.model,coding:this.coder.model,reasoning:this.reasoner.model,coderInstalled:models.includes(this.coder.model),reasonerInstalled:models.includes(this.reasoner.model)},fallbackReason:this.lastFallbackReason};}
  async models(){return this.local.models();}
}
