import { OllamaClient } from './OllamaClient.js';
import { onlineBrainPoolFromEnv } from './OnlineBrainPool.js';

const ping=async(url,timeoutMs=2500)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{const r=await fetch(url,{method:'GET',cache:'no-store',signal:controller.signal});return r.ok||r.status===204;}catch{return false;}finally{clearTimeout(timer);}};
const inferProfile=(tools,requested='general')=>{if(requested&&requested!=='general')return requested;const list=tools||[],names=list.map(x=>x?.function?.name||'').join(' ');if(!list.length)return 'chat';if(/project_|coding|git_|run_project|inspect_project|write_project|replace_project/i.test(names))return 'coding';if(/research|web_|wikipedia|read_web/i.test(names))return 'research';if(list.length>36)return 'complex';return 'general';};
const modelText=name=>String(name||'').toLowerCase();
const badGeneralModel=name=>/(embed|embedding|rerank|vision-only|whisper|stable-diffusion|flux|nomic|llama|:cloud$)/i.test(name);
const isCloudModel=name=>/:cloud$/i.test(String(name||'').trim());
const errorMessage=error=>String(error?.message||error||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,240);
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
  constructor({local=new OllamaClient({model:process.env.BLACK_CLOVER_MODEL||'qwen2.5:3b',keepAlive:'30m',numCtx:4096,temperature:.32,timeoutMs:45000,think:false,numPredict:460}),chatLocal=new OllamaClient({model:process.env.BLACK_CLOVER_CHAT_MODEL||'qwen2.5:1.5b',keepAlive:'30m',numCtx:768,temperature:.30,timeoutMs:12000,think:false,numPredict:160}),legacyLocal=new OllamaClient({model:process.env.BLACK_CLOVER_MODEL||'qwen2.5:3b',keepAlive:'30m',numCtx:4096,temperature:.32,timeoutMs:45000,think:false,numPredict:460}),researchLocal=new OllamaClient({model:process.env.BLACK_CLOVER_MODEL||'qwen2.5:3b',keepAlive:'30m',numCtx:5120,temperature:.20,timeoutMs:60000,think:false,numPredict:560}),codingLocal=new OllamaClient({model:process.env.BLACK_CLOVER_MODEL||'qwen2.5-coder:3b',keepAlive:'30m',numCtx:5120,temperature:.24,timeoutMs:60000,think:false,numPredict:700}),online=onlineBrainPoolFromEnv(),chatgptPlan=null,networkTtlMs=15000}={}){
    this.local=local;this.chatLocal=chatLocal;this.legacyLocal=legacyLocal;this.researchLocal=researchLocal;this.codingLocal=codingLocal;this.online=online;this.chatgptPlan=chatgptPlan;this.networkTtlMs=networkTtlMs;this.lastMode='local';this.lastProfile='general';this.networkState=null;this.networkCheckedAt=0;this.lastFallbackReason='';this.lastProvider=null;this.lastModel=local.model;this.adaptiveLocal=null;this.selectedLocals=new Map();
  }
  get model(){return this.lastModel||this.local.model;}
  cancel(){for(const client of [this.local,this.chatLocal,this.legacyLocal,this.researchLocal,this.codingLocal,this.adaptiveLocal,...this.selectedLocals.values()])client?.cancel?.();this.online?.cancel?.();this.chatgptPlan?.cancel?.();}
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
  localCandidates(profile,preferred){
    const out=[],seen=new Set();
    const add=client=>{const key=String(client?.model||'').toLowerCase();if(client&&key&&!seen.has(key)&&!isCloudModel(client.model)){seen.add(key);out.push(client);}};
    add(preferred);
    if(profile==='coding')add(this.codingLocal);
    if(profile==='chat')add(this.chatLocal);
    if(profile==='research')add(this.researchLocal);
    add(this.local);
    add(this.legacyLocal);
    add(this.adaptiveLocal);
    return out;
  }
  async localChat(messages,tools,profile,preferred,onDelta=null){
    const errors=[];
    for(const client of this.localCandidates(profile,preferred)){
      try{
        if(typeof client.hasModel==='function'&&!(await client.hasModel()))continue;
        const out=onDelta&&typeof client.chatStream==='function'?await client.chatStream(messages,tools,onDelta):await client.chat(messages,tools);
        if(!String(out?.message?.content||'').trim()&&!out?.message?.tool_calls?.length)throw new Error('Model returned no final answer');
        this.lastMode=profile==='coding'?'local-coding':profile==='chat'?'local-chat':client===this.legacyLocal?'local-legacy':client===this.adaptiveLocal?'local-adaptive':'local';
        this.lastProvider='ollama';
        this.lastModel=client.model;
        return out;
      }catch(error){
        if(/Request cancelled/i.test(errorMessage(error)))throw error;
        const message=errorMessage(error);errors.push(String(client.model||'ollama')+': '+message);
        // Normal chat has a strict latency budget. If the fast chat model times out,
        // do not spend another 45-60 seconds retrying a larger local model.
        if(profile==='chat'&&/timed out/i.test(message))break;
      }
    }
    if(errors.length)throw new Error('Local brain unavailable: '+errors.join(' | '));
    throw new Error('No local Ollama chat model is installed. Install a local chat model or choose another provider.');
  }
  async catalog(){
    const installed=await this.local.models(),descriptions={openai:'مدل‌های ابری قدرتمند OpenAI برای کار عمومی و کدنویسی',anthropic:'Claude برای تحلیل عمیق، متن طولانی و Coding',deepseek:'DeepSeek برای تحلیل و کدنویسی',qwen:'Qwen Cloud برای فارسی، ابزارها و کار عمومی',gemini:'Gemini برای متن و کار چندرسانه‌ای',groq:'Groq برای پاسخ بسیار سریع',openrouter:'دسترسی به مجموعه مدل‌های Cloud',mistral:'مدل‌های سریع Mistral Cloud'},online=(this.online?.catalog?.()||[]).map(x=>({id:`online:${x.provider}`,provider:x.provider,model:x.model||'auto',label:`${x.label||x.provider}${x.model?` • ${x.model}`:''}`,description:descriptions[x.provider]||'مدل Cloud',available:Boolean(x.configured),configured:Boolean(x.configured)}));
    let chatgpt=[];try{chatgpt=this.chatgptPlan?await this.chatgptPlan.catalog():[];}catch{}
    return [{id:'auto',provider:'auto',model:'auto',label:'Auto • Maria',description:'Maria بر اساس نوع کار سریع‌ترین و مناسب‌ترین مغز آماده را انتخاب می‌کند.',available:true,configured:true},...chatgpt,...installed.map(model=>{const cloud=/:cloud$/i.test(model);return {id:cloud?`ollama-cloud:${model}`:`ollama:${model}`,provider:cloud?'ollama-cloud':'ollama',model,label:`${cloud?'Ollama Cloud':'Ollama'} • ${model}`,description:cloud?'مدل Cloud از مسیر Ollama؛ داده برای پاسخ به سرویس آنلاین فرستاده می‌شود.':'مدل محلی؛ داده روی همین سیستم می‌ماند.',available:true,configured:true};}),...online];
  }
  async chat(messages,tools=[],{allowOnline=true,privacyReason='',profile='general',provider='auto',model='auto',modelOverride='auto',onDelta=null}={}){
    this.lastFallbackReason='';
    profile=inferProfile(tools,profile);
    this.lastProfile=profile;
    if(modelOverride&&modelOverride!=='auto'){
      const selected=String(modelOverride);
      if(selected.startsWith('ollama-cloud:')){provider='ollama-cloud';model=selected.slice(13);}
      else if(selected.startsWith('ollama:')){provider='ollama';model=selected.slice(7);}
      else if(selected.startsWith('online:')){provider=selected.slice(7);model='auto';}
      else if(selected.startsWith('chatgpt:')){provider='chatgpt';model=selected.slice(8);}
    }
    provider=String(provider||'auto').toLowerCase();
    model=String(model||'auto');
    const forceLocal=provider==='ollama'||provider==='local';
    const forceOllamaCloud=provider==='ollama-cloud';
    const forceChatGPT=provider==='chatgpt';
    const forceOnline=!['auto','ollama','local','ollama-cloud','chatgpt'].includes(provider);
    const policy=String(process.env.BLACK_CLOVER_BRAIN_POLICY||'smart').toLowerCase();

    if(forceChatGPT){
      if(!allowOnline)this.lastFallbackReason='chatgpt-blocked-private';
      else if(!await this.network())this.lastFallbackReason='chatgpt-offline';
      else if(!this.chatgptPlan||!await this.chatgptPlan.available())this.lastFallbackReason='chatgpt-not-connected';
      else try{const out=await this.chatgptPlan.chat(messages,{model,tools,onDelta:tools?.length?null:onDelta});this.lastMode='chatgpt-plan';this.lastProvider='chatgpt';this.lastModel=out.model;this.lastFallbackReason='';return out;}catch(error){if(/cancel/i.test(errorMessage(error)))throw error;this.lastFallbackReason='chatgpt-failed: '+errorMessage(error);}
    }

    if(forceChatGPT&&this.lastFallbackReason)throw new Error('مدل ChatGPT انتخاب شده آماده نیست: '+this.lastFallbackReason);

    if(forceOllamaCloud){
      if(!allowOnline)this.lastFallbackReason='ollama-cloud-blocked-private';
      else if(!await this.network())this.lastFallbackReason='ollama-cloud-offline';
      else{
        try{
          const cloud=await this.chooseLocal(profile,model);
          if(!isCloudModel(cloud.model))throw new Error('Selected Ollama Cloud model is not installed');
          const out=onDelta&&typeof cloud.chatStream==='function'?await cloud.chatStream(messages,tools,onDelta):await cloud.chat(messages,tools);
          this.lastMode='ollama-cloud';
          this.lastProvider='ollama-cloud';
          this.lastModel=cloud.model;
          this.lastFallbackReason='';
          return out;
        }catch(error){
          if(/Request cancelled/i.test(errorMessage(error)))throw error;this.lastFallbackReason='ollama-cloud-failed: '+errorMessage(error);
        }
      }
    }

    if(forceOnline){
      if(!allowOnline)this.lastFallbackReason='cloud-blocked-private';
      else if(!await this.network())this.lastFallbackReason='internet-offline';
      else{
        try{
          if(!this.online?.configured)throw new Error(provider+' is not configured');
          const out=onDelta&&typeof this.online.chatStream==='function'?await this.online.chatStream(messages,tools,{profile,provider,model},onDelta):await this.online.chat(messages,tools,{profile,provider,model});
          this.lastMode='online';
          this.lastProvider=out.provider;
          this.lastModel=out.model;
          this.lastFallbackReason='';
          return out;
        }catch(error){
          if(/Request cancelled/i.test(errorMessage(error)))throw error;this.lastFallbackReason='online-failed: '+errorMessage(error);
        }
      }
    }

    const preferChatGPT=!forceLocal&&!forceOllamaCloud&&!forceOnline&&!forceChatGPT&&allowOnline&&policy!=='local-first'&&this.chatgptPlan;
    if(preferChatGPT&&await this.network()&&await this.chatgptPlan.available().catch(()=>false)){
      try{const out=await this.chatgptPlan.chat(messages,{model:'auto',tools,onDelta:tools?.length?null:onDelta});this.lastMode='chatgpt-plan';this.lastProvider='chatgpt';this.lastModel=out.model;this.lastFallbackReason='';return out;}catch(error){if(/cancel/i.test(errorMessage(error)))throw error;this.lastFallbackReason='chatgpt-failed: '+errorMessage(error);}
    }
    const wantsOnline=!forceLocal&&!forceOllamaCloud&&(!forceChatGPT||Boolean(tools?.length))&&allowOnline&&this.online?.configured&&policy!=='local-first';
    if(wantsOnline){
      if(await this.network()){
        try{
          const out=onDelta&&typeof this.online.chatStream==='function'?await this.online.chatStream(messages,tools,{profile,provider:'auto',model:'auto'},onDelta):await this.online.chat(messages,tools,{profile,provider:'auto',model:'auto'});
          this.lastMode='online';
          this.lastProvider=out.provider;
          this.lastModel=out.model;
          this.lastFallbackReason='';
          return out;
        }catch(error){
          if(/Request cancelled/i.test(errorMessage(error)))throw error;this.lastFallbackReason='online-failed: '+errorMessage(error);
        }
      }else{
        this.lastFallbackReason='internet-offline';
      }
    }
    if(this.online?.configured&&!allowOnline)this.lastFallbackReason='privacy-local'+(privacyReason?': '+privacyReason:'');

    let preferred;
    try{
      preferred=await this.chooseLocal(profile,forceLocal?model:'auto');
    }catch(error){
      if(!this.lastFallbackReason)this.lastFallbackReason='local-selection-failed: '+errorMessage(error);
      preferred=await this.chooseLocal(profile,'auto');
    }
    const notice=this.lastFallbackReason==='internet-offline'
      ?'[HOST NOTICE: Internet is unavailable. Continue locally and never claim online research succeeded.]'
      :this.lastFallbackReason.startsWith('online-failed')
        ?'[HOST NOTICE: Online brains failed. Continue with the local brain.]'
        :this.lastFallbackReason.startsWith('ollama-cloud-')
          ?'[HOST NOTICE: Ollama Cloud is unavailable or unauthorized. Continue with a local model.]'
          :this.lastFallbackReason==='primary-local-model-missing'
            ?'[HOST NOTICE: The preferred local model is unavailable; use this compatible fallback.]'
            :this.lastFallbackReason.startsWith('adaptive-local-model:')
              ?'[HOST NOTICE: Preferred local model unavailable. Continue with the available local model.]'
              :'';
    return this.localChat(notice?[...messages,{role:'system',content:notice}]:messages,tools,profile,preferred,onDelta);
  }

  async chatStream(messages,tools=[],options={},onDelta=()=>{}){
    return this.chat(messages,tools,{...options,onDelta:tools?.length?null:onDelta});
  }
  async health(){
    const [internet,localService,primaryModelAvailable,legacyModelAvailable,codingModelAvailable,installedModels]=await Promise.all([this.network({fresh:true}),this.local.health(),this.local.hasModel(),this.legacyLocal.hasModel(),this.codingLocal.hasModel(),this.local.models()]);
    const onlineStates=this.online?.configured&&internet?await this.online.health():{},bestAvailableLocalModel=pickBestLocalModel(installedModels,this.lastProfile);
    return {local:localService,primaryModelAvailable,legacyModelAvailable,codingLocal:localService,codingModelAvailable,bestAvailableLocalModel,installedLocalModels:installedModels,providers:this.online?.catalog?.()||[],onlineConfigured:Boolean(this.online?.configured),online:onlineStates,internet,mode:this.lastMode,profile:this.lastProfile,provider:this.lastProvider||this.online?.provider||'ollama',model:this.model,preferredModel:this.local.model,fallbackReason:this.lastFallbackReason};
  }
  async models(){return this.local.models();}
}
