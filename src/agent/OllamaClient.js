const normalizeBaseUrl=value=>{
  let url=String(value||'http://127.0.0.1:11434').trim();
  if(!/^https?:\/\//i.test(url))url='http://'+url;
  return url.replace(/\/+$/,'').replace(/\/(api|v1)$/i,'');
};
const readNdjson=async(response,onChunk=()=>{})=>{
  if(!response.body)throw new Error('Ollama streaming response has no body');
  const reader=response.body.getReader(),decoder=new TextDecoder(),parts=[];let buffer='';
  const consume=raw=>{
    for(const line of raw.split(/\r?\n/)){const trimmed=line.trim();if(!trimmed)continue;let item;try{item=JSON.parse(trimmed);}catch{continue;}const delta=String(item?.message?.content||'');if(delta){parts.push(delta);onChunk(delta,item);}if(item?.done)return item;}
    return null;
  };
  let doneItem=null;
  while(!doneItem){
    const next=await reader.read();
    buffer+=decoder.decode(next.value||new Uint8Array(),{stream:!next.done});
    const lines=buffer.split(/\r?\n/);buffer=lines.pop()||'';
    doneItem=consume(lines.join('\n'));
    if(next.done)break;
  }
  if(buffer&&!doneItem)doneItem=consume(buffer);
  return {text:parts.join(''),done:doneItem||{}};
};
export class OllamaClient {
  constructor({baseUrl=process.env.OLLAMA_URL||process.env.OLLAMA_HOST||'http://127.0.0.1:11434',model=process.env.BLACK_CLOVER_MODEL||'qwen2.5:3b',timeoutMs=90000,keepAlive='15m',numCtx=4096,temperature=.5,think=false,numPredict=640}={}){
    this.baseUrl=normalizeBaseUrl(baseUrl);
    this.model=model;
    this.timeoutMs=timeoutMs;
    this.keepAlive=keepAlive;
    this.numCtx=numCtx;
    this.temperature=temperature;
    this.think=think;
    this.numPredict=numPredict;
    this.controllers=new Set();
  }
  cancel(){for(const controller of this.controllers)try{controller.__manualCancel=true;controller.abort();}catch{}this.controllers.clear();}
  async request(path,options={}){
    const controller=new AbortController();this.controllers.add(controller);
    const timer=setTimeout(()=>controller.abort(),this.timeoutMs);
    try{
      const r=await fetch(this.baseUrl+path,{...options,signal:controller.signal});
      if(!r.ok){
        const body=(await r.text()).slice(0,500).replace(/\s+/g,' ').trim();
        const hint=r.status===403?' (این مدل Ollama Cloud نیاز به مجوز دارد)':'';
        throw new Error('Ollama HTTP '+r.status+hint+(body?': '+body:''));
      }
      return r;
    }catch(error){
      if(error?.name==='AbortError')throw new Error(controller.__manualCancel?'Request cancelled':'Ollama response timed out');
      throw error;
    }finally{
      clearTimeout(timer);this.controllers.delete(controller);
    }
  }
  async streamRequest(path,options={}){
    const controller=new AbortController();this.controllers.add(controller);const timer=setTimeout(()=>controller.abort(),this.timeoutMs);
    try{
      const r=await fetch(this.baseUrl+path,{...options,signal:controller.signal});
      if(!r.ok){const body=(await r.text()).slice(0,500).replace(/\s+/g,' ').trim();const hint=r.status===403?' (این مدل Ollama Cloud نیاز به مجوز دارد)':'';clearTimeout(timer);this.controllers.delete(controller);throw new Error('Ollama HTTP '+r.status+hint+(body?': '+body:''));}
      return {response:r,release:()=>{clearTimeout(timer);this.controllers.delete(controller);}};
    }catch(error){clearTimeout(timer);this.controllers.delete(controller);if(error?.name==='AbortError')throw new Error(controller.__manualCancel?'Request cancelled':'Ollama response timed out');throw error;}
  }
  body(messages,tools=[],stream=false){
    const body={model:this.model,messages,stream,keep_alive:this.keepAlive,think:this.think,options:{temperature:this.temperature,top_p:0.9,repeat_penalty:1.06,num_ctx:this.numCtx,num_predict:this.numPredict}};
    if(tools?.length)body.tools=tools;
    return body;
  }
  async chat(messages,tools=[]){
    const r=await this.request('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(this.body(messages,tools,false))});
    const data=await r.json();
    if(data?.message?.content===''&&data?.message?.thinking)throw new Error('Local model produced reasoning without a final answer');
    return data;
  }
  async chatStream(messages,tools=[],onDelta=()=>{}){
    if(tools?.length)return this.chat(messages,tools);
    const pending=await this.streamRequest('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(this.body(messages,[],true))});
    let parsed;try{parsed=await readNdjson(pending.response,onDelta);}finally{pending.release();}
    if(!parsed.text&&parsed.done?.message?.thinking)throw new Error('Local model produced reasoning without a final answer');
    return {message:{role:'assistant',content:parsed.text},done:parsed.done};
  }
  async health(){try{const r=await this.request('/api/tags');return r.ok;}catch{return false;}}
  async models(){try{const r=await this.request('/api/tags');const j=await r.json();return (j.models||[]).map(x=>x.name).filter(Boolean);}catch{return [];}}
  async hasModel(name=this.model){const list=await this.models();return list.some(x=>x===name||x.startsWith(name+':')||name.startsWith(x+':'));}
}
