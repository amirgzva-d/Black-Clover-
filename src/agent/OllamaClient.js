export class OllamaClient {
  constructor({baseUrl='http://127.0.0.1:11434',model='qwen3:4b'}={}){this.baseUrl=baseUrl;this.model=model;}
  async chat(messages, tools=[]){
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),120000);
    try{
      const r=await fetch(`${this.baseUrl}/api/chat`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:this.model,messages,tools,stream:false,options:{temperature:0.2}}),signal:controller.signal});
      if(!r.ok) throw new Error(`Ollama HTTP ${r.status}`);
      return await r.json();
    } finally {clearTimeout(timer);}
  }
  async health(){try{const r=await fetch(`${this.baseUrl}/api/tags`);return r.ok;}catch{return false;}}
}
