const normalizeBaseUrl=value=>{
  let url=String(value||'http://127.0.0.1:11434').trim();
  if(!/^https?:\/\//i.test(url))url='http://'+url;
  return url.replace(/\/+$/,'').replace(/\/(api|v1)$/i,'');
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
  }
  async request(path,options={}){
    const controller=new AbortController();
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
      if(error?.name==='AbortError')throw new Error('Ollama response timed out');
      throw error;
    }finally{
      clearTimeout(timer);
    }
  }
  async chat(messages,tools=[]){
    const body={model:this.model,messages,stream:false,keep_alive:this.keepAlive,think:this.think,options:{temperature:this.temperature,top_p:0.9,repeat_penalty:1.06,num_ctx:this.numCtx,num_predict:this.numPredict}};
    if(tools?.length)body.tools=tools;
    const r=await this.request('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    const data=await r.json();
    if(data?.message?.content===''&&data?.message?.thinking)throw new Error('Local model produced reasoning without a final answer');
    return data;
  }
  async health(){try{const r=await this.request('/api/tags');return r.ok;}catch{return false;}}
  async models(){try{const r=await this.request('/api/tags');const j=await r.json();return (j.models||[]).map(x=>x.name).filter(Boolean);}catch{return [];}}
  async hasModel(name=this.model){const list=await this.models();return list.some(x=>x===name||x.startsWith(name+':')||name.startsWith(x+':'));}
}
