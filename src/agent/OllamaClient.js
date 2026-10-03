export class OllamaClient {
  constructor({baseUrl=process.env.OLLAMA_URL||'http://127.0.0.1:11434',model=process.env.BLACK_CLOVER_MODEL||'qwen3:4b',timeoutMs=120000}={}){this.baseUrl=baseUrl.replace(/\/$/,'');this.model=model;this.timeoutMs=timeoutMs;}
  async request(path,options={}){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),this.timeoutMs);
    try{const r=await fetch(`${this.baseUrl}${path}`,{...options,signal:controller.signal});if(!r.ok)throw new Error(`Ollama HTTP ${r.status}`);return r;}catch(e){if(e?.name==='AbortError')throw new Error('Ollama response timed out');throw e;}finally{clearTimeout(timer);}
  }
  async chat(messages,tools=[]){
    const body={model:this.model,messages,stream:false,keep_alive:'10m',options:{temperature:0.45,top_p:0.9,repeat_penalty:1.08,num_ctx:4096}};
    if(tools?.length)body.tools=tools;
    const r=await this.request('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    return r.json();
  }
  async health(){try{const r=await this.request('/api/tags');return r.ok;}catch{return false;}}
  async models(){try{const r=await this.request('/api/tags');const j=await r.json();return (j.models||[]).map(x=>x.name).filter(Boolean);}catch{return [];}}
}
