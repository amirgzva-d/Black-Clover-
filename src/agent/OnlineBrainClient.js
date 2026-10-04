const timeoutFetch=async(url,options={},timeoutMs=120000)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{return await fetch(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);}};
const cleanBase=s=>String(s||'').replace(/\/$/,'');

export class OnlineBrainClient{
  constructor({provider,apiKey,baseUrl,model,format='openai'}={}){this.provider=provider;this.apiKey=apiKey;this.baseUrl=cleanBase(baseUrl);this.model=model;this.format=format;}
  get configured(){return Boolean(this.provider&&this.apiKey&&this.baseUrl&&this.model);}
  async chat(messages,tools=[]){if(!this.configured)throw new Error('Online brain is not configured');return this.format==='anthropic'?this.chatAnthropic(messages,tools):this.chatOpenAI(messages,tools);}
  async chatOpenAI(messages,tools=[]){const body={model:this.model,messages,stream:false,temperature:.45,top_p:.9};if(tools?.length){body.tools=tools;body.tool_choice='auto';}const r=await timeoutFetch(`${this.baseUrl}/chat/completions`,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${this.apiKey}`},body:JSON.stringify(body)});if(!r.ok){const t=(await r.text()).slice(0,1200);throw new Error(`${this.provider} HTTP ${r.status}: ${t}`);}const data=await r.json(),message=data?.choices?.[0]?.message;if(!message)throw new Error(`${this.provider} returned no message`);return {message,usage:data.usage,provider:this.provider,model:this.model};}
  async chatAnthropic(messages,tools=[]){const system=messages.filter(x=>x.role==='system').map(x=>x.content).join('\n\n'),converted=[];for(const m of messages.filter(x=>x.role!=='system')){if(m.role==='tool'){converted.push({role:'user',content:[{type:'tool_result',tool_use_id:m.tool_call_id,content:String(m.content??'')} ]});continue;}if(m.role==='assistant'&&m.tool_calls?.length){const blocks=[];if(m.content)blocks.push({type:'text',text:String(m.content)});for(const c of m.tool_calls)blocks.push({type:'tool_use',id:c.id,name:c.function?.name,input:typeof c.function?.arguments==='string'?JSON.parse(c.function.arguments||'{}'):c.function?.arguments||{}});converted.push({role:'assistant',content:blocks});continue;}converted.push({role:m.role==='assistant'?'assistant':'user',content:String(m.content??'')});}
    const anthropicTools=(tools||[]).map(t=>({name:t.function.name,description:t.function.description,input_schema:t.function.parameters})),body={model:this.model,max_tokens:4096,temperature:.45,system,messages:converted};if(anthropicTools.length)body.tools=anthropicTools;const r=await timeoutFetch(`${this.baseUrl}/v1/messages`,{method:'POST',headers:{'content-type':'application/json','x-api-key':this.apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify(body)});if(!r.ok){const t=(await r.text()).slice(0,1200);throw new Error(`${this.provider} HTTP ${r.status}: ${t}`);}const data=await r.json(),text=(data.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n').trim(),calls=(data.content||[]).filter(x=>x.type==='tool_use').map(x=>({id:x.id,type:'function',function:{name:x.name,arguments:JSON.stringify(x.input||{})}}));return {message:{role:'assistant',content:text,tool_calls:calls.length?calls:undefined},usage:data.usage,provider:this.provider,model:this.model};}
  async health(){if(!this.configured)return false;try{if(this.format==='anthropic'){const r=await timeoutFetch(`${this.baseUrl}/v1/messages`,{method:'POST',headers:{'content-type':'application/json','x-api-key':this.apiKey,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:this.model,max_tokens:1,messages:[{role:'user',content:'ping'}]})},8000);return r.ok||r.status===400||r.status===429;}const r=await timeoutFetch(`${this.baseUrl}/models`,{headers:{authorization:`Bearer ${this.apiKey}`}},8000);return r.ok;}catch{return false;}}
}

export class OnlineBrainPool{
  constructor(clients=[]){this.clients=clients.filter(Boolean);this.last=null;this.lastErrors=[];}
  get configured(){return this.clients.some(x=>x.configured);}
  get provider(){return this.last?.provider||this.clients.find(x=>x.configured)?.provider||null;}
  get model(){return this.last?.model||this.clients.find(x=>x.configured)?.model||null;}
  async chat(messages,tools=[],options={}){this.lastErrors=[];for(const client of this.clients){if(!client.configured)continue;try{const out=await client.chat(messages,tools,options);this.last=client;return out;}catch(e){this.lastErrors.push({provider:client.provider,error:e.message});}}throw new Error(this.lastErrors.map(x=>`${x.provider}: ${x.error}`).join(' | ')||'No online provider configured');}
  async health(){for(const c of this.clients)if(c.configured&&await c.health()){this.last=c;return true;}return false;}
}

const client=(provider,key,base,model,format='openai')=>key&&base&&model?new OnlineBrainClient({provider,apiKey:key,baseUrl:base,model,format}):null;
export function onlineBrainsFromEnv(){const map={
  qwen:client('qwen',process.env.DASHSCOPE_API_KEY||process.env.QWEN_API_KEY,process.env.QWEN_BASE_URL,process.env.QWEN_MODEL||'qwen-plus'),
  deepseek:client('deepseek',process.env.DEEPSEEK_API_KEY,process.env.DEEPSEEK_BASE_URL||'https://api.deepseek.com',process.env.DEEPSEEK_MODEL||'deepseek-flash'),
  openai:client('openai',process.env.OPENAI_API_KEY,process.env.OPENAI_BASE_URL||'https://api.openai.com/v1',process.env.OPENAI_MODEL||'gpt-5.6'),
  anthropic:client('anthropic',process.env.ANTHROPIC_API_KEY,process.env.ANTHROPIC_BASE_URL||'https://api.anthropic.com',process.env.ANTHROPIC_MODEL||'claude-sonnet-4-5','anthropic'),
  generic:client('openai-compatible',process.env.BLACK_CLOVER_ONLINE_API_KEY,process.env.BLACK_CLOVER_ONLINE_BASE_URL,process.env.BLACK_CLOVER_ONLINE_MODEL)
};const order=String(process.env.BLACK_CLOVER_PROVIDER_ORDER||'qwen,deepseek,openai,anthropic,generic').split(',').map(x=>x.trim().toLowerCase());return order.map(k=>map[k]).filter(Boolean);}
export function onlineBrainFromEnv(){const pool=new OnlineBrainPool(onlineBrainsFromEnv());return pool.configured?pool:null;}
