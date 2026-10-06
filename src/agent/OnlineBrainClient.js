const timeoutFetch=async(url,options={},timeoutMs=90000)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{return await fetch(url,{...options,signal:controller.signal});}finally{clearTimeout(timer);}};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const RETRYABLE_STATUS=new Set([408,409,425,429,500,502,503,504]);
const retryAfterMs=response=>{const raw=response?.headers?.get?.('retry-after');if(!raw)return null;const seconds=Number(raw);if(Number.isFinite(seconds))return Math.max(0,seconds*1000);const at=Date.parse(raw);return Number.isFinite(at)?Math.max(0,at-Date.now()):null;};

export class OnlineBrainClient{
  constructor({provider,apiKey,baseUrl,model,timeoutMs=90000,maxRetries=2,retryBaseMs=450}={}){
    this.provider=provider;this.apiKey=apiKey;this.baseUrl=String(baseUrl||'').replace(/\/$/,'');this.model=model;this.timeoutMs=timeoutMs;this.maxRetries=Math.max(0,Number(maxRetries)||0);this.retryBaseMs=Math.max(1,Number(retryBaseMs)||450);
  }
  get configured(){return Boolean(this.provider&&this.apiKey&&this.baseUrl&&this.model);}
  withModel(model){return new OnlineBrainClient({provider:this.provider,apiKey:this.apiKey,baseUrl:this.baseUrl,model:model||this.model,timeoutMs:this.timeoutMs,maxRetries:this.maxRetries,retryBaseMs:this.retryBaseMs});}
  async chat(messages,tools=[]){
    if(!this.configured)throw new Error('Online brain is not configured');
    const body={model:this.model,messages,stream:false,temperature:.5,top_p:.9};if(tools?.length){body.tools=tools;body.tool_choice='auto';}
    let lastError=null;
    for(let attempt=0;attempt<=this.maxRetries;attempt++){
      try{
        const r=await timeoutFetch(`${this.baseUrl}/chat/completions`,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${this.apiKey}`},body:JSON.stringify(body)},this.timeoutMs);
        if(!r.ok){
          const t=(await r.text()).slice(0,900),error=new Error(`${this.provider} HTTP ${r.status}: ${t}`);error.status=r.status;lastError=error;
          if(attempt<this.maxRetries&&RETRYABLE_STATUS.has(r.status)){await sleep(retryAfterMs(r)??Math.min(5000,this.retryBaseMs*(2**attempt)));continue;}
          throw error;
        }
        const data=await r.json(),message=data?.choices?.[0]?.message;if(!message)throw new Error(`${this.provider} returned no message`);
        return {message,usage:data.usage,provider:this.provider,model:this.model};
      }catch(error){
        lastError=error;
        const status=Number(error?.status)||0,networkLike=!status&&(error?.name==='AbortError'||error instanceof TypeError||/fetch|network|timeout|abort/i.test(String(error?.message||'')));
        if(attempt<this.maxRetries&&(networkLike||RETRYABLE_STATUS.has(status))){await sleep(Math.min(5000,this.retryBaseMs*(2**attempt)));continue;}
        throw error;
      }
    }
    throw lastError||new Error(`${this.provider} request failed`);
  }
  async health(){if(!this.configured)return false;try{const r=await timeoutFetch(`${this.baseUrl}/models`,{headers:{authorization:`Bearer ${this.apiKey}`}},8000);return r.ok;}catch{return false;}}
}

export function onlineBrainFromEnv(){
  const groqKey=process.env.GROQ_API_KEY;
  if(groqKey)return new OnlineBrainClient({provider:'groq',apiKey:groqKey,baseUrl:process.env.GROQ_BASE_URL||'https://api.groq.com/openai/v1',model:process.env.GROQ_MODEL||'openai/gpt-oss-120b'});
  const geminiKey=process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY;
  if(geminiKey)return new OnlineBrainClient({provider:'gemini',apiKey:geminiKey,baseUrl:process.env.GEMINI_BASE_URL||'https://generativelanguage.googleapis.com/v1beta/openai',model:process.env.GEMINI_MODEL||'gemini-3.8-flash'});
  const qwenKey=process.env.DASHSCOPE_API_KEY||process.env.QWEN_API_KEY,qwenBase=process.env.QWEN_BASE_URL;
  if(qwenKey&&qwenBase)return new OnlineBrainClient({provider:'qwen',apiKey:qwenKey,baseUrl:qwenBase,model:process.env.QWEN_MODEL||'qwen-plus'});
  const deepKey=process.env.DEEPSEEK_API_KEY;
  if(deepKey)return new OnlineBrainClient({provider:'deepseek',apiKey:deepKey,baseUrl:process.env.DEEPSEEK_BASE_URL||'https://api.deepseek.com',model:process.env.DEEPSEEK_MODEL||'deepseek-chat'});
  const genericKey=process.env.BLACK_CLOVER_ONLINE_API_KEY,genericBase=process.env.BLACK_CLOVER_ONLINE_BASE_URL,genericModel=process.env.BLACK_CLOVER_ONLINE_MODEL;
  if(genericKey&&genericBase&&genericModel)return new OnlineBrainClient({provider:'openai-compatible',apiKey:genericKey,baseUrl:genericBase,model:genericModel});
  return null;
}
