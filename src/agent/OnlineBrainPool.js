import { OnlineBrainClient } from './OnlineBrainClient.js';

const timeoutFetch=async(url,options={},timeoutMs=90000)=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{...options,signal:controller.signal});}
  finally{clearTimeout(timer);}
};

export const BRAIN_PROVIDER_PRESETS=Object.freeze({
  github:{label:'GitHub Models • Free Tier',baseUrl:'https://models.github.ai/inference',model:'openai/gpt-4o-mini',note:'Optional GitHub Models connection via GitHub CLI or token.'},
  groq:{label:'Groq • GPT-OSS 120B',baseUrl:'https://api.groq.com/openai/v1',model:'openai/gpt-oss-120b',note:'Fast free-first provider when configured.'},
  gemini:{label:'Google Gemini',baseUrl:'https://generativelanguage.googleapis.com/v1beta/openai',model:'gemini-3.8-flash',note:'Free-first Gemini provider when configured.'},
  openrouter:{label:'OpenRouter • Free Router',baseUrl:'https://openrouter.ai/api/v1',model:'openrouter/free',note:'Free model router fallback.'},
  qwen:{label:'Qwen Cloud',baseUrl:'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',model:'qwen-plus',note:'Qwen OpenAI-compatible endpoint.'},
  deepseek:{label:'DeepSeek',baseUrl:'https://api.deepseek.com',model:'deepseek-chat',note:'Optional paid/credit provider.'},
  openai:{label:'OpenAI / ChatGPT API',baseUrl:'https://api.openai.com/v1',model:'gpt-6-luna',note:'Optional OpenAI API provider.'},
  anthropic:{label:'Claude',baseUrl:'https://api.anthropic.com',model:'claude-sonnet-4-6',note:'Optional Anthropic API provider.'},
  mistral:{label:'Mistral',baseUrl:'https://api.mistral.ai/v1',model:'mistral-small-latest',note:'Optional Mistral provider.'}
});

let RUNTIME_PROVIDER_CONFIG={};
export function setRuntimeProviderConfig(config={}){
  RUNTIME_PROVIDER_CONFIG=config&&typeof config==='object'?config:{};
}

const runtime=provider=>RUNTIME_PROVIDER_CONFIG?.[provider]||{};
const pick=(provider,key,envKeys=[],fallback='')=>{
  const r=runtime(provider)?.[key];
  if(r)return r;
  for(const env of envKeys){if(process.env[env])return process.env[env];}
  return fallback;
};

class AnthropicBrainClient{
  constructor({apiKey,baseUrl='https://api.anthropic.com',model='claude-sonnet-4-6'}={}){
    this.provider='anthropic';this.apiKey=apiKey;this.baseUrl=String(baseUrl).replace(/\/$/,'');this.model=model;
  }
  get configured(){return Boolean(this.apiKey&&this.baseUrl&&this.model);}
  withModel(model){return new AnthropicBrainClient({apiKey:this.apiKey,baseUrl:this.baseUrl,model:model||this.model});}
  async chat(messages,tools=[]){
    if(!this.configured)throw new Error('Anthropic is not configured');
    let system='';const msgs=[];
    for(const m of messages){
      if(m.role==='system'){system+=(system?'\n\n':'')+String(m.content||'');continue;}
      if(m.role==='tool'){msgs.push({role:'user',content:[{type:'tool_result',tool_use_id:m.tool_call_id||m.tool_name,content:String(m.content||'')} ]});continue;}
      if(m.role==='assistant'&&Array.isArray(m.tool_calls)&&m.tool_calls.length){
        const blocks=[];if(m.content)blocks.push({type:'text',text:String(m.content)});
        for(const tc of m.tool_calls)blocks.push({type:'tool_use',id:tc.id,name:tc.function?.name,input:typeof tc.function?.arguments==='string'?JSON.parse(tc.function.arguments||'{}'):(tc.function?.arguments||{})});
        msgs.push({role:'assistant',content:blocks});continue;
      }
      msgs.push({role:m.role==='assistant'?'assistant':'user',content:String(m.content||'')});
    }
    const body={model:this.model,max_tokens:4096,system,messages:msgs};
    if(tools?.length)body.tools=tools.map(t=>({name:t.function.name,description:t.function.description,input_schema:t.function.parameters}));
    const response=await timeoutFetch(this.baseUrl+'/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':this.apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify(body)});
    if(!response.ok)throw new Error('anthropic HTTP '+response.status+': '+(await response.text()).slice(0,900));
    const data=await response.json(),blocks=Array.isArray(data.content)?data.content:[];
    const text=blocks.filter(x=>x.type==='text').map(x=>x.text).join('\n').trim();
    const calls=blocks.filter(x=>x.type==='tool_use').map(x=>({id:x.id,type:'function',function:{name:x.name,arguments:JSON.stringify(x.input||{})}}));
    return {message:{role:'assistant',content:text,tool_calls:calls.length?calls:undefined},usage:data.usage,provider:this.provider,model:this.model};
  }
  async health(){
    if(!this.configured)return false;
    try{const r=await timeoutFetch(this.baseUrl+'/v1/models',{headers:{'x-api-key':this.apiKey,'anthropic-version':'2023-06-01'}},8000);return r.ok||r.status===404||r.status===405;}
    catch{return false;}
  }
}

function openAICompatibleClients(){
  const out=[];
  const add=provider=>{
    const preset=BRAIN_PROVIDER_PRESETS[provider];
    const apiKey=pick(provider,'apiKey',
      provider==='github'?['GITHUB_MODELS_TOKEN']:
      provider==='groq'?['GROQ_API_KEY']:
      provider==='gemini'?['GEMINI_API_KEY','GOOGLE_API_KEY']:
      provider==='openrouter'?['OPENROUTER_API_KEY']:
      provider==='qwen'?['DASHSCOPE_API_KEY','QWEN_API_KEY']:
      provider==='deepseek'?['DEEPSEEK_API_KEY']:
      provider==='openai'?['OPENAI_API_KEY']:
      provider==='mistral'?['MISTRAL_API_KEY']:[]);
    const baseUrl=pick(provider,'baseUrl',
      provider==='github'?['GITHUB_MODELS_BASE_URL']:
      provider==='groq'?['GROQ_BASE_URL']:
      provider==='gemini'?['GEMINI_BASE_URL']:
      provider==='openrouter'?['OPENROUTER_BASE_URL']:
      provider==='qwen'?['QWEN_BASE_URL']:
      provider==='deepseek'?['DEEPSEEK_BASE_URL']:
      provider==='openai'?['OPENAI_BASE_URL']:
      provider==='mistral'?['MISTRAL_BASE_URL']:[],preset?.baseUrl||'');
    const model=pick(provider,'model',
      provider==='github'?['GITHUB_MODELS_MODEL']:
      provider==='groq'?['GROQ_MODEL']:
      provider==='gemini'?['GEMINI_MODEL']:
      provider==='openrouter'?['OPENROUTER_MODEL']:
      provider==='qwen'?['QWEN_MODEL']:
      provider==='deepseek'?['DEEPSEEK_MODEL']:
      provider==='openai'?['OPENAI_MODEL']:
      provider==='mistral'?['MISTRAL_MODEL']:[],preset?.model||'');
    if(apiKey&&baseUrl&&model)out.push(new OnlineBrainClient({provider,apiKey,baseUrl,model}));
  };
  for(const provider of ['github','groq','gemini','openrouter','qwen','deepseek','openai','mistral'])add(provider);
  addGeneric(out);
  return out;
}
function addGeneric(out){
  const apiKey=process.env.BLACK_CLOVER_ONLINE_API_KEY,baseUrl=process.env.BLACK_CLOVER_ONLINE_BASE_URL,model=process.env.BLACK_CLOVER_ONLINE_MODEL;
  if(apiKey&&baseUrl&&model)out.push(new OnlineBrainClient({provider:'generic',apiKey,baseUrl,model}));
}
function anthropicFromConfig(){
  const p=BRAIN_PROVIDER_PRESETS.anthropic;
  return new AnthropicBrainClient({
    apiKey:pick('anthropic','apiKey',['ANTHROPIC_API_KEY']),
    baseUrl:pick('anthropic','baseUrl',['ANTHROPIC_BASE_URL'],p.baseUrl),
    model:pick('anthropic','model',['ANTHROPIC_MODEL'],p.model)
  });
}
const cloneClient=(client,model)=>client instanceof AnthropicBrainClient?client.withModel(model):typeof client.withModel==='function'?client.withModel(model):new OnlineBrainClient({provider:client.provider,apiKey:client.apiKey,baseUrl:client.baseUrl,model:model||client.model});
const FREE_PROVIDERS=new Set(['github','groq','gemini','openrouter']);
const KNOWN=Object.entries(BRAIN_PROVIDER_PRESETS).map(([provider,p])=>[provider,p.label]);

export class OnlineBrainPool{
  constructor({clients=[...openAICompatibleClients(),anthropicFromConfig()].filter(x=>x.configured),freeOnly=/^(1|true|yes)$/i.test(String(process.env.BLACK_CLOVER_FREE_ONLY||''))}={}){
    this.clients=clients;this.freeOnly=Boolean(freeOnly);this.last=null;
  }
  get configured(){return this.clients.length>0;}
  get provider(){return this.last?.provider||this.clients[0]?.provider||null;}
  get model(){return this.last?.model||this.clients[0]?.model||null;}
  catalog(){
    return KNOWN.map(([provider,label])=>{
      const client=this.clients.find(x=>x.provider===provider),preset=BRAIN_PROVIDER_PRESETS[provider];
      return {provider,label,configured:Boolean(client),model:client?.model||preset?.model||null};
    });
  }
  ordered(profile='general'){
    const allowed=this.freeOnly?this.clients.filter(c=>FREE_PROVIDERS.has(c.provider)):this.clients;
    const score=c=>{
      if(profile==='coding')return ({groq:0,gemini:1,openrouter:2,github:3,anthropic:4,openai:5,deepseek:6,qwen:7,mistral:8}[c.provider]??9);
      if(profile==='research')return ({gemini:0,groq:1,openrouter:2,github:3,openai:4,qwen:5,anthropic:6,deepseek:7,mistral:8}[c.provider]??9);
      if(profile==='complex')return ({groq:0,gemini:1,openrouter:2,github:3,anthropic:4,openai:5,deepseek:6,qwen:7,mistral:8}[c.provider]??9);
      return ({groq:0,gemini:1,openrouter:2,github:3,qwen:4,deepseek:5,openai:6,anthropic:7,mistral:8}[c.provider]??9);
    };
    return [...allowed].sort((a,b)=>score(a)-score(b));
  }
  async chat(messages,tools=[],{profile='general',provider='auto',model='auto'}={}){
    const chosen=String(provider||'auto').toLowerCase();
    if(this.freeOnly&&chosen!=='auto'&&!FREE_PROVIDERS.has(chosen))throw new Error(chosen+' is disabled because BLACK_CLOVER_FREE_ONLY is enabled.');
    const base=chosen==='auto'?this.ordered(profile):this.clients.filter(c=>c.provider===chosen);
    if(chosen!=='auto'&&!base.length)throw new Error(chosen+' is not configured. Add its API key in Brain settings first.');
    const errors=[];
    for(const original of base){
      const client=model&&model!=='auto'?cloneClient(original,model):original;
      try{const out=await client.chat(messages,tools);this.last=client;return out;}
      catch(error){errors.push(client.provider+': '+error.message);if(chosen!=='auto')break;}
    }
    throw new Error(errors.join(' | ')||'No online provider configured');
  }
  async health(){const states={};for(const c of this.clients)states[c.provider]=await c.health();return states;}
}
export const onlineBrainPoolFromEnv=()=>new OnlineBrainPool();
