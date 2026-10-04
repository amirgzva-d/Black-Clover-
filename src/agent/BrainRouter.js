import { OllamaClient } from './OllamaClient.js';
import { onlineBrainFromEnv } from './OnlineBrainClient.js';

const ping=async(url,timeoutMs=2500)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{const r=await fetch(url,{method:'GET',cache:'no-store',signal:controller.signal});return r.ok||r.status===204;}catch{return false;}finally{clearTimeout(timer);}};
export async function internetAvailable(){const checks=await Promise.all(['https://www.msftconnecttest.com/connecttest.txt','https://www.google.com/generate_204'].map(u=>ping(u)));return checks.some(Boolean);}

export class BrainRouter{
  constructor({local=new OllamaClient(),online=onlineBrainFromEnv(),networkTtlMs=15000}={}){this.local=local;this.online=online;this.networkTtlMs=networkTtlMs;this.lastMode='local';this.networkState=null;this.networkCheckedAt=0;this.lastFallbackReason='';}
  get model(){return this.lastMode==='online'&&this.online?.model?this.online.model:this.local.model;}
  async network({fresh=false}={}){const now=Date.now();if(!fresh&&this.networkState!==null&&now-this.networkCheckedAt<this.networkTtlMs)return this.networkState;this.networkState=await internetAvailable();this.networkCheckedAt=now;return this.networkState;}
  async chat(messages,tools=[],{allowOnline=true,privacyReason=''}={}){
    if(this.online?.configured&&allowOnline){
      const connected=await this.network();
      if(connected){try{const out=await this.online.chat(messages,tools);this.lastMode='online';this.lastFallbackReason='';return out;}catch(e){this.lastFallbackReason=`online-failed: ${e.message}`;}}
      else this.lastFallbackReason='internet-offline';
      const notice=this.lastFallbackReason==='internet-offline'?'[HOST NOTICE: Internet is unavailable. Briefly acknowledge this once in Maria’s natural Persian/isekaI style, then continue locally. Never claim online research succeeded.]':'[HOST NOTICE: The configured online brain failed. Continue with the local brain and mention the fallback only if relevant.]';
      this.lastMode='local';return this.local.chat([...messages,{role:'system',content:notice}],tools);
    }
    if(this.online?.configured&&!allowOnline)this.lastFallbackReason=`privacy-local${privacyReason?`: ${privacyReason}`:''}`;
    this.lastMode='local';return this.local.chat(messages,tools);
  }
  async health(){const internet=await this.network({fresh:true});return {local:await this.local.health(),onlineConfigured:Boolean(this.online?.configured),online:this.online?.configured&&internet?await this.online.health():false,internet,mode:this.lastMode,provider:this.online?.provider||null,model:this.model,fallbackReason:this.lastFallbackReason};}
  async models(){return this.local.models();}
}
