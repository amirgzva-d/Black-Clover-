import { OnlineBrainClient } from './OnlineBrainClient.js';
import { providerCatalogFromEnv,onlineProviderPolicy,FREE_PROVIDER_IDS } from './providers/providerCatalog.js';

const timeoutFetch=async(url,options={},timeoutMs=90000)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);try{return await fetch(url,{...options,signal:c.signal});}finally{clearTimeout(t);}};

class AnthropicBrainClient{
  constructor({apiKey='',baseUrl='https://api.anthropic.com',model=''}={}){this.provider='anthropic';this.apiKey=apiKey;this.baseUrl=String(baseUrl||'').replace(/\/$/,'');this.model=model;}
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
    const r=await timeoutFetch(`${this.baseUrl}/v1/messages`,{method:'POST',headers:{'content-type':'application/json','x-api-key':this.apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify(body)});
    if(!r.ok)throw new Error(`anthropic HTTP ${r.status}: ${(await r.text()).slice(0,900)}`);
    const data=await r.json(),blocks=Array.isArray(data.content)?data.content:[],text=blocks.filter(x=>x.type==='text').map(x=>x.text).join('\n').trim(),calls=blocks.filter(x=>x.type==='tool_use').map(x=>({id:x.id,type:'function',function:{name:x.name,arguments:JSON.stringify(x.input||{})}}));
    return {message:{role:'assistant',content:text,tool_calls:calls.length?calls:undefined},usage:data.usage,provider:this.provider,model:this.model};
  }
  async health(){if(!this.configured)return false;try{const r=await timeoutFetch(`${this.baseUrl}/v1/models`,{headers:{'x-api-key':this.apiKey,'anthropic-version':'2023-06-01'}},8000);return r.ok||r.status===404||r.status===405;}catch{return false;}}
}

const clientFromConfig=c=>c.kind==='anthropic'
  ?new AnthropicBrainClient({apiKey:c.apiKey,baseUrl:c.baseUrl,model:c.model})
  :new OnlineBrainClient({provider:c.id,apiKey:c.apiKey,baseUrl:c.baseUrl,model:c.model});
const envClients=()=>providerCatalogFromEnv().filter(c=>c.apiKey&&c.baseUrl&&c.model).map(clientFromConfig);
const cloneClient=(client,model)=>client instanceof AnthropicBrainClient?client.withModel(model):typeof client.withModel==='function'?client.withModel(model):new OnlineBrainClient({provider:client.provider,apiKey:client.apiKey,baseUrl:client.baseUrl,model:model||client.model});

export class OnlineBrainPool{
  constructor({clients=envClients(),freeOnly=onlineProviderPolicy().freeOnly}={}){this.clients=clients;this.freeOnly=Boolean(freeOnly);this.last=null;}
  get configured(){return this.ordered('general').length>0;}
  get provider(){return this.last?.provider||this.ordered('general')[0]?.provider||null;}
  get model(){return this.last?.model||this.ordered('general')[0]?.model||null;}
  catalog(){
    return providerCatalogFromEnv().map(cfg=>{const c=this.clients.find(x=>x.provider===cfg.id);return {provider:cfg.id,label:cfg.label,configured:Boolean(c),model:c?.model||cfg.model||null,costClass:cfg.costClass,capabilities:cfg.capabilities,allowed:!this.freeOnly||FREE_PROVIDER_IDS.includes(cfg.id)};});
  }
  ordered(profile='general'){
    const allowed=this.freeOnly?this.clients.filter(c=>FREE_PROVIDER_IDS.includes(c.provider)):this.clients;
    const score=c=>{
      if(profile==='coding'){if(c.provider==='groq')return 0;if(c.provider==='gemini')return 1;if(c.provider==='openrouter')return 2;if(c.provider==='anthropic')return 3;if(c.provider==='openai')return 4;if(c.provider==='deepseek')return 5;if(c.provider==='qwen')return 6;}
      if(profile==='research'){if(c.provider==='gemini')return 0;if(c.provider==='groq')return 1;if(c.provider==='openrouter')return 2;if(c.provider==='openai')return 3;if(c.provider==='qwen')return 4;if(c.provider==='anthropic')return 5;if(c.provider==='deepseek')return 6;}
      if(profile==='complex'){if(c.provider==='groq')return 0;if(c.provider==='gemini')return 1;if(c.provider==='openrouter')return 2;if(c.provider==='anthropic')return 3;if(c.provider==='openai')return 4;if(c.provider==='deepseek')return 5;if(c.provider==='qwen')return 6;}
      return c.provider==='groq'?0:c.provider==='gemini'?1:c.provider==='openrouter'?2:c.provider==='qwen'?3:c.provider==='deepseek'?4:c.provider==='openai'?5:c.provider==='anthropic'?6:7;
    };
    return [...allowed].sort((a,b)=>score(a)-score(b));
  }
  async chat(messages,tools=[],{profile='general',provider='auto',model='auto'}={}){
    const chosen=String(provider||'auto').toLowerCase();
    if(this.freeOnly&&chosen!=='auto'&&!FREE_PROVIDER_IDS.includes(chosen))throw new Error(`${chosen} is disabled because BLACK_CLOVER_FREE_ONLY is enabled.`);
    const base=chosen==='auto'?this.ordered(profile):this.clients.filter(c=>c.provider===chosen);
    if(chosen!=='auto'&&!base.length)throw new Error(`${chosen} is not configured. Add its API key in settings/environment first.`);
    const errors=[];
    for(const original of base){
      const c=model&&model!=='auto'?cloneClient(original,model):original;
      try{const out=await c.chat(messages,tools);this.last=c;return out;}catch(e){errors.push(`${c.provider}: ${e.message}`);if(chosen!=='auto')break;}
    }
    throw new Error(errors.join(' | ')||'No online provider configured');
  }
  async health(){const states={};for(const c of this.clients)states[c.provider]=await c.health();return states;}
}
export const onlineBrainPoolFromEnv=()=>new OnlineBrainPool();
