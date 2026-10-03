const timeoutFetch=async(url,options={},timeoutMs=90000)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{return await fetch(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);}};

export class OnlineBrainClient{
  constructor({provider,apiKey,baseUrl,model}={}){
    this.provider=provider;
    this.apiKey=apiKey;
    this.baseUrl=String(baseUrl||'').replace(/\/$/,'');
    this.model=model;
  }
  get configured(){return Boolean(this.provider&&this.apiKey&&this.baseUrl&&this.model);}
  async chat(messages,tools=[]){
    if(!this.configured)throw new Error('Online brain is not configured');
    const body={model:this.model,messages,stream:false,temperature:.5,top_p:.9};
    if(tools?.length){body.tools=tools;body.tool_choice='auto';}
    if(this.provider==='deepseek'){body.thinking={type:'enabled'};body.reasoning_effort='high';}
    const r=await timeoutFetch(`${this.baseUrl}/chat/completions`,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${this.apiKey}`},body:JSON.stringify(body)});
    if(!r.ok){const t=(await r.text()).slice(0,800);throw new Error(`${this.provider} HTTP ${r.status}: ${t}`);}
    const data=await r.json(),message=data?.choices?.[0]?.message;if(!message)throw new Error(`${this.provider} returned no message`);return {message,usage:data.usage,provider:this.provider,model:this.model};
  }
  async health(){if(!this.configured)return false;try{const r=await timeoutFetch(`${this.baseUrl}/models`,{headers:{authorization:`Bearer ${this.apiKey}`}},8000);return r.ok;}catch{return false;}}
}

export function onlineBrainFromEnv(){
  const qwenKey=process.env.DASHSCOPE_API_KEY||process.env.QWEN_API_KEY;
  const qwenBase=process.env.QWEN_BASE_URL;
  if(qwenKey&&qwenBase)return new OnlineBrainClient({provider:'qwen',apiKey:qwenKey,baseUrl:qwenBase,model:process.env.QWEN_MODEL||'qwen-plus'});
  const deepKey=process.env.DEEPSEEK_API_KEY;
  if(deepKey)return new OnlineBrainClient({provider:'deepseek',apiKey:deepKey,baseUrl:process.env.DEEPSEEK_BASE_URL||'https://api.deepseek.com',model:process.env.DEEPSEEK_MODEL||'deepseek-flash'});
  return null;
}
