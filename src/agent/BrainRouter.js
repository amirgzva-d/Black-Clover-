import { OllamaClient } from './OllamaClient.js';
import { onlineBrainFromEnv } from './OnlineBrainClient.js';

const ping=async(url,timeoutMs=3000)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{const r=await fetch(url,{method:'GET',cache:'no-store',signal:controller.signal});return r.ok||r.status===204;}catch{return false;}finally{clearTimeout(timer);}};
export async function internetAvailable(){const checks=await Promise.all(['https://www.msftconnecttest.com/connecttest.txt','https://www.google.com/generate_204'].map(u=>ping(u)));return checks.some(Boolean);}

export class BrainRouter{
  constructor({local=new OllamaClient(),online=onlineBrainFromEnv()}={}){this.local=local;this.online=online;this.lastMode='local';this.networkState=null;this.lastFallbackReason='';}
  get model(){return this.lastMode==='online'&&this.online?.model?this.online.model:this.local.model;}
  async chat(messages,tools=[]){
    if(this.online?.configured){
      const connected=await internetAvailable();this.networkState=connected;
      if(connected){try{const out=await this.online.chat(messages,tools);this.lastMode='online';this.lastFallbackReason='';return out;}catch(e){this.lastFallbackReason=e.message;}}
      else this.lastFallbackReason='internet-offline';
      const notice=this.lastFallbackReason==='internet-offline'?'[HOST NOTICE: Internet connection is unavailable. Briefly acknowledge this once in Maria’s natural Persian/isekai style (for example a short «やれやれ… باز اینترنت پرید»), then continue the user request with the local brain. Do not pretend online research succeeded.]':'[HOST NOTICE: The configured online AI brain failed, so you are continuing locally. Mention this only if relevant and never claim online data was fetched.]';
      this.lastMode='local';return this.local.chat([...messages,{role:'system',content:notice}],tools);
    }
    this.lastMode='local';return this.local.chat(messages,tools);
  }
  async health(){const internet=await internetAvailable();this.networkState=internet;return {local:await this.local.health(),onlineConfigured:Boolean(this.online?.configured),online:await this.online?.health?.()||false,internet,mode:this.lastMode,provider:this.online?.provider||null,model:this.model,fallbackReason:this.lastFallbackReason};}
  async models(){return this.local.models();}
}
