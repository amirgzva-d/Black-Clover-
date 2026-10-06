import { OnlineBrainClient } from './OnlineBrainClient.js';

const timeoutFetch=async(url,options={},timeoutMs=90000)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);try{return await fetch(url,{...options,signal:c.signal});}finally{clearTimeout(t);}};
export const BRAIN_PROVIDER_PRESETS=Object.freeze({
  github:{label:'GitHub Models • Free Tier',baseUrl:'https://models.github.ai/inference',model:'openai/gpt-4o-mini',note:'GitHub Models؛ سهمیه رایگان محدود برای حساب GitHub'},
  openai:{label:'OpenAI / ChatGPT',baseUrl:'https://api.openai.com/v1',model:'gpt-4o-mini',note:'API پولی؛ مدل سریع و کم‌هزینه'},
  anthropic:{label:'Claude',baseUrl:'https://api.anthropic.com',model:'claude-sonnet-4-6',note:'API Anthropic'},
  deepseek:{label:'DeepSeek',baseUrl:'https://api.deepseek.com',model:'deepseek-chat',note:'تحلیل و کدنویسی'},
  qwen:{label:'Qwen Cloud',baseUrl:'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',model:'qwen3.7-flash',note:'سهمیه رایگان اولیه ممکن است در دسترس باشد'},
  gemini:{label:'Gemini',baseUrl:'https://generativelanguage.googleapis.com/v1beta/openai',model:'gemini-2.5-flash',note:'Free Tier محدود برای بعضی حساب‌ها/مدل‌ها'},
  openrouter:{label:'OpenRouter Free',baseUrl:'https://openrouter.ai/api/v1',model:'openrouter/free',note:'Router مدل‌های رایگان؛ محدودیت نرخ دارد'},
  groq:{label:'Groq',baseUrl:'https://api.groq.com/openai/v1',model:'llama-3.3-70b-versatile',note:'پاسخ سریع؛ نیاز به API key'},
  mistral:{label:'Mistral',baseUrl:'https://api.mistral.ai/v1',model:'mistral-small-latest',note:'Mistral Cloud'}
});
let RUNTIME_PROVIDER_CONFIG={};
export function setRuntimeProviderConfig(config={}){RUNTIME_PROVIDER_CONFIG=config&&typeof config==='object'?config:{};}

class AnthropicBrainClient{
  constructor({apiKey,baseUrl='https://api.anthropic.com',model='claude-sonnet-4-6'}={}){this.provider='anthropic';this.apiKey=apiKey;this.baseUrl=String(baseUrl).replace(/\/$/,'');this.model=model;}
  get configured(){return Boolean(this.apiKey&&this.baseUrl&&this.model);}
  withModel(model){return new AnthropicBrainClient({apiKey:this.apiKey,baseUrl:this.baseUrl,model:model||this.model});}
  async chat(messages,tools=[]){
    if(!this.configured)throw new Error('Anthropic is not configured');let system='';const msgs=[];
    for(const m of messages){
      if(m.role==='system'){system+=(system?'\n\n':'')+String(m.content||'');continue;}
      if(m.role==='tool'){msgs.push({role:'user',content:[{type:'tool_result',tool_use_id:m.tool_call_id||m.tool_name,content:String(m.content||'')} ]});continue;}
      if(m.role==='assistant'&&Array.isArray(m.tool_calls)&&m.tool_calls.length){const content=[];if(m.content)content.push({type:'text',text:String(m.content)});for(const tc of m.tool_calls)content.push({type:'tool_use',id:tc.id,name:tc.function?.name,input:typeof tc.function?.arguments==='string'?JSON.parse(tc.function.arguments||'{}'):(tc.function?.arguments||{})});msgs.push({role:'assistant',content});continue;}
      msgs.push({role:m.role==='assistant'?'assistant':'user',content:String(m.content||'')});
    }
    const body={model:this.model,max_tokens:4096,system,messages:msgs};if(tools?.length)body.tools=tools.map(t=>({name:t.function.name,description:t.function.description,input_schema:t.function.parameters}));
    const r=await timeoutFetch(`${this.baseUrl}/v1/messages`,{method:'POST',headers:{'content-type':'application/json','x-api-key':this.apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify(body)});if(!r.ok)throw new Error(`anthropic HTTP ${r.status}: ${(await r.text()).slice(0,900)}`);
    const data=await r.json(),blocks=Array.isArray(data.content)?data.content:[],text=blocks.filter(x=>x.type==='text').map(x=>x.text).join('\n').trim(),calls=blocks.filter(x=>x.type==='tool_use').map(x=>({id:x.id,type:'function',function:{name:x.name,arguments:JSON.stringify(x.input||{})}}));
    return {message:{role:'assistant',content:text,tool_calls:calls.length?calls:undefined},usage:data.usage,provider:this.provider,model:this.model};
  }
  async health(){if(!this.configured)return false;try{const r=await timeoutFetch(`${this.baseUrl}/v1/models`,{headers:{'x-api-key':this.apiKey,'anthropic-version':'2023-06-01'}},8000);return r.ok||r.status===404||r.status===405;}catch{return false;}}
}

const envFor=provider=>{
  const keyMap={github:'GITHUB_MODELS_TOKEN',openai:'OPENAI_API_KEY',deepseek:'DEEPSEEK_API_KEY',gemini:'GEMINI_API_KEY',groq:'GROQ_API_KEY',openrouter:'OPENROUTER_API_KEY',mistral:'MISTRAL_API_KEY',anthropic:'ANTHROPIC_API_KEY'};
  const baseMap={github:'GITHUB_MODELS_BASE_URL',openai:'OPENAI_BASE_URL',deepseek:'DEEPSEEK_BASE_URL',gemini:'GEMINI_BASE_URL',groq:'GROQ_BASE_URL',openrouter:'OPENROUTER_BASE_URL',mistral:'MISTRAL_BASE_URL',anthropic:'ANTHROPIC_BASE_URL'};
  const modelMap={github:'GITHUB_MODELS_MODEL',openai:'OPENAI_MODEL',deepseek:'DEEPSEEK_MODEL',gemini:'GEMINI_MODEL',groq:'GROQ_MODEL',openrouter:'OPENROUTER_MODEL',mistral:'MISTRAL_MODEL',anthropic:'ANTHROPIC_MODEL'};
  if(provider==='qwen')return {apiKey:process.env.DASHSCOPE_API_KEY||process.env.QWEN_API_KEY,baseUrl:process.env.QWEN_BASE_URL,model:process.env.QWEN_MODEL};
  return {apiKey:process.env[keyMap[provider]],baseUrl:process.env[baseMap[provider]],model:process.env[modelMap[provider]]};
};
const configFor=provider=>{const preset=BRAIN_PROVIDER_PRESETS[provider],env=envFor(provider),runtime=RUNTIME_PROVIDER_CONFIG?.[provider]||{};return {provider,apiKey:runtime.apiKey||env.apiKey||'',baseUrl:runtime.baseUrl||env.baseUrl||preset.baseUrl,model:runtime.model||env.model||preset.model};};
const makeClient=provider=>{const c=configFor(provider);if(!c.apiKey)return null;return provider==='anthropic'?new AnthropicBrainClient(c):new OnlineBrainClient(c);};
const cloneClient=(client,model)=>client instanceof AnthropicBrainClient?client.withModel(model):new OnlineBrainClient({provider:client.provider,apiKey:client.apiKey,baseUrl:client.baseUrl,model:model||client.model});

export class OnlineBrainPool{
  constructor({clients=Object.keys(BRAIN_PROVIDER_PRESETS).map(makeClient).filter(Boolean)}={}){this.clients=clients;this.last=null;}
  get configured(){return this.clients.length>0;}
  get provider(){return this.last?.provider||this.clients[0]?.provider||null;}
  get model(){return this.last?.model||this.clients[0]?.model||null;}
  catalog(){return Object.entries(BRAIN_PROVIDER_PRESETS).map(([provider,p])=>{const c=this.clients.find(x=>x.provider===provider);return {provider,label:p.label,configured:Boolean(c),model:c?.model||p.model,baseUrl:c?.baseUrl||p.baseUrl,note:p.note};});}
  ordered(profile='general'){const score=c=>{if(profile==='coding')return ({github:0,anthropic:1,openai:2,deepseek:3,qwen:4,openrouter:5,gemini:6,groq:7,mistral:8}[c.provider]??9);if(profile==='research')return ({github:0,openai:1,qwen:2,gemini:3,anthropic:4,deepseek:5,openrouter:6,groq:7,mistral:8}[c.provider]??9);return ({github:0,openrouter:1,qwen:2,gemini:3,deepseek:4,openai:5,anthropic:6,groq:7,mistral:8}[c.provider]??9);};return [...this.clients].sort((a,b)=>score(a)-score(b));}
  async chat(messages,tools=[],{profile='general',provider='auto',model='auto'}={}){const chosen=String(provider||'auto').toLowerCase(),base=chosen==='auto'?this.ordered(profile):this.clients.filter(c=>c.provider===chosen);if(chosen!=='auto'&&!base.length)throw new Error(`${chosen} is not configured. Add its API key in Brain settings first.`);const errors=[];for(const original of base){const c=model&&model!=='auto'?cloneClient(original,model):original;try{const out=await c.chat(messages,tools);this.last=c;return out;}catch(e){errors.push(`${c.provider}: ${e.message}`);if(chosen!=='auto')break;}}throw new Error(errors.join(' | ')||'No online provider configured');}
  async health(){const states={};for(const c of this.clients)states[c.provider]=await c.health();return states;}
}
export const onlineBrainPoolFromEnv=()=>new OnlineBrainPool();
