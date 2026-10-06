import { OnlineBrainClient } from './OnlineBrainClient.js';
const timeoutFetch=async(url,options={},timeoutMs=90000)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);try{return await fetch(url,{...options,signal:c.signal});}finally{clearTimeout(t);}};

class AnthropicBrainClient{
  constructor({apiKey=process.env.ANTHROPIC_API_KEY,baseUrl=process.env.ANTHROPIC_BASE_URL||'https://api.anthropic.com',model=process.env.ANTHROPIC_MODEL||'claude-sonnet-4-6'}={}){this.provider='anthropic';this.apiKey=apiKey;this.baseUrl=String(baseUrl).replace(/\/$/,'');this.model=model;}
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
    const data=await r.json(),blocks=Array.isArray(data.content)?data.content:[],text=blocks.filter(x=>x.type==='text').map(x=>x.text).join('\n').trim(),calls=blocks.filter(x=>x.type==='tool_use').map(x=>({id:x.id,type:'function',function:{name:x.name,arguments:JSON.stringify(x.input||{})}}));return {message:{role:'assistant',content:text,tool_calls:calls.length?calls:undefined},usage:data.usage,provider:this.provider,model:this.model};
  }
  async health(){if(!this.configured)return false;try{const r=await timeoutFetch(`${this.baseUrl}/v1/models`,{headers:{'x-api-key':this.apiKey,'anthropic-version':'2023-06-01'}},8000);return r.ok||r.status===404||r.status===405;}catch{return false;}}
}

function openAICompatibleClients(){
  const out=[];const add=(provider,apiKey,baseUrl,model)=>{if(apiKey&&baseUrl&&model)out.push(new OnlineBrainClient({provider,apiKey,baseUrl,model}));};
  add('groq',process.env.GROQ_API_KEY,process.env.GROQ_BASE_URL||'https://api.groq.com/openai/v1',process.env.GROQ_MODEL||'openai/gpt-oss-120b');
  add('gemini',process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY,process.env.GEMINI_BASE_URL||'https://generativelanguage.googleapis.com/v1beta/openai',process.env.GEMINI_MODEL||'gemini-3.8-flash');
  add('openrouter',process.env.OPENROUTER_API_KEY,process.env.OPENROUTER_BASE_URL||'https://openrouter.ai/api/v1',process.env.OPENROUTER_MODEL||'openrouter/free');
  add('qwen',process.env.DASHSCOPE_API_KEY||process.env.QWEN_API_KEY,process.env.QWEN_BASE_URL,process.env.QWEN_MODEL||'qwen-plus');
  add('deepseek',process.env.DEEPSEEK_API_KEY,process.env.DEEPSEEK_BASE_URL||'https://api.deepseek.com',process.env.DEEPSEEK_MODEL||'deepseek-chat');
  add('openai',process.env.OPENAI_API_KEY,process.env.OPENAI_BASE_URL||'https://api.openai.com/v1',process.env.OPENAI_MODEL||'gpt-6-luna');
  add('generic',process.env.BLACK_CLOVER_ONLINE_API_KEY,process.env.BLACK_CLOVER_ONLINE_BASE_URL,process.env.BLACK_CLOVER_ONLINE_MODEL);
  return out;
}
const cloneClient=(client,model)=>client instanceof AnthropicBrainClient?client.withModel(model):typeof client.withModel==='function'?client.withModel(model):new OnlineBrainClient({provider:client.provider,apiKey:client.apiKey,baseUrl:client.baseUrl,model:model||client.model});
const KNOWN=[['groq','Groq • GPT-OSS 120B'],['gemini','Google Gemini 3.8 Flash'],['openrouter','OpenRouter • Free Router'],['openai','ChatGPT / OpenAI'],['anthropic','Claude'],['deepseek','DeepSeek'],['qwen','Qwen Cloud']];

export class OnlineBrainPool{
  constructor({clients=[...openAICompatibleClients(),new AnthropicBrainClient()].filter(x=>x.configured),freeOnly=/^(1|true|yes)$/i.test(String(process.env.BLACK_CLOVER_FREE_ONLY||''))}={}){this.clients=clients;this.freeOnly=Boolean(freeOnly);this.last=null;}
  get configured(){return this.clients.length>0;}
  get provider(){return this.last?.provider||this.clients[0]?.provider||null;}
  get model(){return this.last?.model||this.clients[0]?.model||null;}
  catalog(){return KNOWN.map(([provider,label])=>{const c=this.clients.find(x=>x.provider===provider);return {provider,label,configured:Boolean(c),model:c?.model||null};});}
  ordered(profile='general'){
    const allowed=this.freeOnly?this.clients.filter(c=>['groq','gemini','openrouter'].includes(c.provider)):this.clients;
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
    if(this.freeOnly&&chosen!=='auto'&&!['groq','gemini','openrouter'].includes(chosen))throw new Error(`${chosen} is disabled because BLACK_CLOVER_FREE_ONLY is enabled.`);
    const base=chosen==='auto'?this.ordered(profile):this.clients.filter(c=>c.provider===chosen);
    if(chosen!=='auto'&&!base.length)throw new Error(`${chosen} is not configured. Add its API key in settings/environment first.`);
    const errors=[];for(const original of base){const c=model&&model!=='auto'?cloneClient(original,model):original;try{const out=await c.chat(messages,tools);this.last=c;return out;}catch(e){errors.push(`${c.provider}: ${e.message}`);if(chosen!=='auto')break;}}
    throw new Error(errors.join(' | ')||'No online provider configured');
  }
  async health(){const states={};for(const c of this.clients)states[c.provider]=await c.health();return states;}
}
export const onlineBrainPoolFromEnv=()=>new OnlineBrainPool();
