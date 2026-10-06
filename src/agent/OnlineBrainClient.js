const timeoutFetch=async(url,options={},timeoutMs=30000)=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);}
};
const streamFetch=async(url,options={},timeoutMs=30000)=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{...options,signal:controller.signal});
    if(!response.ok){clearTimeout(timer);const t=(await response.text()).slice(0,900);throw new Error('HTTP '+response.status+': '+t);}
    return {response,release:()=>clearTimeout(timer)};
  }catch(error){clearTimeout(timer);if(error?.name==='AbortError')throw new Error('Online brain timed out');throw error;}
};
const parseSse=async(response,onDelta=()=>{})=>{
  if(!response.body)throw new Error('Online streaming response has no body');
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',text='',usage;
  const consume=raw=>{
    for(const line of raw.split(/\r?\n/)){
      const value=line.trim();
      if(!value||!value.startsWith('data:'))continue;
      const payload=value.slice(5).trim();
      if(payload==='[DONE]')continue;
      let item;try{item=JSON.parse(payload);}catch{continue;}
      const delta=String(item?.choices?.[0]?.delta?.content||'');
      if(delta){text+=delta;onDelta(delta,item);}
      if(item?.usage)usage=item.usage;
    }
  };
  while(true){
    const next=await reader.read();
    buffer+=decoder.decode(next.value||new Uint8Array(),{stream:!next.done});
    const lines=buffer.split(/\r?\n/);buffer=lines.pop()||'';consume(lines.join('\n'));
    if(next.done)break;
  }
  if(buffer)consume(buffer);
  return {text,usage};
};
export class OnlineBrainClient{
  constructor({provider,apiKey,baseUrl,model,timeoutMs=30000}={}){this.provider=provider;this.apiKey=apiKey;this.baseUrl=String(baseUrl||'').replace(/\/$/,'');this.model=model;this.timeoutMs=timeoutMs;}
  get configured(){return Boolean(this.provider&&this.apiKey&&this.baseUrl&&this.model);}
  headers(){return {'content-type':'application/json','authorization':'Bearer '+this.apiKey};}
  body(messages,tools=[],stream=false){const body={model:this.model,messages,stream,temperature:.5,top_p:.9};if(tools?.length){body.tools=tools;body.tool_choice='auto';}return body;}
  async chat(messages,tools=[]){
    if(!this.configured)throw new Error('Online brain is not configured');
    let r;try{r=await timeoutFetch(this.baseUrl+'/chat/completions',{method:'POST',headers:this.headers(),body:JSON.stringify(this.body(messages,tools,false))},this.timeoutMs);}catch(e){if(e?.name==='AbortError')throw new Error(this.provider+' timed out');throw e;}
    if(!r.ok){const t=(await r.text()).slice(0,900);throw new Error(this.provider+' HTTP '+r.status+': '+t);}
    const data=await r.json(),message=data?.choices?.[0]?.message;if(!message)throw new Error(this.provider+' returned no message');
    return {message,usage:data.usage,provider:this.provider,model:this.model};
  }
  async chatStream(messages,tools=[],onDelta=()=>{}){
    if(tools?.length)return this.chat(messages,tools);
    if(!this.configured)throw new Error('Online brain is not configured');
    let pending;try{pending=await streamFetch(this.baseUrl+'/chat/completions',{method:'POST',headers:this.headers(),body:JSON.stringify(this.body(messages,[],true))},this.timeoutMs);}catch(e){throw new Error(this.provider+' '+e.message);}
    let parsed;try{parsed=await parseSse(pending.response,onDelta);}finally{pending.release();}if(!parsed.text)throw new Error(this.provider+' returned an empty streamed message');
    return {message:{role:'assistant',content:parsed.text},usage:parsed.usage,provider:this.provider,model:this.model};
  }
  async health(){if(!this.configured)return false;try{const r=await timeoutFetch(this.baseUrl+'/models',{headers:{authorization:'Bearer '+this.apiKey}},8000);return r.ok;}catch{return false;}}
}
export function onlineBrainFromEnv(){const qwenKey=process.env.DASHSCOPE_API_KEY||process.env.QWEN_API_KEY,qwenBase=process.env.QWEN_BASE_URL;if(qwenKey&&qwenBase)return new OnlineBrainClient({provider:'qwen',apiKey:qwenKey,baseUrl:qwenBase,model:process.env.QWEN_MODEL||'qwen3.7-flash'});const deepKey=process.env.DEEPSEEK_API_KEY;if(deepKey)return new OnlineBrainClient({provider:'deepseek',apiKey:deepKey,baseUrl:process.env.DEEPSEEK_BASE_URL||'https://api.deepseek.com',model:process.env.DEEPSEEK_MODEL||'deepseek-chat'});const genericKey=process.env.BLACK_CLOVER_ONLINE_API_KEY,genericBase=process.env.BLACK_CLOVER_ONLINE_BASE_URL,genericModel=process.env.BLACK_CLOVER_ONLINE_MODEL;if(genericKey&&genericBase&&genericModel)return new OnlineBrainClient({provider:'openai-compatible',apiKey:genericKey,baseUrl:genericBase,model:genericModel});return null;}
