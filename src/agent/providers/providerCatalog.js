const truthy=v=>/^(1|true|yes|on)$/i.test(String(v||''));

export const FREE_PROVIDER_IDS=Object.freeze(['groq','gemini','openrouter']);

export function providerCatalogFromEnv(env=process.env){
  return [
    {
      id:'groq',label:'Groq • GPT-OSS 120B',kind:'openai-compatible',
      apiKey:env.GROQ_API_KEY||'',baseUrl:env.GROQ_BASE_URL||'https://api.groq.com/openai/v1',
      model:env.GROQ_MODEL||'openai/gpt-oss-120b',costClass:'free-tier',
      capabilities:{chat:true,tools:true,reasoning:true,streaming:true}
    },
    {
      id:'gemini',label:'Google Gemini 3.8 Flash',kind:'openai-compatible',
      apiKey:env.GEMINI_API_KEY||env.GOOGLE_API_KEY||'',baseUrl:env.GEMINI_BASE_URL||'https://generativelanguage.googleapis.com/v1beta/openai',
      model:env.GEMINI_MODEL||'gemini-3.8-flash',costClass:'free-tier',
      capabilities:{chat:true,tools:true,reasoning:true,streaming:true,multimodal:true}
    },
    {
      id:'openrouter',label:'OpenRouter • Free Router',kind:'openai-compatible',
      apiKey:env.OPENROUTER_API_KEY||'',baseUrl:env.OPENROUTER_BASE_URL||'https://openrouter.ai/api/v1',
      model:env.OPENROUTER_MODEL||'openrouter/free',costClass:'free-tier',
      capabilities:{chat:true,tools:true,streaming:true}
    },
    {
      id:'qwen',label:'Qwen Cloud',kind:'openai-compatible',
      apiKey:env.DASHSCOPE_API_KEY||env.QWEN_API_KEY||'',baseUrl:env.QWEN_BASE_URL||'',
      model:env.QWEN_MODEL||'qwen-plus',costClass:'paid-or-provider-tier',
      capabilities:{chat:true,tools:true,streaming:true}
    },
    {
      id:'deepseek',label:'DeepSeek',kind:'openai-compatible',
      apiKey:env.DEEPSEEK_API_KEY||'',baseUrl:env.DEEPSEEK_BASE_URL||'https://api.deepseek.com',
      model:env.DEEPSEEK_MODEL||'deepseek-chat',costClass:'paid',
      capabilities:{chat:true,tools:true,streaming:true}
    },
    {
      id:'openai',label:'OpenAI',kind:'openai-compatible',
      apiKey:env.OPENAI_API_KEY||'',baseUrl:env.OPENAI_BASE_URL||'https://api.openai.com/v1',
      model:env.OPENAI_MODEL||'',costClass:'paid',
      capabilities:{chat:true,tools:true,reasoning:true,streaming:true,responsesRecommended:true}
    },
    {
      id:'anthropic',label:'Claude',kind:'anthropic',
      apiKey:env.ANTHROPIC_API_KEY||'',baseUrl:env.ANTHROPIC_BASE_URL||'https://api.anthropic.com',
      model:env.ANTHROPIC_MODEL||'',costClass:'paid',
      capabilities:{chat:true,tools:true,reasoning:true,streaming:true}
    },
    {
      id:'generic',label:'OpenAI-compatible',kind:'openai-compatible',
      apiKey:env.BLACK_CLOVER_ONLINE_API_KEY||'',baseUrl:env.BLACK_CLOVER_ONLINE_BASE_URL||'',
      model:env.BLACK_CLOVER_ONLINE_MODEL||'',costClass:'unknown',
      capabilities:{chat:true,tools:true}
    }
  ];
}

export function onlineProviderPolicy(env=process.env){
  return {
    freeOnly:truthy(env.BLACK_CLOVER_FREE_ONLY),
    preferredGeneral:String(env.BLACK_CLOVER_GENERAL_PROVIDER||'groq').toLowerCase(),
    preferredResearch:String(env.BLACK_CLOVER_RESEARCH_PROVIDER||'gemini').toLowerCase(),
    preferredCoding:String(env.BLACK_CLOVER_CODING_PROVIDER||'groq').toLowerCase()
  };
}

export function usableProviderConfigs(env=process.env){
  const policy=onlineProviderPolicy(env);
  return providerCatalogFromEnv(env).filter(p=>p.apiKey&&p.baseUrl&&p.model&&(!policy.freeOnly||FREE_PROVIDER_IDS.includes(p.id)));
}
