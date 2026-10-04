import { OnlineBrainClient } from './OnlineBrainClient.js';
const timeoutFetch=async(url,options={},timeoutMs=90000)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);try{return await fetch(url,{...options,signal:c.signal});}finally{clearTimeout(t);}};
class AnthropicBrainClient{
  constructor({apiKey=process.env.ANTHROPIC_API_KEY,baseUrl=process.env.ANTHROPIC_BASE_URL||'https://api.anthropic.com',model=process.env.ANTHROPIC_MODEL||'claude-sonnet-4-6'}={}){this.provider='anthropic';this.apiKey=apiKey;this.baseUrl=String(baseUrl).replace(/\/$/,'');this.model=model;}
  get configured(){return Boolean(this.apiKey&&this.baseUrl&&this.model);}
  async chat(messages,tools=[]){if(!this.configured)throw new Error('Anthropic is not configured');let system='';const msgs=[];for(const m of messages){if(m.role==='system'){system+=(system?'\n\n':'')+String(m.content||'');continue;}if(m.role==='tool'){msgs.push({role:'user',content:[{type:'tool_result',tool_use_id:m.tool_call_id||m.tool_name,content:String(m.content||'')} ]});continue;}if(m.role==='assistant'&&Array.isArray(m.tool_calls)&&m.tool_calls.length){const content=[];if(m.content)content.push({type:'text',text:String(m.content)});for(const tc of m.tool_calls)content.push({type:'tool_use',id:tc.id,name:tc.function?.name,input:typeof tc.function?.arguments==='string'?JSON.parse(tc.function.arguments||'{}'):(tc.function?.arguments||{})});msgs.push({role:'assistant',content});continue;}msgs.push({role:m.role==='assistant'?'assistant':'user',content:String(m.content||'')});}
    const body={model:this.model,max_tokens:4096,system,messages:msgs};if(tools?.length)body.tools=tools.map(t=>({name:t.function.name,description:t.function.description,input_schema:t.function.parameters}));
    const r=await timeoutFetch(`${this.baseUrl}/v1/messages`,{method:'POST',headers:{'content-type':'application/json','x-api-key':this.apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify(body)});if(!r.ok)throw new Error(`anthropic HTTP ${r.status}: ${(await r.text()).slice(0,900)}`);const data=await r.json(),blocks=Array.isArray(data.content)?data.content:[],text=blocks.filter(x=>x.type==='text').map(x=>x.text).join('\n').trim(),calls=blocks.filter(x=>x.type==='tool_use').map(x=>({id:x.id,type:'function',function:{name:x.name,arguments:JSON.stringify(x.input||{})}}));return {message:{role:'assistant',content:text,tool_calls:calls.length?calls:undefined},usage:data.usage,provider:this.provider,model:this.model};
  }
  async health(){if(!this.configured)return false;try{const r=await timeoutFetch(`${this.baseUrl}/v1/models`,{headers:{'x-api-key':this.apiKey,'anthropic-version':'2023-06-01'}},8000);return r.ok||r.status===404||r.status===405;}catch{return false;}}
}
function openAICompatibleClients(){const out=[];const add=(provider,apiKey,baseUrl,model)=>{if(apiKey&&baseUrl&&model)out.push(new OnlineBrainClient({provider,apiKey,baseUrl,model}));};
  add('qwen',process.env.DASHSCOPE_API_KEY||process.env.QWEN_API_KEY,process.env.QWEN_BASE_URL,process.env.QWEN_MODEL||'qwen-plus');
  add('deepseek',process.env.DEEPSEEK_API_KEY,process.env.DEEPSEEK_BASE_URL||'https://api.deepseek.com',process.env.DEEPSEEK_MODEL||'deepseek-chat');
  add('openai',process.env.OPENAI_API_KEY,process.env.OPENAI_BASE_URL||'https://api.openai.com/v1',process.env.OPENAI_MODEL||'gpt-6-luna');
  add('generic',process.env.BLACK_CLOVER_ONLINE_API_KEY,process.env.BLACK_CLOVER_ONLINE_BASE_URL,process.env.BLACK_CLOVER_ONLINE_MODEL);
  return out;
}
export class OnlineBrainPool{
  constructor({clients=[...openAICompatibleClients(),new AnthropicBrainClient()].filter(x=>x.configured)}={}){this.clients=clients;this.last=null;}
  get configured(){return this.clients.length>0;}
  get provider(){return this.last?.provider||this.clients[0]?.provider||null;}
  get model(){return this.last?.model||this.clients[0]?.model||null;}
  ordered(profile='general'){const score=(c)=>{if(profile==='coding'){if(c.provider==='anthropic')return 0;if(c.provider==='openai')return 1;if(c.provider==='deepseek')return 2;if(c.provider==='qwen')return 3;}if(profile==='research'){if(c.provider==='openai')return 0;if(c.provider==='qwen')return 1;if(c.provider==='anthropic')return 2;if(c.provider==='deepseek')return 3;}return c.provider==='qwen'?0:c.provider==='deepseek'?1:c.provider==='openai'?2:c.provider==='anthropic'?3:4;};return [...this.clients].sort((a,b)=>score(a)-score(b));}
  async chat(messages,tools=[],{profile='general'}={}){const errors=[];for(const c of this.ordered(profile)){try{const out=await c.chat(messages,tools);this.last=c;return out;}catch(e){errors.push(`${c.provider}: ${e.message}`);}}throw new Error(errors.join(' | ')||'No online provider configured');}
  async health(){const states={};for(const c of this.clients)states[c.provider]=await c.health();return states;}
}
export const onlineBrainPoolFromEnv=()=>new OnlineBrainPool();
